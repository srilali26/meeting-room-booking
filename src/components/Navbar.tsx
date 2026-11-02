'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DoorClosed, LayoutDashboard, Moon, Sun, Monitor, Calendar } from 'lucide-react';
import { Room } from '@/types';

interface NavbarProps {
  currentRoomId?: string;
  rooms?: Room[];
}

export function Navbar({ currentRoomId, rooms = [] }: NavbarProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black group-hover:scale-105 transition-transform shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
                QuickRoom <span className="text-blue-600">Live</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none -mt-0.5">
                Dubai HQ
              </span>
            </div>
          </Link>

          {/* Quick Room Selector Pill if on a room page */}
          {rooms.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800">
              {rooms.map((r) => {
                const isActive = r.id === currentRoomId;
                return (
                  <Link
                    key={r.id}
                    href={`/room/${r.id}`}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {r.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              pathname?.startsWith('/admin')
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Admin</span>
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
