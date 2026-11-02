'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Room, Booking } from '@/types';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { computeRoomStatus, formatInDubai, getNow } from '@/lib/timezone';
import { Users, Clock, Maximize2, Minimize2, Calendar, User } from 'lucide-react';
import QRCode from 'qrcode';

interface DisplayClientViewProps {
  room: Room;
  initialBookings: Booking[];
}

export function DisplayClientView({ room, initialBookings }: DisplayClientViewProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Clock ticks every second
  useEffect(() => {
    const updateTime = () => {
      const now = getNow();
      setCurrentTime(formatInDubai(now, 'HH:mm:ss'));
      setCurrentDate(formatInDubai(now, 'EEEE, d MMMM yyyy'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate QR code for this room
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const roomUrl = `${window.location.origin}/room/${room.id}`;
      QRCode.toDataURL(roomUrl, {
        width: 260,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(setQrDataUrl);
    }
  }, [room.id]);

  // Realtime hook
  const handleBookingRealtimeChange = useCallback(
    (booking: Booking, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
      setBookings((prev) => {
        if (eventType === 'INSERT') {
          if (prev.some((b) => b.id === booking.id)) return prev;
          return [...prev, booking];
        } else if (eventType === 'UPDATE') {
          return prev.map((b) => (b.id === booking.id ? booking : b));
        } else if (eventType === 'DELETE') {
          return prev.filter((b) => b.id !== booking.id);
        }
        return prev;
      });
    },
    []
  );

  useRealtimeBookings({
    roomId: room.id,
    onBookingChange: handleBookingRealtimeChange,
  });

  const statusInfo = useMemo(() => {
    return computeRoomStatus(bookings);
  }, [bookings]);

  // Next 3 meetings for today
  const nextThreeMeetings = useMemo(() => {
    const now = getNow();
    return bookings
      .filter((b) => b.status === 'confirmed' && new Date(b.end_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 3);
  }, [bookings]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const isAvailable = statusInfo.isAvailableNow;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-8 sm:p-12 font-sans select-none overflow-hidden">
      {/* Top Header: Room Name, Location & Live Clock */}
      <div className="flex items-start justify-between border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {room.name}
            </h1>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-lg mt-2 font-medium">
            <span>{room.location}</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <Users className="w-5 h-5 opacity-70" /> {room.capacity} seats
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-slate-100">
            {currentTime || '00:00:00'}
          </div>
          <div className="text-sm sm:text-base font-semibold text-slate-400 mt-1">
            {currentDate} &bull; Dubai (UTC+4)
          </div>
        </div>
      </div>

      {/* Center Hero: Large Room Status Card */}
      <div className="my-auto py-8">
        <div
          className={`rounded-3xl p-8 sm:p-12 border-2 transition-all duration-500 shadow-2xl ${
            isAvailable
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-950/50'
              : 'bg-red-950/40 border-red-500/60 shadow-red-950/50'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`w-4 h-4 rounded-full animate-ping ${
                isAvailable ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            ></span>
            <span
              className={`text-sm sm:text-base font-black tracking-widest uppercase ${
                isAvailable ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isAvailable ? 'AVAILABLE NOW' : 'OCCUPIED / IN USE'}
            </span>
          </div>

          <div
            className={`text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight ${
              isAvailable ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            {statusInfo.statusText}
          </div>

          {/* Current meeting details if occupied */}
          {statusInfo.currentBooking && (
            <div className="mt-6 pt-6 border-t border-red-900/40 flex flex-wrap items-center gap-6 text-slate-200">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-red-400 block">
                  Current Meeting
                </span>
                <span className="text-xl sm:text-2xl font-bold">
                  {statusInfo.currentBooking.title}
                </span>
              </div>
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-red-400 block">
                  Organizer
                </span>
                <span className="text-lg font-medium text-slate-300 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-red-400" />
                  {statusInfo.currentBooking.organizer_name}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Next 3 Meetings + QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end border-t border-slate-800/80 pt-6">
        {/* Next 3 Meetings List */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-slate-400 mb-4">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Up Next Today</span>
          </div>

          {nextThreeMeetings.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 text-slate-400 text-sm">
              No further meetings scheduled for today. Room is fully free!
            </div>
          ) : (
            <div className="space-y-3">
              {nextThreeMeetings.map((b) => {
                const s = formatInDubai(b.start_time, 'HH:mm');
                const e = formatInDubai(b.end_time, 'HH:mm');
                const isCurrent = statusInfo.currentBooking?.id === b.id;

                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
                      isCurrent
                        ? 'bg-red-950/30 border-red-800/60 text-red-200'
                        : 'bg-slate-900/70 border-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-24 font-mono font-bold text-sm text-blue-400">
                        {s} – {e}
                      </div>
                      <div>
                        <div className="font-bold text-base text-white">{b.title}</div>
                        <div className="text-xs text-slate-400">{b.organizer_name}</div>
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-900/80 text-red-200">
                        Active Now
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Upcoming</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Instant QR Code on tablet screen */}
        <div className="flex items-center justify-end">
          <div className="bg-white rounded-2xl p-3 shadow-xl flex items-center gap-4 max-w-xs">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Room QR Code"
                className="w-24 h-24 rounded-lg object-contain"
              />
            )}
            <div className="text-slate-900 pr-2">
              <div className="font-extrabold text-sm leading-tight">Instant Mobile Booking</div>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                Point your phone camera to check availability & book now
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
