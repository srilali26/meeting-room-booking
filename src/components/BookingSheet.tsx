'use client';

import React, { useState, useEffect } from 'react';
import { Room, Booking } from '@/types';
import { formatInDubai } from '@/lib/timezone';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Calendar, Clock, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { bookingFormSchema } from '@/lib/validation';

interface BookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  startTime: Date | null;
  endTime: Date | null;
  onBookingSuccess: (booking: Booking) => void;
}

export function BookingSheet({
  isOpen,
  onClose,
  room,
  startTime,
  endTime,
  onBookingSuccess,
}: BookingSheetProps) {
  const [title, setTitle] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setFieldErrors({});
    }
  }, [isOpen]);

  if (!isOpen || !startTime || !endTime) return null;

  const formattedDate = formatInDubai(startTime, 'EEEE, d MMMM yyyy');
  const startDubaiStr = formatInDubai(startTime, 'HH:mm');
  const endDubaiStr = formatInDubai(endTime, 'HH:mm');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    const payload = {
      room_id: room.id,
      title: title.trim(),
      organizer_name: organizerName.trim(),
      organizer_email: organizerEmail.trim(),
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      notes: notes.trim() || undefined,
    };

    // Client-side validation with Zod
    const validationResult = bookingFormSchema.safeParse(payload);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const path = err.path[0] as string;
        if (path) errors[path] = err.message;
      });
      setFieldErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.code === 'OVERLAP_CONFLICT') {
          setErrorMessage(data.error || 'This slot was just taken, please pick another');
        } else {
          setErrorMessage(data.error || 'Failed to complete booking. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      // Success
      setIsSubmitting(false);
      onBookingSuccess(data.booking);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred. Please check your connection.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all animate-in slide-in-from-bottom-8 max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-sheet-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 id="booking-sheet-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Reserve Meeting Room
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {room.name} &bull; {room.location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close booking sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Slot Overview Pill */}
        <div className="px-5 py-3 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-blue-950 dark:text-blue-200 font-semibold">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-300 font-bold bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-md border border-blue-200/60 dark:border-blue-800/60">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              {startDubaiStr} – {endDubaiStr} (Dubai)
            </span>
          </div>
        </div>

        {/* Conflict / Server Error Banner */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-2.5 text-red-800 dark:text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          <div>
            <label htmlFor="booking-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Meeting Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="booking-title"
              name="title"
              placeholder="e.g. Q4 Executive Strategy Session"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={fieldErrors.title}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="booking-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="booking-name"
                name="organizer_name"
                placeholder="Sarah Al Mansoor"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                error={fieldErrors.organizer_name}
                required
              />
            </div>
            <div>
              <label htmlFor="booking-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Work Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="booking-email"
                name="organizer_email"
                type="email"
                placeholder="sarah@example.com"
                value={organizerEmail}
                onChange={(e) => setOrganizerEmail(e.target.value)}
                error={fieldErrors.organizer_email}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Optional Notes / Agenda
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
              placeholder="Add video conference link or meeting materials..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {fieldErrors.notes && <p className="mt-1 text-xs text-red-500">{fieldErrors.notes}</p>}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting}
              className="gap-2 min-w-[130px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reserving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Confirm Booking</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
