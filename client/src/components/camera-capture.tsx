import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCcw, Check, X } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  label?: string;
}

export function CameraCapture({ onCapture, label = "Take Photo" }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
    }
  }, [webcamRef]);

  const confirm = () => {
    if (imgSrc) {
      onCapture(imgSrc);
      setImgSrc(null); // Reset for next time if needed, though parent usually handles unmounting
      setIsCameraOpen(false);
    }
  };

  const retake = () => {
    setImgSrc(null);
  };

  if (!isCameraOpen) {
    return (
      <Button 
        variant="outline" 
        className="w-full h-32 flex flex-col gap-2 border-dashed border-2 hover:bg-muted/50 transition-colors"
        onClick={() => setIsCameraOpen(true)}
      >
        <Camera className="w-8 h-8 text-muted-foreground" />
        <span className="text-muted-foreground">{label}</span>
      </Button>
    );
  }

  return (
    <div className="space-y-4 border rounded-xl p-4 bg-black/5">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        {imgSrc ? (
          <img src={imgSrc} alt="captured" className="w-full h-full object-contain" />
        ) : (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
            videoConstraints={{ facingMode: "environment" }}
          />
        )}
      </div>

      <div className="flex gap-2 justify-center">
        {imgSrc ? (
          <>
            <Button variant="outline" onClick={retake} className="w-full">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button onClick={confirm} className="w-full bg-green-600 hover:bg-green-700 text-white">
              <Check className="w-4 h-4 mr-2" />
              Confirm
            </Button>
          </>
        ) : (
          <>
             <Button variant="ghost" onClick={() => setIsCameraOpen(false)} className="w-full">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={capture} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Camera className="w-4 h-4 mr-2" />
              Snap
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
