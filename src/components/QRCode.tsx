import React, { useMemo } from 'react';

interface QRCodeProps {
  value: string;
  size?: number | string;
}

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 80 }) => {
  // Simple seedable random/hash function based on the string value
  const grid = useMemo(() => {
    // Generate a 15x15 grid (225 pixels)
    const size = 15;
    const array: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Simple hash output
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Fill standard QR Code anchor blocks (7x7) in corners:
    // Top-left
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const isBorder = r === 0 || r === 4 || c === 0 || c === 4;
        const isCenter = r === 2 && c === 2;
        array[r][c] = isBorder || isCenter;
      }
    }
    // Top-right
    for (let r = 0; r < 5; r++) {
      for (let c = 10; c < 15; c++) {
        const cc = c - 10;
        const isBorder = r === 0 || r === 4 || cc === 0 || cc === 4;
        const isCenter = r === 2 && cc === 2;
        array[r][c] = isBorder || isCenter;
      }
    }
    // Bottom-left
    for (let r = 10; r < 15; r++) {
      for (let c = 0; c < 5; c++) {
        const rr = r - 10;
        const isBorder = rr === 0 || rr === 4 || c === 0 || c === 4;
        const isCenter = rr === 2 && c === 2;
        array[r][c] = isBorder || isCenter;
      }
    }

    // Fill in other elements pseudo-randomly based on string value
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip corner areas
        if (
          (r < 6 && c < 6) ||
          (r < 6 && c > 8) ||
          (r > 8 && c < 6)
        ) {
          continue;
        }
        // Pseudo random bit from code hash
        const pixelSeed = Math.abs(Math.sin(hash + r * 13 + c * 37));
        array[r][c] = pixelSeed > 0.45;
      }
    }

    return array;
  }, [value]);

  return (
    <div
      style={{ width: size, height: size }}
      className="p-1 bg-white border border-outline-variant rounded-lg flex flex-col items-center justify-center shrink-0 shadow-xs"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
          gap: '1px',
          backgroundColor: '#ffffff'
        }}
        className="w-full h-full"
      >
        {grid.flatMap((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className={`w-full h-full rounded-[1px] transition-colors ${
                cell ? 'bg-slate-900' : 'bg-white'
              }`}
            />
          ))
        )}
      </div>
    </div>
  );
};
