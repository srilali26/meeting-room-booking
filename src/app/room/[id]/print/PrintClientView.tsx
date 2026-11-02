'use client';

import React, { useState, useEffect } from 'react';
import { Room } from '@/types';
import QRCode from 'qrcode';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PrintClientViewProps {
  room: Room;
}

export function PrintClientView({ room }: PrintClientViewProps) {
  const [qrSvg, setQrSvg] = useState<string>('');
  const [roomUrl, setRoomUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/room/${room.id}`;
      setRoomUrl(url);
      QRCode.toString(url, {
        type: 'svg',
        width: 320,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(setQrSvg);
    }
  }, [room.id]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 sm:p-8 flex flex-col items-center">
      {/* Top Action Bar (Hidden during print) */}
      <div className="no-print w-full max-w-2xl flex items-center justify-between mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <Link
          href={`/room/${room.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Room</span>
        </Link>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-sm active:scale-95 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print QR Sign</span>
        </button>
      </div>

      {/* A4 Sheet Preview */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-12 sm:p-16 shadow-2xl rounded-2xl sm:rounded-none flex flex-col justify-between items-center text-center border border-slate-200 print:border-none print:shadow-none print:m-0 print:p-8">
        {/* Header */}
        <div>
          <div className="inline-block px-4 py-1.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-widest mb-4">
            Meeting Room Sign
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 mb-3">
            {room.name}
          </h1>
          <p className="text-xl font-medium text-slate-600">
            {room.location} &bull; Capacity {room.capacity}
          </p>
        </div>

        {/* Center QR Code Container */}
        <div className="my-10 flex flex-col items-center">
          <div className="p-6 rounded-3xl border-4 border-slate-900 bg-white shadow-lg inline-block">
            {qrSvg ? (
              <div
                className="w-64 h-64 sm:w-72 sm:h-72"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-64 h-64 bg-slate-100 animate-pulse rounded-xl" />
            )}
          </div>

          <div className="mt-8 max-w-md">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Scan to check availability &amp; book
            </h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Open your smartphone camera &amp; tap the link to reserve in real-time. No login required.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-mono">
          <div>URL: {roomUrl}</div>
          <div className="mt-2 sm:mt-0 font-sans font-semibold">QuickRoom Live HQ &bull; Asia/Dubai</div>
        </div>
      </div>
    </div>
  );
}
