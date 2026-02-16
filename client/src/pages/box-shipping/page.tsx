import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrScanner } from "@/components/qr-scanner";
import { useBoxes, useShipBox } from "@/hooks/use-warehouse";
import { Check, Loader2, QrCode, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function BoxShipping() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [scannedId, setScannedId] = useState<string | null>(null);
  const shipBox = useShipBox();
  const { data: boxes } = useBoxes();

  const currentBox = scannedId ? boxes?.find(b => b.id.toString() === scannedId) : null;

  const handleScan = (data: string) => {
    setScannedId(data);
  };

  const handleShip = () => {
    if (!currentBox) return;
    shipBox.mutate(currentBox.id, {
      onSuccess: () => {
        toast({
          title: t("ship.success"),
          description: t("ship.success_desc"),
        });
        setScannedId(null);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.ship_box")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" /> {t("ship.scan_box")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QrScanner onScan={handleScan} label={t("ship.scan_label")} />
        </CardContent>
      </Card>

      {currentBox && (
        <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle>{t("ship.box_details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t("ship.order")}:</span>
                <p className="font-semibold">{currentBox.manualOrderNumber || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("ship.box_num")}:</span>
                <p className="font-semibold">{currentBox.numberInOrder}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("ship.quantity")}:</span>
                <p className="font-semibold">{currentBox.quantity}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("ship.status")}:</span>
                <div>
                  <Badge variant={currentBox.status === 'in_stock' ? 'default' : 'secondary'}>
                    {currentBox.status}
                  </Badge>
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-12 text-lg" 
              onClick={handleShip}
              disabled={shipBox.isPending || currentBox.status === 'shipped'}
            >
              {shipBox.isPending ? <Loader2 className="animate-spin mr-2" /> : <Truck className="w-5 h-5 mr-2" />}
              {t("ship.confirm_ship")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
