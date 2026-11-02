'use client';

import React from 'react';
import { RealtimeStatus } from '@/hooks/useRealtimeBookings';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface LiveIndicatorProps {
  status: RealtimeStatus;
}

export function LiveIndicator({ status }: LiveIndicatorProps) {
  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shadow-xs"
      style={{
        backgroundColor:
          status === 'connected'
            ? 'rgba(16, 185, 129, 0.08)'
            : status === 'connecting'
            ? 'rgba(245, 158, 11, 0.08)'
            : 'rgba(239, 68, 68, 0.08)',
        borderColor:
          status === 'connected'
            ? 'rgba(16, 185, 129, 0.3)'
            : status === 'connecting'
            ? 'rgba(245, 158, 11, 0.3)'
            : 'rgba(239, 68, 68, 0.3)',
      }}
      title={`Realtime Status: ${status}`}
      aria-live="polite"
    >
      {status === 'connected' && (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold tracking-wide flex items-center gap-1">
            <Wifi className="w-3 h-3 inline" /> LIVE
          </span>
        </>
      )}

      {status === 'connecting' && (
        <>
          <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
          <span className="text-amber-700 dark:text-amber-400 font-medium">Connecting...</span>
        </>
      )}

      {status === 'disconnected' && (
        <>
          <span className="h-2 w-2 rounded-full bg-red-500"></span>
          <span className="text-red-700 dark:text-red-400 font-medium flex items-center gap-1">
            <WifiOff className="w-3 h-3 inline" /> Reconnecting
          </span>
        </>
      )}
    </div>
  );
}
