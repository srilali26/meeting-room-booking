'use client';

import React from 'react';
import { Room, RoomStatusInfo } from '@/types';
import { LiveIndicator } from './LiveIndicator';
import { RealtimeStatus } from '@/hooks/useRealtimeBookings';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, MapPin, Monitor, Clock, Zap, ExternalLink, QrCode } from 'lucide-react';
import Link from 'next/link';

interface RoomHeaderProps {
  room: Room;
  statusInfo: RoomStatusInfo;
  realtimeStatus: RealtimeStatus;
  onQuickBook: (durationMinutes: number) => void;
}

export function RoomHeader({
  room,
  statusInfo,
  realtimeStatus,
  onQuickBook,
}: RoomHeaderProps) {
  const isAvailable = statusInfo.isAvailableNow;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        {/* Top bar with Live indicator and quick display link */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <LiveIndicator status={realtimeStatus} />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
              Asia/Dubai (UTC+4)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/room/${room.id}/display`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Tablet Display</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
          </div>
        </div>

        {/* Room Title & Location */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {room.name}
              </h1>
              {!room.is_active && (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                {room.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-4 h-4 text-slate-400" />
                Up to {room.capacity} people
              </span>
            </div>
          </div>
        </div>

        {/* Amenities chips */}
        {room.amenities && room.amenities.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-5">
            {room.amenities.map((amenity, idx) => (
              <span
                key={idx}
                className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md font-medium"
              >
                {amenity}
              </span>
            ))}
          </div>
        )}

        {/* Status Banner */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-300 ${
            isAvailable
              ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/60'
              : 'bg-red-50/80 border-red-200 dark:bg-red-950/30 dark:border-red-800/60'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isAvailable
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Status
              </div>
              <div
                className={`text-base sm:text-lg font-bold ${
                  isAvailable
                    ? 'text-emerald-900 dark:text-emerald-200'
                    : 'text-red-900 dark:text-red-200'
                }`}
              >
                {statusInfo.statusText}
              </div>
              {statusInfo.currentBooking && (
                <div className="text-xs text-red-700/80 dark:text-red-300/80 mt-0.5">
                  &ldquo;{statusInfo.currentBooking.title}&rdquo; &bull; {statusInfo.currentBooking.organizer_name}
                </div>
              )}
            </div>
          </div>

          {/* Quick "Book now" action */}
          {isAvailable && room.is_active && (
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <Button
                variant="success"
                size="sm"
                className="flex-1 sm:flex-none gap-1.5 font-semibold text-xs h-9"
                onClick={() => onQuickBook(30)}
              >
                <Zap className="w-3.5 h-3.5" /> Book 30 min
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none gap-1.5 font-semibold text-xs h-9 bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                onClick={() => onQuickBook(60)}
              >
                <Clock className="w-3.5 h-3.5" /> Book 60 min
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
