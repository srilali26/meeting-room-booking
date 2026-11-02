'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Room, Booking, TimelineSlot } from '@/types';
import { Navbar } from '@/components/Navbar';
import { RoomHeader } from '@/components/RoomHeader';
import { DatePickerStrip } from '@/components/DatePickerStrip';
import { VerticalTimeline } from '@/components/VerticalTimeline';
import { BookingSheet } from '@/components/BookingSheet';
import { BookingConfirmationModal } from '@/components/BookingConfirmationModal';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import {
  generateDaySlots,
  computeRoomStatus,
  formatInDubai,
  getNow,
  createDubaiDateTime,
} from '@/lib/timezone';
import { addMinutes, isAfter, isBefore, parseISO } from 'date-fns';

interface RoomClientViewProps {
  initialRoom: Room;
  initialBookings: Booking[];
  allRooms: Room[];
}

export function RoomClientView({
  initialRoom,
  initialBookings,
  allRooms,
}: RoomClientViewProps) {
  const [room] = useState<Room>(initialRoom);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);

  // Selected date defaults to today in Dubai (YYYY-MM-DD)
  const todayDubai = useMemo(() => formatInDubai(getNow(), 'yyyy-MM-dd'), []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayDubai);

  // Sheet / Modal State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Realtime hook to update bookings live across all open tabs
  const handleBookingRealtimeChange = useCallback(
    (booking: Booking, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
      setBookings((prev) => {
        if (eventType === 'INSERT') {
          // If already in list, do not duplicate
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

  const { status: realtimeStatus } = useRealtimeBookings({
    roomId: room.id,
    onBookingChange: handleBookingRealtimeChange,
  });

  // Also poll or refresh when switching dates
  useEffect(() => {
    let isCancelled = false;
    async function fetchBookingsForRoom() {
      try {
        const res = await fetch(`/api/bookings?room_id=${room.id}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.bookings) {
            setBookings(data.bookings);
          }
        }
      } catch (e) {
        // Safe silent fail, realtime will push
      }
    }
    fetchBookingsForRoom();
    return () => {
      isCancelled = true;
    };
  }, [room.id, selectedDateStr]);

  // Compute 24 timeline slots for the selected date
  const slots: TimelineSlot[] = useMemo(() => {
    return generateDaySlots(selectedDateStr, bookings);
  }, [selectedDateStr, bookings]);

  // Compute live Room Status banner info (calculated based on today's live bookings)
  const roomStatusInfo = useMemo(() => {
    return computeRoomStatus(bookings);
  }, [bookings]);

  // Slot range selection handler
  const handleSelectSlotRange = (start: Date, end: Date) => {
    setSelectedStartTime(start);
    setSelectedEndTime(end);
    setIsSheetOpen(true);
  };

  // Quick "Book next 30/60 min" button handler
  const handleQuickBook = (durationMinutes: number) => {
    const now = getNow();
    const todayStr = formatInDubai(now, 'yyyy-MM-dd');
    setSelectedDateStr(todayStr);

    const todaySlots = generateDaySlots(todayStr, bookings);
    // Find the first upcoming available slot
    const freeSlot = todaySlots.find((s) => !s.isBooked && !s.isPast);

    if (freeSlot) {
      const start = freeSlot.startTime;
      const end = addMinutes(start, durationMinutes);
      setSelectedStartTime(start);
      setSelectedEndTime(end);
      setIsSheetOpen(true);
    } else {
      alert('No free slots available today. Please choose another date.');
    }
  };

  // On successful booking
  const handleBookingSuccess = (newBooking: Booking) => {
    setIsSheetOpen(false);
    // Ensure it is in state right away (realtime will also broadcast)
    setBookings((prev) => {
      if (prev.some((b) => b.id === newBooking.id)) return prev;
      return [...prev, newBooking];
    });
    setConfirmedBooking(newBooking);
  };

  const handleBookingCancelled = () => {
    // If user cancelled right from confirmation modal
    if (confirmedBooking) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === confirmedBooking.id ? { ...b, status: 'cancelled' } : b
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar currentRoomId={room.id} rooms={allRooms} />

      <RoomHeader
        room={room}
        statusInfo={roomStatusInfo}
        realtimeStatus={realtimeStatus}
        onQuickBook={handleQuickBook}
      />

      <DatePickerStrip
        selectedDateStr={selectedDateStr}
        onSelectDate={setSelectedDateStr}
      />

      <main className="flex-1">
        <VerticalTimeline
          slots={slots}
          selectedDateStr={selectedDateStr}
          onSelectSlotRange={handleSelectSlotRange}
        />
      </main>

      {/* Booking Form Sheet */}
      <BookingSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        room={room}
        startTime={selectedStartTime}
        endTime={selectedEndTime}
        onBookingSuccess={handleBookingSuccess}
      />

      {/* Booking Confirmation Modal */}
      <BookingConfirmationModal
        booking={confirmedBooking}
        room={room}
        onClose={() => setConfirmedBooking(null)}
        onCancelled={handleBookingCancelled}
      />
    </div>
  );
}
