import { formatInTimeZone, toDate } from 'date-fns-tz';
import { addMinutes, isAfter, isBefore, isEqual, parseISO } from 'date-fns';
import { Booking, RoomStatusInfo, TimelineSlot } from '@/types';

export const DUBAI_TIMEZONE = 'Asia/Dubai';
export const DUBAI_UTC_OFFSET_HOURS = 4;

/**
 * Format a Date or ISO string into Asia/Dubai time
 */
export function formatInDubai(date: Date | string, formatPattern: string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, DUBAI_TIMEZONE, formatPattern);
}

/**
 * Get current time represented as a Date
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Given a "YYYY-MM-DD" string (or Date), returns the UTC Date for a given Dubai hour & minute
 */
export function createDubaiDateTime(dateStr: string, hour: number, minute: number): Date {
  // dateStr is in YYYY-MM-DD format
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  // Dubai is UTC+4 without DST
  // Hour H in Dubai is H - 4 in UTC
  const utcDate = new Date(Date.UTC(year, month, day, hour - DUBAI_UTC_OFFSET_HOURS, minute, 0, 0));
  return utcDate;
}

/**
 * Generate 24 slots of 30 minutes from 08:00 to 20:00 Dubai time for a given day (YYYY-MM-DD)
 */
export function generateDaySlots(dateStr: string, bookings: Booking[] = []): TimelineSlot[] {
  const slots: TimelineSlot[] = [];
  const now = getNow();

  // 08:00 to 20:00 -> 12 hours * 2 = 24 slots
  const startHour = 8;
  const totalSlots = 24;

  for (let i = 0; i < totalSlots; i++) {
    const slotStartMinutes = i * 30;
    const hour = startHour + Math.floor(slotStartMinutes / 60);
    const minute = slotStartMinutes % 60;

    const endMinutes = slotStartMinutes + 30;
    const endHour = startHour + Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;

    const startTime = createDubaiDateTime(dateStr, hour, minute);
    const endTime = createDubaiDateTime(dateStr, endHour, endMinute);

    const startLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const endLabel = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    // A slot is booked if there is any confirmed booking that overlaps with [startTime, endTime)
    const booking = bookings.find((b) => {
      if (b.status !== 'confirmed') return false;
      const bStart = typeof b.start_time === 'string' ? parseISO(b.start_time) : b.start_time;
      const bEnd = typeof b.end_time === 'string' ? parseISO(b.end_time) : b.end_time;

      // Overlap condition: max(startTime, bStart) < min(endTime, bEnd)
      return isBefore(startTime, bEnd) && isAfter(endTime, bStart);
    });

    const isPast = isBefore(endTime, now);

    slots.push({
      slotIndex: i,
      startTime,
      endTime,
      startLabel,
      endLabel,
      isBooked: !!booking,
      isPast,
      booking,
    });
  }

  return slots;
}

/**
 * Calculate the vertical % position of the "now" line between 08:00 and 20:00 Dubai time
 * Returns null if current time is outside 08:00-20:00 Dubai time
 */
export function getDubaiNowLinePercentage(selectedDateStr: string): number | null {
  const now = getNow();
  const todayDubaiStr = formatInDubai(now, 'yyyy-MM-dd');

  // Only show the live now line if the user is looking at today's schedule
  if (selectedDateStr !== todayDubaiStr) {
    return null;
  }

  const dayStart = createDubaiDateTime(selectedDateStr, 8, 0);  // 08:00 Dubai
  const dayEnd = createDubaiDateTime(selectedDateStr, 20, 0);    // 20:00 Dubai

  if (isBefore(now, dayStart) || isAfter(now, dayEnd)) {
    return null;
  }

  const totalDuration = dayEnd.getTime() - dayStart.getTime();
  const elapsed = now.getTime() - dayStart.getTime();
  const percentage = (elapsed / totalDuration) * 100;

  return Math.min(100, Math.max(0, percentage));
}

/**
 * Determine room status banner info:
 * "Available now" or "Occupied until HH:MM, free from HH:MM"
 */
export function computeRoomStatus(bookings: Booking[]): RoomStatusInfo {
  const now = getNow();
  const confirmed = bookings.filter((b) => b.status === 'confirmed');

  // Sort by start_time ascending
  const sorted = [...confirmed].sort((a, b) => {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  // Current active booking
  const currentBooking = sorted.find((b) => {
    const s = new Date(b.start_time);
    const e = new Date(b.end_time);
    return (isBefore(s, now) || isEqual(s, now)) && isAfter(e, now);
  });

  // Future bookings starting after now
  const upcomingBookings = sorted.filter((b) => {
    return isAfter(new Date(b.start_time), now);
  });

  const nextBooking = upcomingBookings[0] || null;

  if (currentBooking) {
    const occupiedUntilDubai = formatInDubai(currentBooking.end_time, 'HH:mm');
    // Check if there is an immediately contiguous meeting right after
    let freeFromDubai = occupiedUntilDubai;
    let curr = currentBooking;
    for (const b of upcomingBookings) {
      if (isEqual(new Date(b.start_time), new Date(curr.end_time))) {
        curr = b;
        freeFromDubai = formatInDubai(curr.end_time, 'HH:mm');
      } else {
        break;
      }
    }

    return {
      isAvailableNow: false,
      statusText: `Occupied until ${occupiedUntilDubai}, free from ${freeFromDubai}`,
      currentBooking,
      nextBooking,
      occupiedUntil: occupiedUntilDubai,
      freeFrom: freeFromDubai,
    };
  } else {
    // Room is available now!
    if (nextBooking) {
      const freeUntilDubai = formatInDubai(nextBooking.start_time, 'HH:mm');
      return {
        isAvailableNow: true,
        statusText: `Available now until ${freeUntilDubai}`,
        currentBooking: null,
        nextBooking,
        freeUntil: freeUntilDubai,
      };
    } else {
      return {
        isAvailableNow: true,
        statusText: 'Available now for remainder of day',
        currentBooking: null,
        nextBooking: null,
      };
    }
  }
}
