import { NextResponse } from 'next/server';
import { BookingDatabase } from '@/lib/db';
import { z } from 'zod';

const cancelSchema = z.object({
  token: z.string().optional(),
  booking_id: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Cancellation token required' }, { status: 400 });
    }

    const booking = await BookingDatabase.getBookingByCancelToken(token);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found or invalid token' }, { status: 404 });
    }

    const room = await BookingDatabase.getRoomById(booking.room_id);

    return NextResponse.json({ booking, room });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = cancelSchema.parse(body);

    if (validated.token) {
      const cancelled = await BookingDatabase.cancelBookingByToken(validated.token);
      return NextResponse.json({ success: true, booking: cancelled });
    }

    if (validated.booking_id) {
      const cancelled = await BookingDatabase.cancelBookingById(validated.booking_id);
      return NextResponse.json({ success: true, booking: cancelled });
    }

    return NextResponse.json({ error: 'Either token or booking_id is required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
