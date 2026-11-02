'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Booking, Room } from '@/types';
import { formatInDubai } from '@/lib/timezone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Calendar, Clock, MapPin, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export function CancelClientView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelledSuccess, setIsCancelledSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No cancellation token provided in URL.');
      setIsLoading(false);
      return;
    }

    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/cancel?token=${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Booking not found');
        }
        const data = await res.json();
        setBooking(data.booking);
        setRoom(data.room);
        if (data.booking.status === 'cancelled') {
          setIsCancelledSuccess(true);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBooking();
  }, [token]);

  const handleCancelBooking = async () => {
    if (!token) return;
    setIsCancelling(true);
    setError(null);

    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel booking');
      }

      setIsCancelledSuccess(true);
      if (booking) {
        setBooking({ ...booking, status: 'cancelled' });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading reservation details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-900 shadow-xl">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mb-2">
              <AlertCircle className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl">Unable to Find Reservation</CardTitle>
            <CardDescription className="text-red-600 dark:text-red-400">
              {error || 'The cancellation token is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                Return to Rooms
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const formattedDate = formatInDubai(booking.start_time, 'EEEE, d MMMM yyyy');
  const startTime = formatInDubai(booking.start_time, 'HH:mm');
  const endTime = formatInDubai(booking.end_time, 'HH:mm');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl rounded-3xl overflow-hidden border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-2">
          {isCancelledSuccess ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl font-black text-slate-900 dark:text-slate-100">
                Reservation Cancelled
              </CardTitle>
              <CardDescription>
                This meeting slot has been released and is now free for others to book.
              </CardDescription>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7" />
              </div>
              <CardTitle className="text-2xl font-black text-slate-900 dark:text-slate-100">
                Cancel Reservation
              </CardTitle>
              <CardDescription>
                Confirm below to release this meeting room booking.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/60 space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Meeting:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {booking.title}
              </span>
            </div>
            {room && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Room:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {room.name}
                </span>
              </div>
            )}
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
        </CardContent>

        <CardFooter className="flex flex-col gap-2.5 pt-2">
          {!isCancelledSuccess ? (
            <>
              <Button
                variant="destructive"
                className="w-full gap-2 font-bold"
                onClick={handleCancelBooking}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm &amp; Cancel Reservation</span>
                  </>
                )}
              </Button>
              {room && (
                <Link href={`/room/${room.id}`} className="w-full">
                  <Button variant="ghost" className="w-full text-xs">
                    Keep Booking &amp; Back to Room
                  </Button>
                </Link>
              )}
            </>
          ) : (
            room && (
              <Link href={`/room/${room.id}`} className="w-full">
                <Button variant="default" className="w-full gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Room Schedule</span>
                </Button>
              </Link>
            )
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
