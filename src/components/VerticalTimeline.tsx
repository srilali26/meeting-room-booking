'use client';

import React, { useState, useEffect } from 'react';
import { TimelineSlot, Booking } from '@/types';
import { getDubaiNowLinePercentage, formatInDubai, getNow } from '@/lib/timezone';
import { Lock, PlusCircle, CheckCircle2, Clock, User, CalendarX } from 'lucide-react';

interface VerticalTimelineProps {
  slots: TimelineSlot[];
  selectedDateStr: string;
  onSelectSlotRange: (startTime: Date, endTime: Date) => void;
}

export function VerticalTimeline({
  slots,
  selectedDateStr,
  onSelectSlotRange,
}: VerticalTimelineProps) {
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [nowPercentage, setNowPercentage] = useState<number | null>(() =>
    getDubaiNowLinePercentage(selectedDateStr)
  );

  // Update "now" line position every 30 seconds
  useEffect(() => {
    const update = () => {
      setNowPercentage(getDubaiNowLinePercentage(selectedDateStr));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [selectedDateStr]);

  // Clean mouse up globally
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isMouseDown && dragStartIndex !== null && hoverIndex !== null) {
        completeSelection(dragStartIndex, hoverIndex);
      }
      setIsMouseDown(false);
      setDragStartIndex(null);
      setHoverIndex(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isMouseDown, dragStartIndex, hoverIndex, slots]);

  const completeSelection = (startIdx: number, endIdx: number) => {
    const low = Math.min(startIdx, endIdx);
    const high = Math.max(startIdx, endIdx);

    // Ensure all slots in range are free and not past
    for (let i = low; i <= high; i++) {
      if (slots[i].isBooked || slots[i].isPast) {
        // Can't select range that includes booked or past slots
        return;
      }
    }

    const startSlot = slots[low];
    const endSlot = slots[high];
    onSelectSlotRange(startSlot.startTime, endSlot.endTime);
  };

  const handleSlotClick = (slot: TimelineSlot) => {
    if (slot.isBooked || slot.isPast) return;
    onSelectSlotRange(slot.startTime, slot.endTime);
  };

  const handleMouseDown = (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (slot.isBooked || slot.isPast) return;
    setIsMouseDown(true);
    setDragStartIndex(slotIndex);
    setHoverIndex(slotIndex);
  };

  const handleMouseEnter = (slotIndex: number) => {
    if (!isMouseDown || dragStartIndex === null) return;
    setHoverIndex(slotIndex);
  };

  const isSlotInRange = (index: number) => {
    if (dragStartIndex === null || hoverIndex === null) return false;
    const low = Math.min(dragStartIndex, hoverIndex);
    const high = Math.max(dragStartIndex, hoverIndex);
    return index >= low && index <= high;
  };

  const currentDubaiTimeStr = formatInDubai(getNow(), 'HH:mm');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Daily Schedule (08:00 – 20:00)
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
            <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block border border-emerald-600"></span>
            Available
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
            <span className="w-3 h-3 rounded-md bg-red-500 inline-block border border-red-600"></span>
            Booked
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
            <span className="w-3 h-3 rounded-md bg-slate-300 dark:bg-slate-700 inline-block"></span>
            Past
          </span>
        </div>
      </div>

      <div className="relative border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs overflow-hidden select-none">
        {/* Live "Now" Line */}
        {nowPercentage !== null && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center transition-all duration-500"
            style={{ top: `${nowPercentage}%` }}
          >
            <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-r-md shadow-md flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              <span>{currentDubaiTimeStr} NOW</span>
            </div>
            <div className="flex-1 h-[2px] bg-red-600 shadow-sm shadow-red-500/50"></div>
          </div>
        )}

        {/* Timeline Slot Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {slots.map((slot) => {
            const inRange = isSlotInRange(slot.slotIndex);

            return (
              <div
                key={slot.slotIndex}
                className={`relative flex items-stretch transition-colors ${
                  slot.isPast
                    ? 'bg-slate-50/70 dark:bg-slate-950/40 opacity-60'
                    : slot.isBooked
                    ? 'bg-red-50/40 dark:bg-red-950/20'
                    : inRange
                    ? 'bg-blue-100 dark:bg-blue-950/60'
                    : 'bg-white dark:bg-slate-900 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20'
                }`}
                onMouseDown={() => handleMouseDown(slot.slotIndex)}
                onMouseEnter={() => handleMouseEnter(slot.slotIndex)}
                onClick={() => handleSlotClick(slot)}
              >
                {/* Time Label Column */}
                <div className="w-20 sm:w-28 py-3.5 px-3 flex flex-col justify-center border-r border-slate-100 dark:border-slate-800/80 text-right flex-shrink-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {slot.startLabel}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    to {slot.endLabel}
                  </span>
                </div>

                {/* Slot Details Column */}
                <div className="flex-1 py-3 px-4 flex items-center justify-between gap-3 min-h-[58px]">
                  {slot.isPast ? (
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs">
                      <Clock className="w-4 h-4 opacity-50" />
                      <span className="font-medium">Time has passed</span>
                    </div>
                  ) : slot.isBooked && slot.booking ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-red-950 dark:text-red-200 truncate">
                            {slot.booking.title}
                          </div>
                          <div className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1 truncate">
                            <User className="w-3 h-3 inline opacity-70" />
                            <span>{slot.booking.organizer_name}</span>
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-200/70 text-red-800 dark:bg-red-900/80 dark:text-red-200 self-start sm:self-auto">
                        Booked
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium text-xs sm:text-sm">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                        <span>Available for booking</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSlotClick(slot);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs active:scale-95 transition-all"
                        aria-label={`Book slot starting at ${slot.startLabel}`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Book</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
