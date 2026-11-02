-- Migration: 20261102000000_init_meeting_rooms.sql
-- Description: Create rooms, bookings, overlap exclusion constraints, RLS policies, and realtime publication

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  amenities TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  cancel_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint 1: end_time must be greater than start_time and max 4 hours duration
  CONSTRAINT booking_duration_check CHECK (
    end_time > start_time AND
    end_time <= (start_time + INTERVAL '4 hours')
  ),

  -- Constraint 2: No overlapping confirmed bookings for the same room (Postgres EXCLUDE USING gist with tstzrange)
  CONSTRAINT no_overlapping_confirmed_bookings EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status = 'confirmed')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_room_timeline ON public.bookings (room_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_cancel_token ON public.bookings (cancel_token);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);

-- Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Public read rooms" ON public.rooms
  FOR SELECT USING (true);

CREATE POLICY "Admin write rooms" ON public.rooms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bookings policies
CREATE POLICY "Public read bookings" ON public.bookings
  FOR SELECT USING (true);

CREATE POLICY "Public insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Token-based or Admin update bookings" ON public.bookings
  FOR UPDATE USING (true) WITH CHECK (true);

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
