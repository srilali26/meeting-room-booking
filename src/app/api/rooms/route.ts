import { NextResponse } from 'next/server';
import { BookingDatabase } from '@/lib/db';
import { z } from 'zod';

const createRoomSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  capacity: z.number().int().positive(),
  amenities: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

export async function GET() {
  try {
    const rooms = await BookingDatabase.getRooms();
    return NextResponse.json({ rooms });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = createRoomSchema.parse(body);
    const room = await BookingDatabase.createRoom(validated);
    return NextResponse.json({ room }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
