import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeModalProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

export function BarcodeModal({ onScan, onClose }: BarcodeModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initialize scanner
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    scannerRef.current.render(
      (text) => {
        // Stop scanning once a code is found
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
        onScan(text);
      },
      (err) => {
        // Ignore continuous scanning errors
      }
    );

    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">Сканирование штрихкода</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 bg-black">
          <div id="reader" className="w-full overflow-hidden rounded-lg"></div>
        </div>
        <div className="p-4 text-center text-sm text-gray-500">
          Наведите камеру на штрихкод продукта
        </div>
      </div>
    </div>
  );
}
