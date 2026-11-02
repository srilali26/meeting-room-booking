'use client';

import React, { useRef, useEffect } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { formatInDubai, getNow } from '@/lib/timezone';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerStripProps {
  selectedDateStr: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
}

export function DatePickerStrip({ selectedDateStr, onSelectDate }: DatePickerStripProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const now = getNow();
  const todayDubaiStr = formatInDubai(now, 'yyyy-MM-dd');

  // Generate 30 days starting from today in Dubai
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(now, i);
    const dateStr = formatInDubai(d, 'yyyy-MM-dd');
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : formatInDubai(d, 'EEE');
    const dayNumber = formatInDubai(d, 'd');
    const monthName = formatInDubai(d, 'MMM');

    return {
      dateStr,
      dayName,
      dayNumber,
      monthName,
      isToday: i === 0,
    };
  });

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 py-3 select-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Select Date (Next 30 Days)</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Scroll dates left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Scroll dates right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {days.map((item) => {
            const isSelected = item.dateStr === selectedDateStr;
            return (
              <button
                key={item.dateStr}
                onClick={() => onSelectDate(item.dateStr)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl transition-all font-medium border text-center ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 scale-105'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider ${
                    isSelected ? 'text-blue-100' : item.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.dayName}
                </span>
                <span className="text-xl font-extrabold leading-tight mt-0.5">
                  {item.dayNumber}
                </span>
                <span
                  className={`text-[10px] ${
                    isSelected ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {item.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
