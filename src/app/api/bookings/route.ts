import { NextResponse } from 'next/server';
import { BookingDatabase } from '@/lib/db';
import { bookingFormSchema } from '@/lib/validation';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { z } from 'zod';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('room_id') || undefined;
    const date = searchParams.get('date') || undefined;

    const bookings = await BookingDatabase.getBookings(roomId, date);
    return NextResponse.json({ bookings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = bookingFormSchema.parse(body);

    const room = await BookingDatabase.getRoomById(validated.room_id);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    if (!room.is_active) {
      return NextResponse.json({ error: 'This room is currently inactive and cannot be booked' }, { status: 400 });
    }

    const booking = await BookingDatabase.createBooking({
      room_id: validated.room_id,
      title: validated.title,
      organizer_name: validated.organizer_name,
      organizer_email: validated.organizer_email,
      start_time: validated.start_time,
      end_time: validated.end_time,
      notes: validated.notes || undefined,
    });

    // Fire email confirmation in background
    sendBookingConfirmationEmail({ booking, room }).catch((err) => {
      console.error('Failed to dispatch confirmation email:', err);
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: err.errors[0]?.message || 'Validation error',
          details: err.errors,
        },
        { status: 400 }
      );
    }

    // Overlap collision error from Postgres exclusion constraint or local DB check
    if (
      err.code === '23P01' ||
      err.message?.includes('just taken') ||
      err.message?.includes('overlap') ||
      err.message?.includes('conflict')
    ) {
      return NextResponse.json(
        {
          error: 'This slot was just taken, please pick another',
          code: 'OVERLAP_CONFLICT',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
