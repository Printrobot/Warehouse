import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Scan, X } from "lucide-react";

interface QrScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  label?: string;
}

export function QrScanner({ onScan, onError, label = "Scan QR Code" }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  // Clean up function to stop scanning
  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch (e) {
        console.error("Failed to clear scanner", e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            videoConstraints: {
              facingMode: "environment"
            },
            showTorchButtonIfSupported: true
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            onScan(decodedText);
            stopScanning();
          },
          (error) => {
            if (onError) onError(error);
          }
        );
        scannerRef.current = scanner;
      }, 100);
      
      return () => clearTimeout(timer);
    }
    
    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isScanning, onScan, onError]);

  if (!isScanning) {
    return (
      <Button 
        variant="outline" 
        className="w-full h-32 flex flex-col gap-2 border-dashed border-2 hover:bg-muted/50 transition-colors"
        onClick={() => setIsScanning(true)}
      >
        <Scan className="w-8 h-8 text-muted-foreground" />
        <span className="text-muted-foreground">{label}</span>
      </Button>
    );
  }

  return (
    <div className="space-y-4 border rounded-xl p-4 bg-black/5">
      <div id="reader" className="w-full bg-black rounded-lg overflow-hidden"></div>
      <Button variant="destructive" onClick={stopScanning} className="w-full">
        <X className="w-4 h-4 mr-2" />
        Cancel Scan
      </Button>
    </div>
  );
}
