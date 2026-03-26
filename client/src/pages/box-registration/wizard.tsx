import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CameraCapture } from "@/components/camera-capture";
import { QrScanner } from "@/components/qr-scanner";
import { useLocationByQr, useOrders, useLocations } from "@/hooks/use-warehouse";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Loader2, QrCode, Mic, MicOff, X, Package } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

enum Step {
  ORDER_SELECT = 0,
  PRODUCT_PHOTOS = 1,
  BOX_DETAILS = 2,
  LOCATION_SELECT = 3,
  REVIEW = 4
}

const STEP_TITLES = [
  "Определение заказа",
  "Фото товара",
  "Данные коробок",
  "Место хранения",
  "Итог"
];

export default function BoxRegistrationWizard() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.ORDER_SELECT);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: orders } = useOrders({ status: 'active' });
  const { data: locations } = useLocations();
  const { t } = useLanguage();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);

  const [formData, setFormData] = useState({
    orderId: "",
    manualOrderNumber: "",
    boxCount: "1",
    description: "",
    productPhotos: [] as string[],
    stickerPhoto: "",
    locationId: undefined as number | undefined,
    locationUuid: "",
  });

  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const initSpeech = () => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR && !recognition) {
        try {
          const rec = new SR();
          rec.continuous = false;
          rec.interimResults = false;
          setRecognition(rec);
        } catch (e) {
          console.error("Speech init failed:", e);
        }
      }
    };
    initSpeech();
    window.addEventListener('touchstart', initSpeech, { once: true });
    window.addEventListener('click', initSpeech, { once: true });
    return () => {
      window.removeEventListener('touchstart', initSpeech);
      window.removeEventListener('click', initSpeech);
    };
  }, [recognition]);

  useEffect(() => {
    if (recognition) {
      recognition.lang = "ru-RU";
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        handleSpeechResult(transcript);
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        toast({
          title: "Ошибка микрофона",
          description: `Код ошибки: ${event.error}`,
          variant: "destructive"
        });
      };
      recognition.onend = () => setIsListening(false);
    }
  }, [recognition]);

  const handleSpeechResult = useCallback((transcript: string) => {
    if (currentStep === Step.ORDER_SELECT) {
      const cleanTranscript = transcript.trim().toUpperCase();
      const found = orders?.find(o =>
        o.number.toUpperCase() === cleanTranscript ||
        o.number.toUpperCase().includes(cleanTranscript)
      );
      if (found) {
        updateField("orderId", found.id.toString());
        updateField("manualOrderNumber", found.number);
      } else {
        updateField("manualOrderNumber", transcript.toUpperCase());
        updateField("orderId", "");
      }
    }
    toast({ title: "Распознано", description: transcript });
  }, [currentStep, orders]);

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      if (!recognition) {
        toast({
          title: "Голосовой ввод недоступен",
          description: "Откройте приложение в отдельной вкладке браузера",
          variant: "destructive"
        });
        return;
      }
      recognition?.start();
      setIsListening(true);
    }
  };

  const { data: scannedLocation } = useLocationByQr(formData.locationUuid || null);

  const selectedLocation = formData.locationId
    ? locations?.find(l => l.id === formData.locationId)
    : scannedLocation;

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, Step.REVIEW));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, Step.ORDER_SELECT));

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleScanOrder = (data: string) => {
    const found = orders?.find(o => o.number === data);
    if (found) {
      updateField("orderId", found.id.toString());
    } else {
      toast({ title: "Заказ не найден", description: "QR-код не соответствует ни одному заказу", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    const count = Math.max(1, parseInt(formData.boxCount) || 1);
    setIsSubmitting(true);
    try {
      for (let i = 0; i < count; i++) {
        const payload = {
          orderId: formData.orderId ? parseInt(formData.orderId) : null,
          manualOrderNumber: formData.orderId ? null : (formData.manualOrderNumber || null),
          numberInOrder: String(i + 1),
          quantity: 0,
          description: formData.description || null,
          locationType: "permanent" as const,
          locationId: selectedLocation?.id || null,
          tempLocationDesc: null,
          tempLocationPhoto: null,
          status: 'in_stock' as const,
          productPhotos: formData.productPhotos,
          stickerPhoto: formData.stickerPhoto || null,
          problemType: null,
          problemDesc: null,
          createdBy: 1,
          shippedBy: null
        };
        await apiRequest('POST', '/api/boxes', payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/boxes'] });
      setRegisteredCount(count);
      nextStep();
    } catch (error: any) {
      toast({ title: "Ошибка сохранения", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case Step.ORDER_SELECT:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <QrCode className="w-5 h-5" /> Сканировать QR заказа
                </h3>
                <QrScanner onScan={handleScanOrder} label="Навести камеру на QR-код" />
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">Ручной ввод</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Выбрать существующий заказ</Label>
                    <Select
                      value={formData.orderId}
                      onValueChange={(val) => {
                        updateField("orderId", val);
                        const found = orders?.find(o => o.id.toString() === val);
                        updateField("manualOrderNumber", found ? found.number : "");
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Выберите заказ..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border shadow-md">
                        {orders?.map((o) => (
                          <SelectItem key={o.id} value={o.id.toString()}>
                            {o.number} — {o.customer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">или</span></div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex justify-between items-center h-10">
                      <span className="text-sm font-semibold">Ввести номер вручную</span>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        className={cn(
                          "h-8 px-2 gap-1 transition-all",
                          isListening ? "border-red-500 text-red-500 animate-pulse bg-red-50" : "text-muted-foreground hover:text-primary"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleListening();
                        }}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        <span className="text-[10px] uppercase font-bold">{isListening ? "Стоп" : "Голос"}</span>
                      </Button>
                    </Label>
                    <Input
                      placeholder="напр. ORD-1234"
                      className="h-12 text-lg font-medium"
                      value={formData.manualOrderNumber}
                      onChange={(e) => {
                        updateField("manualOrderNumber", e.target.value);
                        updateField("orderId", "");
                      }}
                    />
                  </div>
                </div>

                {(formData.orderId || formData.manualOrderNumber) && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4" /> Заказ определён
                  </div>
                )}
              </Card>
            </div>
          </div>
        );

      case Step.PRODUCT_PHOTOS:
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Фото необязательны — можно пропустить этот шаг.</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Сфотографировать содержимое</h3>
                <CameraCapture
                  onCapture={(src) => updateField("productPhotos", [...formData.productPhotos, src])}
                  label="Добавить фото"
                />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Фото ({formData.productPhotos.length})</h3>
                <div className="grid grid-cols-2 gap-2">
                  {formData.productPhotos.map((src, idx) => (
                    <div key={idx} className="relative aspect-video bg-black/10 rounded-lg overflow-hidden group">
                      <img src={src} className="w-full h-full object-cover" />
                      <button
                        onClick={() => updateField("productPhotos", formData.productPhotos.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {formData.productPhotos.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                      Фото не добавлены
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case Step.BOX_DETAILS:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Коробок</Label>
                  <p className="text-xs text-muted-foreground">Сколько коробок регистрировать за этот раз</p>
                  <Input
                    type="number"
                    min="1"
                    max="999"
                    value={formData.boxCount}
                    onChange={(e) => updateField("boxCount", e.target.value)}
                    placeholder="1"
                    className="h-14 text-2xl font-bold text-center"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Описание <span className="text-muted-foreground font-normal text-sm">(необязательно)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">Что находится в коробке</p>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="напр. листовки формата А4, 500 шт"
                    className="min-h-[100px] text-base resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Фото этикетки <span className="text-muted-foreground font-normal text-sm">(необязательно)</span>
                  </Label>
                  <CameraCapture
                    onCapture={(src) => updateField("stickerPhoto", src)}
                    label="Сфотографировать этикетку"
                  />
                  {formData.stickerPhoto && (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden mt-2">
                      <img src={formData.stickerPhoto} className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {parseInt(formData.boxCount) > 1 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-200 text-sm">
                <Package className="w-4 h-4 inline mr-2" />
                Будет зарегистрировано <strong>{formData.boxCount} коробки</strong> с одинаковыми фото и описанием
              </div>
            )}
          </div>
        );

      case Step.LOCATION_SELECT:
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Сканировать QR стеллажа</h3>
              <QrScanner
                onScan={(data) => {
                  updateField("locationUuid", data);
                  updateField("locationId", undefined);
                }}
                label="Сканировать QR полки"
              />

              <div className="my-6 relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">или выбрать из списка</span></div>
              </div>

              <div className="space-y-2">
                <Label>Выбрать местоположение</Label>
                <Select
                  value={formData.locationId?.toString()}
                  onValueChange={(val) => {
                    updateField("locationId", parseInt(val));
                    updateField("locationUuid", "");
                  }}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Выберите местоположение..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((l) => (
                      <SelectItem key={l.id} value={l.id.toString()}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLocation && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Местоположение выбрано:</p>
                  <p className="text-lg">{selectedLocation.name}</p>
                </div>
              )}
            </Card>
          </div>
        );

      case Step.REVIEW:
        return (
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Check className="w-6 h-6" />
                <span className="font-bold text-xl uppercase tracking-tight">Успешно сохранено</span>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{registeredCount}</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {registeredCount === 1 ? "коробка зарегистрирована" : registeredCount < 5 ? "коробки зарегистрированы" : "коробок зарегистрировано"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Заказ:</span>
                  <p className="font-semibold">
                    {formData.orderId
                      ? orders?.find(o => o.id.toString() === formData.orderId)?.number
                      : formData.manualOrderNumber || "Ручной ввод"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Местоположение:</span>
                  <p className="font-semibold">{selectedLocation?.name || "—"}</p>
                </div>
                {formData.description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Описание:</span>
                    <p className="font-semibold">{formData.description}</p>
                  </div>
                )}
              </div>

              {(formData.productPhotos.length > 0 || formData.stickerPhoto) && (
                <div className="space-y-2">
                  <span className="text-muted-foreground text-sm">Фото:</span>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {formData.productPhotos.map((src, i) => (
                      <img key={i} src={src} className="h-20 w-auto rounded-lg border" />
                    ))}
                    {formData.stickerPhoto && <img src={formData.stickerPhoto} className="h-20 w-auto rounded-lg border" />}
                  </div>
                </div>
              )}
            </Card>
          </div>
        );
    }
  };

  const canAdvance = () => {
    switch (currentStep) {
      case Step.ORDER_SELECT: return !!formData.orderId || !!formData.manualOrderNumber;
      case Step.PRODUCT_PHOTOS: return true;
      case Step.BOX_DETAILS: return parseInt(formData.boxCount) >= 1;
      case Step.LOCATION_SELECT: return !!selectedLocation;
      default: return true;
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEP_TITLES.map((title, i) => (
            <div
              key={i}
              className={`text-xs font-semibold uppercase tracking-wider ${i <= currentStep ? 'text-primary' : 'text-muted-foreground/30'}`}
            >
              Шаг {i + 1}
            </div>
          ))}
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / STEP_TITLES.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <h2 className="text-2xl font-bold mt-4">{STEP_TITLES[currentStep]}</h2>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 lg:left-72 right-0 p-4 bg-background/80 backdrop-blur border-t flex justify-between items-center z-40">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={currentStep === 0 || currentStep === Step.REVIEW}
        >
          Назад
        </Button>

        {currentStep === Step.LOCATION_SELECT ? (
          <Button
            size="lg"
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 w-48"
            disabled={!canAdvance() || isSubmitting}
          >
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
            {isSubmitting ? "Сохранение..." : "Сохранить"}
          </Button>
        ) : currentStep === Step.REVIEW ? (
          <Button size="lg" onClick={() => setLocation("/")} className="w-40">
            Готово
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={nextStep}
            disabled={!canAdvance()}
            className="w-32"
          >
            Далее <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
