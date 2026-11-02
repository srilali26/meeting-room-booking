import crypto from 'crypto';
import { Booking, CreateBookingDTO, Room } from '@/types';
import { createServerClient } from './supabase/server';
import { formatInDubai, createDubaiDateTime } from './timezone';
import { parseISO, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';

// In-memory event hub for SSE realtime subscriptions when running local fallback
type Listener = (event: { type: 'INSERT' | 'UPDATE' | 'DELETE'; data: Booking }) => void;
const listeners = new Set<Listener>();

export function subscribeToRealtime(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function broadcastBookingChange(type: 'INSERT' | 'UPDATE' | 'DELETE', data: Booking) {
  listeners.forEach((listener) => {
    try {
      listener({ type, data });
    } catch (e) {
      console.error('Error dispatching realtime event', e);
    }
  });
}

// Initial seed rooms
const INITIAL_ROOMS: Room[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Meeting Room 1',
    location: 'Floor 1, Main Wing',
    capacity: 16,
    amenities: ['4K Dual Display', 'Video Conferencing Kit', 'Conference Phone', 'Digital Whiteboard', 'High-speed Wi-Fi'],
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Meeting Room 2',
    location: 'Floor 2, East Wing',
    capacity: 8,
    amenities: ['Touchscreen Smart Board', 'Video Conferencing', 'Modular Desks', 'Wireless Presentation'],
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Meeting Room 3',
    location: 'Floor 2, Quiet Zone',
    capacity: 4,
    amenities: ['Ultra-wide Monitor', 'Acoustic Soundproofing', 'Ergonomic Seating', 'High-speed Wi-Fi'],
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// Helper to seed today's sample bookings
function getInitialBookings(): Booking[] {
  const todayDubaiStr = formatInDubai(new Date(), 'yyyy-MM-dd');
  return [
    {
      id: 'aaaa1111-1111-1111-1111-111111111111',
      room_id: '11111111-1111-1111-1111-111111111111',
      title: 'Quarterly Strategy Alignment',
      organizer_name: 'Sarah Al Mansoor',
      organizer_email: 'sarah.mansoor@example.com',
      start_time: createDubaiDateTime(todayDubaiStr, 9, 0).toISOString(),
      end_time: createDubaiDateTime(todayDubaiStr, 10, 30).toISOString(),
      notes: 'Board members attending in-person, remote team joining via Webex.',
      cancel_token: 'token-sample-sarah-1',
      status: 'confirmed',
      created_at: new Date().toISOString(),
    },
    {
      id: 'aaaa2222-2222-2222-2222-222222222222',
      room_id: '11111111-1111-1111-1111-111111111111',
      title: 'Product Roadmap Sync',
      organizer_name: 'Tariq Mahmoud',
      organizer_email: 'tariq.m@example.com',
      start_time: createDubaiDateTime(todayDubaiStr, 14, 0).toISOString(),
      end_time: createDubaiDateTime(todayDubaiStr, 15, 30).toISOString(),
      notes: 'Q1 feature prioritisation and design reviews.',
      cancel_token: 'token-sample-tariq-2',
      status: 'confirmed',
      created_at: new Date().toISOString(),
    },
    {
      id: 'bbbb1111-1111-1111-1111-111111111111',
      room_id: '22222222-2222-2222-2222-222222222222',
      title: 'AI Architecture Sprint',
      organizer_name: 'Elena Rostova',
      organizer_email: 'elena.r@example.com',
      start_time: createDubaiDateTime(todayDubaiStr, 11, 0).toISOString(),
      end_time: createDubaiDateTime(todayDubaiStr, 13, 0).toISOString(),
      notes: 'Brainstorming session on real-time event pipeline.',
      cancel_token: 'token-sample-elena-3',
      status: 'confirmed',
      created_at: new Date().toISOString(),
    },
  ];
}

// Global state in globalThis to survive HMR during dev
const globalStore = globalThis as unknown as {
  _rooms?: Room[];
  _bookings?: Booking[];
};

if (!globalStore._rooms) {
  globalStore._rooms = [...INITIAL_ROOMS];
}
if (!globalStore._bookings) {
  globalStore._bookings = getInitialBookings();
}

export class BookingDatabase {
  private static isSupabaseConfigured(): boolean {
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  // --- Rooms ---
  static async getRooms(): Promise<Room[]> {
    if (this.isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const { data, error } = await supabase.from('rooms').select('*').order('name');
        if (!error && data) return data as Room[];
      }
    }
    return [...(globalStore._rooms || [])];
  }

  static async getRoomById(id: string): Promise<Room | null> {
    if (this.isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const { data, error } = await supabase.from('rooms').select('*').eq('id', id).single();
        if (!error && data) return data as Room;
      }
    }
    const room = (globalStore._rooms || []).find((r) => r.id === id);
    return room || null;
  }

  static async createRoom(roomData: Omit<Room, 'id' | 'created_at'>): Promise<Room> {
    const newRoom: Room = {
      ...roomData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (this.isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const { data, error } = await supabase.from('rooms').insert(newRoom).select().single();
        if (!error && data) return data as Room;
      }
    }

    globalStore._rooms?.push(newRoom);
    return newRoom;
  }

  static async updateRoom(id: string, updates: Partial<Room>): Promise<Room | null> {
    if (this.isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const { data, error } = await supabase.from('rooms').update(updates).eq('id', id).select().single();
        if (!error && data) return data as Room;
      }
    }

    const index = (globalStore._rooms || []).findIndex((r) => r.id === id);
    if (index === -1) return null;

    globalStore._rooms![index] = {
      ...globalStore._rooms![index],
      ...updates,
    };
    return globalStore._rooms![index];
  }

  // --- Bookings ---
  static async getBookings(roomId?: string, dateStr?: string): Promise<Booking[]> {
    if (this.isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        let query = supabase.from('bookings').select('*').order('start_time', { ascending: true });
        if (roomId) {
          query = query.eq('room_id', roomId);
        }
        if (dateStr) {
          // Find slots starting or ending on dateStr in Dubai
          const start = createDubaiDateTime(dateStr, 0, 0).toISOString();
          const end = createDubaiDateTime(dateStr, 23, 59).toISOString();
          query = query.gte('end_time', start).lte('start_time', end);
        }
        const { data, error } = await query;
        if (!error && data) return data as Booking[];
      }
    }

    let list = [...(globalStore._bookings || [])];
    if (roomId) {
      list = list.filter((b) => b.room_id === roomId);
    }
    if (dateStr) {
      const dayStart = createDubaiDateTime(dateStr, 0, 0);
      const dayEnd = createDubaiDateTime(dateStr, 23, 59);
      list = list.filter((b) => {
        const bStart = parseISO(b.start_time);
        const bEnd = parseISO(b.end_time);
        return isBefore(dayStart, bEnd) && isAfter(dayEnd, bStart);
      });
    }

    return list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  static async getBookingById(id: string): Promise<Booking | null> {
    if (this.isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
        if (!error && data) return data as Booking;
      }
    }
    return (globalStore._bookings || []).find((b) => b.id === id) || null;
  }

  static async getBookingByCancelToken(token: string): Promise<Booking | null> {
    if (this.isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const { data, error } = await supabase.from('bookings').select('*').eq('cancel_token', token).single();
        if (!error && data) return data as Booking;
      }
    }
    return (globalStore._bookings || []).find((b) => b.cancel_token === token) || null;
  }

  /**
   * Insert a new booking enforcing overlap constraints (matching Postgres EXCLUDE USING gist)
   */
  static async createBooking(dto: CreateBookingDTO): Promise<Booking> {
    const newStart = parseISO(dto.start_time);
    const newEnd = parseISO(dto.end_time);

    // If Supabase is connected, execute directly in Postgres (triggering exclusion constraint)
    if (this.isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const cancelToken = crypto.randomBytes(16).toString('hex');
        const { data, error } = await supabase
          .from('bookings')
          .insert({
            room_id: dto.room_id,
            title: dto.title,
            organizer_name: dto.organizer_name,
            organizer_email: dto.organizer_email,
            start_time: dto.start_time,
            end_time: dto.end_time,
            notes: dto.notes || null,
            cancel_token: cancelToken,
            status: 'confirmed',
          })
          .select()
          .single();

        if (error) {
          // Postgres exclusion violation error code 23P01
          if (error.code === '23P01' || error.message.includes('overlapping') || error.message.includes('exclude')) {
            const err = new Error('This slot was just taken, please pick another');
            (err as any).code = '23P01';
            throw err;
          }
          throw new Error(error.message);
        }

        const created = data as Booking;
        broadcastBookingChange('INSERT', created);
        return created;
      }
    }

    // High-fidelity local database engine with exclusion constraint check
    const existingConfirmed = (globalStore._bookings || []).filter(
      (b) => b.room_id === dto.room_id && b.status === 'confirmed'
    );

    // Overlap check: start < existing.end AND end > existing.start
    const hasOverlap = existingConfirmed.some((b) => {
      const bStart = parseISO(b.start_time);
      const bEnd = parseISO(b.end_time);
      return isBefore(newStart, bEnd) && isAfter(newEnd, bStart);
    });

    if (hasOverlap) {
      const err = new Error('This slot was just taken, please pick another');
      (err as any).code = '23P01';
      throw err;
    }

    const cancelToken = crypto.randomBytes(16).toString('hex');
    const newBooking: Booking = {
      id: crypto.randomUUID(),
      room_id: dto.room_id,
      title: dto.title,
      organizer_name: dto.organizer_name,
      organizer_email: dto.organizer_email,
      start_time: dto.start_time,
      end_time: dto.end_time,
      notes: dto.notes || null,
      cancel_token: cancelToken,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    };

    globalStore._bookings?.push(newBooking);
    broadcastBookingChange('INSERT', newBooking);

    return newBooking;
  }

  /**
   * Cancel booking using secret cancel_token
   */
  static async cancelBookingByToken(token: string): Promise<Booking> {
    if (this.isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('cancel_token', token)
          .select()
          .single();

        if (error || !data) {
          throw new Error('Invalid cancellation token or booking not found');
        }
        const updated = data as Booking;
        broadcastBookingChange('UPDATE', updated);
        return updated;
      }
    }

    const booking = (globalStore._bookings || []).find((b) => b.cancel_token === token);
    if (!booking) {
      throw new Error('Invalid cancellation token or booking not found');
    }

    booking.status = 'cancelled';
    broadcastBookingChange('UPDATE', booking);
    return booking;
  }

  /**
   * Cancel booking by ID (Admin action)
   */
  static async cancelBookingById(id: string): Promise<Booking> {
    if (this.isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', id)
          .select()
          .single();

        if (error || !data) {
          throw new Error('Booking not found');
        }
        const updated = data as Booking;
        broadcastBookingChange('UPDATE', updated);
        return updated;
      }
    }

    const booking = (globalStore._bookings || []).find((b) => b.id === id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    booking.status = 'cancelled';
    broadcastBookingChange('UPDATE', booking);
    return booking;
  }

  /**
   * Get Admin analytics & statistics
   */
  static async getAdminStats() {
    const rooms = await this.getRooms();
    const todayStr = formatInDubai(new Date(), 'yyyy-MM-dd');
    const allBookings = await this.getBookings();

    const todayBookings = allBookings.filter((b) => {
      const bDay = formatInDubai(b.start_time, 'yyyy-MM-dd');
      return bDay === todayStr && b.status === 'confirmed';
    });

    // Room utilization stats
    const roomBookingCounts: Record<string, number> = {};
    const roomHoursBookedToday: Record<string, number> = {};

    rooms.forEach((r) => {
      roomBookingCounts[r.id] = 0;
      roomHoursBookedToday[r.id] = 0;
    });

    allBookings.forEach((b) => {
      if (b.status === 'confirmed') {
        roomBookingCounts[b.room_id] = (roomBookingCounts[b.room_id] || 0) + 1;
      }
    });

    todayBookings.forEach((b) => {
      const s = parseISO(b.start_time);
      const e = parseISO(b.end_time);
      const hours = (e.getTime() - s.getTime()) / (1000 * 60 * 60);
      roomHoursBookedToday[b.room_id] = (roomHoursBookedToday[b.room_id] || 0) + hours;
    });

    const activeRooms = rooms.filter((r) => r.is_active);
    const totalAvailableHoursToday = activeRooms.length * 12; // 08:00 to 20:00 = 12h
    const totalHoursBookedToday = Object.values(roomHoursBookedToday).reduce((acc, h) => acc + h, 0);

    const utilizationPercentage =
      totalAvailableHoursToday > 0 ? Math.min(100, Math.round((totalHoursBookedToday / totalAvailableHoursToday) * 100)) : 0;

    const mostUsedRooms = [...rooms]
      .map((r) => ({
        room: r,
        totalBookings: roomBookingCounts[r.id] || 0,
        hoursToday: roomHoursBookedToday[r.id] || 0,
      }))
      .sort((a, b) => b.totalBookings - a.totalBookings);

    return {
      totalRooms: rooms.length,
      activeRooms: activeRooms.length,
      bookingsToday: todayBookings.length,
      totalHoursBookedToday: Math.round(totalHoursBookedToday * 10) / 10,
      utilizationPercentage,
      mostUsedRooms,
    };
  }
}
