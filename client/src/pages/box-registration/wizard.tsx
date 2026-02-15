import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CameraCapture } from "@/components/camera-capture";
import { QrScanner } from "@/components/qr-scanner";
import { useCreateBox, useLocationByQr, useOrders, useLocations } from "@/hooks/use-warehouse";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Loader2, Package, QrCode } from "lucide-react";
import { useLocation } from "wouter";

import { useLanguage } from "@/hooks/use-language";

// Steps Enum
enum Step {
  ORDER_SELECT = 0,
  PRODUCT_PHOTOS = 1,
  STICKER_DETAILS = 2,
  LOCATION_SELECT = 3,
  REVIEW = 4
}

const STEP_TITLES = [
  "Identify Order",
  "Product Photos",
  "Box Details",
  "Assign Location",
  "Review & Submit"
];

export default function BoxRegistrationWizard() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.ORDER_SELECT);
  const [, setLocation] = useLocation();
  const createBox = useCreateBox();
  const { data: orders } = useOrders({ status: 'active' });
  const { data: locations } = useLocations();
  const { t } = useLanguage();

  // Form State
  const [formData, setFormData] = useState({
    orderId: "",
    manualOrderNumber: "",
    numberInOrder: "", // e.g., "1/5"
    quantity: "",
    productPhotos: [] as string[],
    stickerPhoto: "",
    locationType: "permanent" as "permanent" | "temporary",
    locationId: undefined as number | undefined,
    locationUuid: "",
    tempLocationDesc: "",
    tempLocationPhoto: "",
  });

  // Location Query logic (only runs when locationUuid is set)
  const { data: scannedLocation } = useLocationByQr(formData.locationUuid || null);

  // Effective location selection
  const selectedLocation = formData.locationId 
    ? locations?.find(l => l.id === formData.locationId)
    : scannedLocation;

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, Step.REVIEW));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, Step.ORDER_SELECT));

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleScanOrder = (data: string) => {
    // Assuming QR contains Order Number. Find ID from list.
    const found = orders?.find(o => o.number === data);
    if (found) {
      updateField("orderId", found.id.toString());
      // Auto-advance if found
    } else {
        alert("Order not found or invalid QR. Try manual selection or entry.");
    }
  };

  const handleSubmit = () => {
    // Prepare payload
    const payload = {
      orderId: formData.orderId ? parseInt(formData.orderId) : null,
      manualOrderNumber: formData.orderId ? null : formData.manualOrderNumber, // Add this if schema supports it
      numberInOrder: formData.numberInOrder,
      quantity: parseInt(formData.quantity),
      locationType: formData.locationType,
      locationId: selectedLocation?.id, // Use the ID from the fetched/selected location
      tempLocationDesc: formData.tempLocationDesc,
      tempLocationPhoto: formData.tempLocationPhoto,
      status: 'in_stock' as const,
      productPhotos: formData.productPhotos,
      stickerPhoto: formData.stickerPhoto,
      problemType: null,
      problemDesc: null,
      createdBy: 1, // Will be overridden by backend or session
      shippedBy: null
    };

    createBox.mutate(payload, {
      onSuccess: () => {
        setLocation("/"); // Redirect to dashboard
      }
    });
  };

  // Render Steps
  const renderStep = () => {
    switch (currentStep) {
      case Step.ORDER_SELECT:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <QrCode className="w-5 h-5" /> Scan Order QR
                </h3>
                <QrScanner onScan={handleScanOrder} label="Scan Order Sheet" />
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">Manual Entry</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Existing Order</Label>
                    <Select 
                      value={formData.orderId} 
                      onValueChange={(val) => {
                        updateField("orderId", val);
                        const foundOrder = orders?.find(o => o.id.toString() === val);
                        updateField("manualOrderNumber", foundOrder ? foundOrder.number : "");
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Choose order..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border shadow-md">
                        {orders?.map((o) => (
                          <SelectItem key={o.id} value={o.id.toString()}>
                            {o.number} - {o.customer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
                  </div>

                  <div className="space-y-2">
                    <Label>Type Order Number Manually</Label>
                    <Input 
                      placeholder="e.g. ORD-1234" 
                      className="h-12"
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
                        <Check className="w-4 h-4" /> Order Identified
                    </div>
                )}
              </Card>
            </div>
          </div>
        );

      case Step.PRODUCT_PHOTOS:
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                     <h3 className="font-semibold text-lg">Capture Contents</h3>
                     <CameraCapture 
                        onCapture={(src) => updateField("productPhotos", [...formData.productPhotos, src])}
                        label="Add Photo" 
                    />
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Photos ({formData.productPhotos.length})</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {formData.productPhotos.map((src, idx) => (
                            <div key={idx} className="relative aspect-video bg-black/10 rounded-lg overflow-hidden group">
                                <img src={src} className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => updateField("productPhotos", formData.productPhotos.filter((_, i) => i !== idx))}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <ChevronRight className="w-3 h-3 rotate-45" /> {/* Close icon hack */}
                                </button>
                            </div>
                        ))}
                        {formData.productPhotos.length === 0 && (
                            <div className="col-span-2 py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                                No photos added yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        );

      case Step.STICKER_DETAILS:
        return (
          <div className="space-y-6">
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <Label>Sticker Photo (OCR)</Label>
                    <CameraCapture 
                        onCapture={(src) => {
                            updateField("stickerPhoto", src);
                            // Simulate OCR delay
                            setTimeout(() => {
                                updateField("quantity", "1000"); // Fake OCR result
                            }, 1500);
                        }}
                        label="Capture Sticker" 
                    />
                    {formData.stickerPhoto && (
                        <div className="aspect-video bg-black rounded-lg overflow-hidden mt-2">
                             <img src={formData.stickerPhoto} className="w-full h-full object-contain" />
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                     <div className="space-y-2">
                        <Label>Box Number (e.g., 3/10)</Label>
                        <Input 
                            value={formData.numberInOrder} 
                            onChange={(e) => updateField("numberInOrder", e.target.value)}
                            placeholder="1/1"
                            className="h-12"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input 
                            type="number"
                            value={formData.quantity} 
                            onChange={(e) => updateField("quantity", e.target.value)}
                            placeholder="Total items"
                            className="h-12"
                        />
                        <p className="text-xs text-muted-foreground">Auto-filled from sticker if clear.</p>
                     </div>
                </div>
             </div>
          </div>
        );

      case Step.LOCATION_SELECT:
        return (
          <div className="space-y-6">
             <div className="flex gap-4 mb-4">
                 <Button 
                    variant={formData.locationType === 'permanent' ? 'default' : 'outline'}
                    onClick={() => updateField("locationType", 'permanent')}
                    className="flex-1 h-12"
                 >
                    Standard Rack
                 </Button>
                 <Button 
                    variant={formData.locationType === 'temporary' ? 'default' : 'outline'}
                    onClick={() => updateField("locationType", 'temporary')}
                    className="flex-1 h-12"
                 >
                    Temporary Spot
                 </Button>
             </div>

             {formData.locationType === 'permanent' ? (
                 <div className="space-y-4">
                    <Card className="p-6">
                         <h3 className="font-semibold mb-4">Scan Rack QR Code</h3>
                         <QrScanner 
                            onScan={(data) => {
                                updateField("locationUuid", data);
                                updateField("locationId", undefined);
                            }}
                            label="Scan Shelf QR"
                         />
                         
                         <div className="my-6 relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or select from list</span></div>
                         </div>

                         <div className="space-y-2">
                            <Label>Select Location</Label>
                            <Select 
                                value={formData.locationId?.toString()} 
                                onValueChange={(val) => {
                                    updateField("locationId", parseInt(val));
                                    updateField("locationUuid", "");
                                }}
                            >
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Choose location..." />
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
                                 <p className="font-semibold text-blue-900 dark:text-blue-100">Location Selected:</p>
                                 <p className="text-lg">{selectedLocation.name}</p>
                             </div>
                         )}
                    </Card>
                 </div>
             ) : (
                 <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Location Description</Label>
                        <Input 
                            value={formData.tempLocationDesc} 
                            onChange={(e) => updateField("tempLocationDesc", e.target.value)}
                            placeholder="e.g., Near loading dock B"
                            className="h-12"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Location Photo</Label>
                        <CameraCapture 
                            onCapture={(src) => updateField("tempLocationPhoto", src)}
                            label="Photo of Spot"
                        />
                    </div>
                 </div>
             )}
          </div>
        );

      case Step.REVIEW:
        return (
          <div className="space-y-6">
             <Card className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                         <span className="text-muted-foreground">Order:</span>
                         <p className="font-semibold">
                            {formData.orderId 
                                ? orders?.find(o => o.id.toString() === formData.orderId)?.number 
                                : formData.manualOrderNumber || "Manual Entry"}
                         </p>
                     </div>
                     <div>
                         <span className="text-muted-foreground">Box:</span>
                         <p className="font-semibold">{formData.numberInOrder}</p>
                     </div>
                     <div>
                         <span className="text-muted-foreground">Quantity:</span>
                         <p className="font-semibold">{formData.quantity}</p>
                     </div>
                     <div>
                         <span className="text-muted-foreground">Location:</span>
                         <p className="font-semibold">
                             {formData.locationType === 'permanent' ? selectedLocation?.name : "Temporary Area"}
                         </p>
                     </div>
                 </div>
                 
                 <div className="space-y-2">
                     <span className="text-muted-foreground text-sm">Photos:</span>
                     <div className="flex gap-2 overflow-x-auto pb-2">
                         {formData.productPhotos.map((src, i) => (
                             <img key={i} src={src} className="h-20 w-auto rounded-lg border" />
                         ))}
                         {formData.stickerPhoto && <img src={formData.stickerPhoto} className="h-20 w-auto rounded-lg border" />}
                         {formData.tempLocationPhoto && <img src={formData.tempLocationPhoto} className="h-20 w-auto rounded-lg border" />}
                     </div>
                 </div>
             </Card>
          </div>
        );
    }
  };

  // Validations per step
  const canAdvance = () => {
      switch(currentStep) {
          case Step.ORDER_SELECT: return !!formData.orderId || !!formData.manualOrderNumber;
          case Step.PRODUCT_PHOTOS: return formData.productPhotos.length > 0;
          case Step.STICKER_DETAILS: return !!formData.numberInOrder && !!formData.quantity;
          case Step.LOCATION_SELECT: 
            if (formData.locationType === 'permanent') return !!selectedLocation;
            return !!formData.tempLocationDesc;
          default: return true;
      }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex justify-between mb-2">
                    {STEP_TITLES.map((title, i) => (
                        <div 
                            key={i} 
                            className={`text-xs font-semibold uppercase tracking-wider ${i <= currentStep ? 'text-primary' : 'text-muted-foreground/30'}`}
                        >
                            Step {i + 1}
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
                <h2 className="text-2xl font-bold mt-4 font-display">{STEP_TITLES[currentStep]}</h2>
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

            {/* Sticky Footer Actions */}
            <div className="fixed bottom-0 left-0 lg:left-72 right-0 p-4 bg-background/80 backdrop-blur border-t flex justify-between items-center z-40">
                <Button 
                    variant="ghost" 
                    onClick={prevStep} 
                    disabled={currentStep === 0 || currentStep === Step.REVIEW}
                >
                    {t("common.back")}
                </Button>

                {currentStep === Step.LOCATION_SELECT ? (
                    <Button 
                        size="lg" 
                        onClick={handleSubmit} 
                        className="bg-green-600 hover:bg-green-700 w-40"
                        disabled={!canAdvance() || createBox.isPending}
                    >
                        {createBox.isPending ? <Loader2 className="animate-spin" /> : t("common.submit")}
                    </Button>
                ) : currentStep === Step.REVIEW ? (
                    <Button 
                        size="lg" 
                        onClick={() => setLocation("/")} 
                        className="w-40"
                    >
                        Done
                    </Button>
                ) : (
                    <Button 
                        size="lg" 
                        onClick={nextStep} 
                        disabled={!canAdvance()}
                        className="w-32"
                    >
                        {t("common.next")} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                )}
            </div>
        </div>
  );
}
