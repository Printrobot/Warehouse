import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CameraCapture } from "@/components/camera-capture";
import { QrScanner } from "@/components/qr-scanner";
import { useLocationByQr, useOrders, useLocations, useBoxes } from "@/hooks/use-warehouse";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, ChevronRight, Loader2, QrCode, Mic, MicOff, X, Package,
  ArrowRight, MapPin, PlusCircle, Layers, Search, Building2
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Order } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardMode = "new" | "add_same" | "add_new_type";

interface SpeechRecognitionErrorEvent extends Event { error: string }
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

enum Step {
  ORDER_SELECT  = 0,
  PHOTOS        = 1,
  BOX_DETAILS   = 2,
  LOCATION_SELECT = 3,
  REVIEW        = 4,
}

const STEP_TITLES = [
  "Определение заказа",
  "Фото",
  "Данные коробок",
  "Место хранения",
  "Итог",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoxRegistrationWizard() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.ORDER_SELECT);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: orders } = useOrders({ status: "active" });
  const { data: locations } = useLocations();
  const { data: allBoxes } = useBoxes();
  const { t } = useLanguage();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);

  // ── Wizard mode ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<WizardMode>("new");

  // ── Step 1 sub-UI: "new" tab vs "existing" tab
  const [orderTab, setOrderTab] = useState<"new" | "existing">("new");
  const [existingOrderSearch, setExistingOrderSearch] = useState("");
  const [existingOrderId, setExistingOrderId] = useState<string>("");

  const existingOrder: Order | undefined = useMemo(
    () => orders?.find((o) => o.id.toString() === existingOrderId),
    [orders, existingOrderId]
  );

  const existingBoxes = useMemo(
    () =>
      existingOrder && allBoxes
        ? allBoxes.filter(
            (b) => b.orderId === existingOrder.id && b.status === "in_stock"
          )
        : [],
    [existingOrder, allBoxes]
  );

  const firstBoxDesc = existingBoxes[0]?.description ?? "";
  const firstBoxLocId = existingBoxes[0]?.locationId ?? null;

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const q = existingOrderSearch.toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.number.toLowerCase().includes(q) ||
        (o.customer ?? "").toLowerCase().includes(q)
    );
  }, [orders, existingOrderSearch]);

  // ── Form data ─────────────────────────────────────────────────────────────
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

  const updateField = (field: string, value: unknown) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // ── Speech recognition ────────────────────────────────────────────────────
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
    window.addEventListener("touchstart", initSpeech, { once: true });
    window.addEventListener("click", initSpeech, { once: true });
    return () => {
      window.removeEventListener("touchstart", initSpeech);
      window.removeEventListener("click", initSpeech);
    };
  }, [recognition]);

  useEffect(() => {
    if (!recognition) return;
    recognition.lang = "ru-RU";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      handleSpeechResult(transcript);
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      toast({ title: "Ошибка микрофона", description: `Код: ${event.error}`, variant: "destructive" });
    };
    recognition.onend = () => setIsListening(false);
  }, [recognition]);

  const handleSpeechResult = useCallback(
    (transcript: string) => {
      if (currentStep === Step.ORDER_SELECT) {
        const clean = transcript.trim().toUpperCase();
        const found = orders?.find(
          (o) =>
            o.number.toUpperCase() === clean ||
            o.number.toUpperCase().includes(clean)
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
    },
    [currentStep, orders]
  );

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      if (!recognition) {
        toast({
          title: "Голосовой ввод недоступен",
          description: "Откройте приложение в отдельной вкладке",
          variant: "destructive",
        });
        return;
      }
      recognition.start();
      setIsListening(true);
    }
  };

  // ── Location resolution ───────────────────────────────────────────────────
  const { data: scannedLocation } = useLocationByQr(formData.locationUuid || null);
  const selectedLocation = formData.locationId
    ? locations?.find((l) => l.id === formData.locationId)
    : scannedLocation;

  const existingLocation = firstBoxLocId
    ? locations?.find((l) => l.id === firstBoxLocId)
    : undefined;

  // ── Navigation ────────────────────────────────────────────────────────────
  const nextStep = () =>
    setCurrentStep((prev) => Math.min(prev + 1, Step.REVIEW) as Step);
  const prevStep = () =>
    setCurrentStep((prev) => Math.max(prev - 1, Step.ORDER_SELECT) as Step);

  // ── QR scan for new-order mode ────────────────────────────────────────────
  const handleScanOrder = (data: string) => {
    const found = orders?.find((o) => o.number === data);
    if (found) {
      updateField("orderId", found.id.toString());
      updateField("manualOrderNumber", found.number);
    } else {
      toast({ title: "Заказ не найден", description: "QR не соответствует ни одному заказу", variant: "destructive" });
    }
  };

  // ── "Add to existing" actions ─────────────────────────────────────────────
  const handleAddSame = () => {
    if (!existingOrder) return;
    setMode("add_same");
    updateField("orderId", existingOrder.id.toString());
    updateField("manualOrderNumber", "");
    updateField("description", firstBoxDesc);
    // Pre-fill location from existing boxes
    if (firstBoxLocId) {
      updateField("locationId", firstBoxLocId);
      updateField("locationUuid", "");
    }
    nextStep();
  };

  const handleAddNewType = () => {
    if (!existingOrder) return;
    // compute next /N suffix
    const base = existingOrder.number;
    const siblings = (orders || []).filter((o) =>
      o.number.startsWith(`${base}/`)
    );
    const newNumber = `${base}/${siblings.length + 1}`;
    setMode("add_new_type");
    updateField("orderId", "");
    updateField("manualOrderNumber", newNumber);
    updateField("description", "");
    updateField("locationId", undefined);
    updateField("locationUuid", "");
    nextStep();
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const count = Math.max(1, parseInt(formData.boxCount) || 1);
    setIsSubmitting(true);
    try {
      for (let i = 0; i < count; i++) {
        const payload = {
          orderId: formData.orderId ? parseInt(formData.orderId) : null,
          manualOrderNumber: formData.orderId
            ? null
            : formData.manualOrderNumber || null,
          numberInOrder: String(i + 1),
          quantity: 0,
          description: formData.description || null,
          locationType: "permanent" as const,
          locationId: selectedLocation?.id || null,
          tempLocationDesc: null,
          tempLocationPhoto: null,
          status: "in_stock" as const,
          productPhotos: formData.productPhotos,
          stickerPhoto: formData.stickerPhoto || null,
          problemType: null,
          problemDesc: null,
          createdBy: 1,
          shippedBy: null,
        };
        await apiRequest("POST", "/api/boxes", payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/boxes"] });
      setRegisteredCount(count);
      nextStep();
    } catch (error: any) {
      toast({ title: "Ошибка сохранения", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── canAdvance ────────────────────────────────────────────────────────────
  const canAdvance = () => {
    switch (currentStep) {
      case Step.ORDER_SELECT:
        return !!formData.orderId || !!formData.manualOrderNumber;
      case Step.PHOTOS:
        return true;
      case Step.BOX_DETAILS:
        return parseInt(formData.boxCount) >= 1;
      case Step.LOCATION_SELECT:
        return !!selectedLocation;
      default:
        return true;
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STEP RENDERERS
  // ════════════════════════════════════════════════════════════════════════════

  // ── Step 1: ORDER_SELECT ──────────────────────────────────────────────────
  const renderOrderSelect = () => (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex rounded-xl border overflow-hidden">
        <button
          className={cn(
            "flex-1 py-3 text-sm font-semibold transition-colors",
            orderTab === "new"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted/50"
          )}
          onClick={() => setOrderTab("new")}
          data-testid="tab-new-order"
        >
          Новый заказ
        </button>
        <button
          className={cn(
            "flex-1 py-3 text-sm font-semibold transition-colors",
            orderTab === "existing"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted/50"
          )}
          onClick={() => setOrderTab("existing")}
          data-testid="tab-existing-order"
        >
          Добавить в существующий
        </button>
      </div>

      {/* ── NEW ORDER ── */}
      {orderTab === "new" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5" /> Сканировать QR заказа
            </h3>
            <QrScanner onScan={handleScanOrder} label="Навести камеру на QR-код" />
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Ввод вручную</h3>

            <div className="space-y-2">
              <Label>Выбрать заказ из списка</Label>
              <Select
                value={formData.orderId}
                onValueChange={(val) => {
                  updateField("orderId", val);
                  const found = orders?.find((o) => o.id.toString() === val);
                  updateField("manualOrderNumber", found ? found.number : "");
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Выберите заказ..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border shadow-md">
                  {orders?.map((o) => (
                    <SelectItem key={o.id} value={o.id.toString()}>
                      {o.number}{o.customer ? ` — ${o.customer}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">или</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex justify-between items-center h-10">
                <span className="text-sm font-semibold">Номер вручную</span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className={cn(
                    "h-8 px-2 gap-1 transition-all",
                    isListening
                      ? "border-red-500 text-red-500 animate-pulse bg-red-50"
                      : "text-muted-foreground hover:text-primary"
                  )}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleListening(); }}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span className="text-[10px] uppercase font-bold">
                    {isListening ? "Стоп" : "Голос"}
                  </span>
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
                data-testid="input-manual-order"
              />
            </div>

            {(formData.orderId || formData.manualOrderNumber) && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4" /> Заказ определён
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── EXISTING ORDER ── */}
      {orderTab === "existing" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Поиск по номеру или клиенту..."
              className="pl-10 h-12"
              value={existingOrderSearch}
              onChange={(e) => setExistingOrderSearch(e.target.value)}
              data-testid="input-existing-search"
            />
          </div>

          {/* Order list */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Заказы не найдены</p>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = existingOrderId === order.id.toString();
                const inStockCount = allBoxes?.filter(
                  (b) => b.orderId === order.id && b.status === "in_stock"
                ).length ?? 0;
                return (
                  <button
                    key={order.id}
                    data-testid={`existing-order-${order.id}`}
                    className={cn(
                      "w-full text-left rounded-xl border-2 px-4 py-3 transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    )}
                    onClick={() => setExistingOrderId(order.id.toString())}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold">№{order.number}</span>
                        {order.customer && (
                          <span className="ml-2 text-muted-foreground text-sm">{order.customer}</span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {inStockCount} коробок
                      </Badge>
                    </div>
                    {order.createdAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Selected order card */}
          {existingOrder && (
            <Card className="border-primary/30 bg-primary/5">
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span className="font-bold text-lg">Заказ №{existingOrder.number}</span>
                  {existingOrder.customer && (
                    <span className="text-muted-foreground">{existingOrder.customer}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Коробок на складе</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {existingBoxes.length}
                    </p>
                  </div>
                  {existingLocation && (
                    <div>
                      <p className="text-muted-foreground text-xs">Текущее место</p>
                      <p className="font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {existingLocation.name}
                      </p>
                    </div>
                  )}
                  {firstBoxDesc && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Описание</p>
                      <p className="font-semibold">{firstBoxDesc}</p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    className="h-14 flex-col gap-1 text-sm"
                    onClick={handleAddSame}
                    data-testid="btn-add-same"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Добавить коробки
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 flex-col gap-1 text-sm"
                    onClick={handleAddNewType}
                    data-testid="btn-add-new-type"
                  >
                    <Layers className="w-5 h-5" />
                    Новый тип<span className="text-xs text-muted-foreground">({existingOrder.number}/…)</span>
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  // ── Step 2: PHOTOS ────────────────────────────────────────────────────────
  const renderPhotos = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Фото необязательны — можно пропустить этот шаг.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Product photos */}
        <div className="space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Package className="w-4 h-4" /> Фото содержимого
          </h3>
          <CameraCapture
            onCapture={(src) =>
              updateField("productPhotos", [...formData.productPhotos, src])
            }
            label="Сфотографировать содержимое"
          />
          {formData.productPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {formData.productPhotos.map((src, idx) => (
                <div
                  key={idx}
                  className="relative aspect-video bg-black/10 rounded-lg overflow-hidden group"
                >
                  <img src={src} className="w-full h-full object-cover" alt="" />
                  <button
                    onClick={() =>
                      updateField(
                        "productPhotos",
                        formData.productPhotos.filter((_, i) => i !== idx)
                      )
                    }
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground border-2 border-dashed rounded-lg text-sm">
              Фото не добавлены
            </div>
          )}
        </div>

        {/* Sticker photo */}
        <div className="space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <QrCode className="w-4 h-4" /> Фото этикетки
          </h3>
          <CameraCapture
            onCapture={(src) => updateField("stickerPhoto", src)}
            label="Сфотографировать этикетку"
          />
          {formData.stickerPhoto ? (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
              <img
                src={formData.stickerPhoto}
                className="w-full h-full object-contain"
                alt=""
              />
              <button
                onClick={() => updateField("stickerPhoto", "")}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground border-2 border-dashed rounded-lg text-sm">
              Фото не добавлено
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Step 3: BOX_DETAILS ───────────────────────────────────────────────────
  const renderBoxDetails = () => (
    <div className="space-y-6">
      {/* Mode badge */}
      {mode !== "new" && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm">
          {mode === "add_same" ? (
            <>
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>
                Добавление в заказ <strong>№{existingOrder?.number}</strong>
              </span>
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 text-blue-600" />
              <span>
                Новый тип — номер заказа:{" "}
                <strong>{formData.manualOrderNumber}</strong>
              </span>
            </>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-semibold">Коробок</Label>
            <p className="text-xs text-muted-foreground">
              Сколько коробок регистрировать за этот раз
            </p>
            <Input
              type="number"
              min="1"
              max="999"
              value={formData.boxCount}
              onChange={(e) => updateField("boxCount", e.target.value)}
              placeholder="1"
              className="h-14 text-2xl font-bold text-center"
              data-testid="input-box-count"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Описание{" "}
              <span className="text-muted-foreground font-normal text-sm">
                (необязательно)
              </span>
            </Label>
            {mode === "add_same" && firstBoxDesc && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Заполнено из заказа
              </p>
            )}
            <Textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="напр. листовки формата А4, 500 шт"
              className="min-h-[100px] text-base resize-none"
              data-testid="input-description"
            />
          </div>
        </div>

        {/* Right: summary of photos already taken */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Фото (добавлены на шаге 2)</Label>
          {formData.productPhotos.length === 0 && !formData.stickerPhoto ? (
            <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg text-sm">
              Фото не добавлены
            </div>
          ) : (
            <div className="space-y-2">
              {formData.productPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {formData.productPhotos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      className="w-full aspect-video object-cover rounded-lg border"
                      alt=""
                    />
                  ))}
                </div>
              )}
              {formData.stickerPhoto && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Этикетка:</p>
                  <img
                    src={formData.stickerPhoto}
                    className="w-full aspect-video object-contain rounded-lg border bg-black"
                    alt=""
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {parseInt(formData.boxCount) > 1 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-200 text-sm">
          <Package className="w-4 h-4 inline mr-2" />
          Будет зарегистрировано <strong>{formData.boxCount} коробки</strong> с
          одинаковыми фото и описанием
        </div>
      )}
    </div>
  );

  // ── Step 4: LOCATION_SELECT ───────────────────────────────────────────────
  const renderLocationSelect = () => (
    <div className="space-y-6">
      {/* Existing location hint for add_same mode */}
      {mode === "add_same" && existingLocation && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            Заказ уже находится:{" "}
            <strong>{existingLocation.name}</strong> — можно оставить или выбрать другое
          </span>
        </div>
      )}

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
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              или выбрать из списка
            </span>
          </div>
        </div>

        <div className="space-y-2">
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
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Местоположение выбрано:
            </p>
            <p className="text-lg">{selectedLocation.name}</p>
          </div>
        )}
      </Card>
    </div>
  );

  // ── Step 5: REVIEW ────────────────────────────────────────────────────────
  const renderReview = () => {
    const orderLabel = formData.orderId
      ? orders?.find((o) => o.id.toString() === formData.orderId)?.number
      : formData.manualOrderNumber || "Ручной ввод";
    return (
      <div className="space-y-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Check className="w-6 h-6" />
            <span className="font-bold text-xl uppercase tracking-tight">
              Успешно сохранено
            </span>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <p className="text-3xl font-bold text-green-700 dark:text-green-300">
              {registeredCount}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              {registeredCount === 1
                ? "коробка зарегистрирована"
                : registeredCount < 5
                ? "коробки зарегистрированы"
                : "коробок зарегистрировано"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Заказ:</span>
              <p className="font-semibold">{orderLabel}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Место:</span>
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
                  <img
                    key={i}
                    src={src}
                    className="h-20 w-auto rounded-lg border"
                    alt=""
                  />
                ))}
                {formData.stickerPhoto && (
                  <img
                    src={formData.stickerPhoto}
                    className="h-20 w-auto rounded-lg border"
                    alt=""
                  />
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  };

  // ── Render step ───────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case Step.ORDER_SELECT:   return renderOrderSelect();
      case Step.PHOTOS:         return renderPhotos();
      case Step.BOX_DETAILS:    return renderBoxDetails();
      case Step.LOCATION_SELECT:return renderLocationSelect();
      case Step.REVIEW:         return renderReview();
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEP_TITLES.map((title, i) => (
            <div
              key={i}
              className={`text-xs font-semibold uppercase tracking-wider ${
                i <= currentStep ? "text-primary" : "text-muted-foreground/30"
              }`}
            >
              Шаг {i + 1}
            </div>
          ))}
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{
              width: `${((currentStep + 1) / STEP_TITLES.length) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <h2 className="text-2xl font-bold mt-4">{STEP_TITLES[currentStep]}</h2>
      </div>

      {/* Step content */}
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

      {/* Bottom navigation */}
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
            className="h-14 px-8 text-lg gap-2"
            onClick={handleSubmit}
            disabled={!selectedLocation || isSubmitting}
            data-testid="btn-submit"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            Зарегистрировать
          </Button>
        ) : currentStep === Step.REVIEW ? (
          <Button
            className="h-14 px-8 text-lg"
            onClick={() => setLocation("/")}
          >
            На главную
          </Button>
        ) : currentStep === Step.ORDER_SELECT && orderTab === "existing" ? (
          // In "existing" tab, advance is handled by action buttons — hide Next
          <span />
        ) : (
          <Button
            className="h-14 px-8 text-lg gap-2"
            onClick={nextStep}
            disabled={!canAdvance()}
            data-testid="btn-next"
          >
            Далее <ChevronRight className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
