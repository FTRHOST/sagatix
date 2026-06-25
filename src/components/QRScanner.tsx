import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameras, setHasCameras] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Check if cameras are available
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setHasCameras(true);
      } else {
        setHasCameras(false);
      }
    }).catch(err => {
      console.error("Error getting cameras", err);
      setHasCameras(false);
    });
  }, []);

  const startScanner = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }
      setIsScanning(true);
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScanSuccess(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          if (onScanError) {
            onScanError(errorMessage);
          }
        }
      );
    } catch (err) {
      console.error("Error starting scanner", err);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
        setIsScanning(false);
      }
    } catch (err) {
      console.error("Error stopping scanner", err);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  if (!hasCameras) {
    return (
      <div className="text-center py-6 text-slate-400 text-xs">
        Kamera tidak terdeteksi pada perangkat ini.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div id="reader" className="w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-black border border-white/10" />
      <div className="flex justify-center">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-6 py-2.5 rounded-xl transition-all shadow-md"
          >
            Mulai Pindai Kamera
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="bg-red-500 hover:bg-red-400 text-white font-black text-xs px-6 py-2.5 rounded-xl transition-all shadow-md"
          >
            Hentikan Kamera
          </button>
        )}
      </div>
    </div>
  );
};
