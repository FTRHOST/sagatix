import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Check if cameras are available
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices);
        setSelectedCameraId(devices[0].id);
      } else {
        setCameras([]);
      }
    }).catch(err => {
      console.error("Error getting cameras", err);
      setCameras([]);
    });
  }, []);

  const startScanner = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }
      setIsScanning(true);

      const config = selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" };

      await scannerRef.current.start(
        config,
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

  if (cameras.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-xs">
        Kamera tidak terdeteksi pada perangkat ini. Pastikan Anda telah memberikan izin kamera.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div id="reader" className="w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-black border border-white/10 min-h-[250px]" />

      {!isScanning && cameras.length > 1 && (
        <div className="flex flex-col items-center gap-1">
          <label className="text-[10px] font-black uppercase text-slate-400">Pilih Kamera:</label>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="bg-slate-900 border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 focus:border-emerald-500 focus:outline-none max-w-xs"
          >
            {cameras.map(c => (
              <option key={c.id} value={c.id}>{c.label || `Kamera ${c.id.substring(0,5)}`}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-center pt-2">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
          >
            Mulai Pindai Kamera
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="bg-red-500 hover:bg-red-400 text-white font-black text-xs px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
          >
            Hentikan Kamera
          </button>
        )}
      </div>
    </div>
  );
};
