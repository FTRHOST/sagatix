import React, { useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
}

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 80 }) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    
    // Encode the ticket code directly
    QRCodeLib.toDataURL(value, {
      margin: 1,
      width: 150,
      color: {
        dark: '#0f172a', // Slate-900 style
        light: '#ffffff'
      }
    })
      .then(url => setQrUrl(url))
      .catch(err => console.error('Error generating QR Code:', err));
  }, [value]);

  return (
    <div
      style={{ width: size, height: size }}
      className="p-1 bg-white border border-outline-variant rounded-lg flex items-center justify-center shrink-0 shadow-xs overflow-hidden"
    >
      {qrUrl ? (
        <img
          src={qrUrl}
          alt="QR Code"
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
      )}
    </div>
  );
};
