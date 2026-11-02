'use client';

import React, { useState, useEffect } from 'react';
import { Booking, Room } from '@/types';
import { formatInDubai } from '@/lib/timezone';
import { Button } from './ui/button';
import { CheckCircle, Copy, Check, ExternalLink, Trash2, Calendar, MapPin, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';

interface BookingConfirmationModalProps {
  booking: Booking | null;
  room: Room;
  onClose: () => void;
  onCancelled?: () => void;
}

export function BookingConfirmationModal({
  booking,
  room,
  onClose,
  onCancelled,
}: BookingConfirmationModalProps) {
  const [copied, setCopied] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (booking) {
      // Fire confetti burst
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [booking]);

  if (!booking) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cancelUrl = `${origin}/booking/cancel?token=${booking.cancel_token}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cancelUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInstantCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking? This slot will immediately be freed for others.')) {
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: booking.cancel_token }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel');
      }

      setIsCancelling(false);
      if (onCancelled) onCancelled();
      onClose();
    } catch (err: any) {
      setCancelError(err.message);
      setIsCancelling(false);
    }
  };

  const formattedDate = formatInDubai(booking.start_time, 'EEEE, d MMMM yyyy');
  const startTime = formatInDubai(booking.start_time, 'HH:mm');
  const endTime = formatInDubai(booking.end_time, 'HH:mm');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 animate-in zoom-in-95">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
          <CheckCircle className="w-8 h-8" />
        </div>

        <h3 className="text-2xl font-black text-center text-slate-900 dark:text-slate-100">
          Room Booked!
        </h3>
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-1 mb-6">
          Your reservation is live and visible to everyone.
        </p>

        {/* Details Summary Box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/60 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Meeting:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {booking.title}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Room:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {room.name}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Date:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formattedDate}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Time:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {startTime} – {endTime} (Dubai Time)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Organizer:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {booking.organizer_name}
            </span>
          </div>
        </div>

        {/* Cancel Token Link Section */}
        <div className="mt-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1.5">
            <span>Secret Cancellation Link</span>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-400">No login required</span>
          </div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed mb-2.5">
            Save this link to cancel or modify your reservation later:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={cancelUrl}
              className="flex-1 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors flex-shrink-0"
              title="Copy cancel link"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {cancelError && (
          <p className="mt-2 text-xs text-red-500 text-center">{cancelError}</p>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
          <Button
            variant="destructive"
            size="sm"
            className="w-full sm:w-auto gap-1.5 text-xs"
            onClick={handleInstantCancel}
            disabled={isCancelling}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isCancelling ? 'Cancelling...' : 'Cancel Reservation'}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            className="w-full flex-1 text-xs"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
