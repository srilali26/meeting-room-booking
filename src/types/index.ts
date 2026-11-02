export interface Room {
  id: string;
  name: string;
  location: string;
  capacity: number;
  amenities: string[];
  is_active: boolean;
  created_at: string;
}

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  room_id: string;
  title: string;
  organizer_name: string;
  organizer_email: string;
  start_time: string; // ISO 8601 UTC
  end_time: string;   // ISO 8601 UTC
  notes?: string | null;
  cancel_token: string;
  status: BookingStatus;
  created_at: string;
}

export interface CreateBookingDTO {
  room_id: string;
  title: string;
  organizer_name: string;
  organizer_email: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  notes?: string;
}

export interface TimelineSlot {
  slotIndex: number;
  startTime: Date;
  endTime: Date;
  startLabel: string; // "08:00"
  endLabel: string;   // "08:30"
  isBooked: boolean;
  isPast: boolean;
  booking?: Booking;
}

export interface RoomStatusInfo {
  isAvailableNow: boolean;
  statusText: string;
  currentBooking?: Booking | null;
  nextBooking?: Booking | null;
  freeUntil?: string | null;
  occupiedUntil?: string | null;
  freeFrom?: string | null;
}
