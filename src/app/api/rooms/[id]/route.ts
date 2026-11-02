import { NextResponse } from 'next/server';
import { BookingDatabase } from '@/lib/db';
import { z } from 'zod';

const updateRoomSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().min(2).optional(),
  capacity: z.number().int().positive().optional(),
  amenities: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const room = await BookingDatabase.getRoomById(params.id);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    return NextResponse.json({ room });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = updateRoomSchema.parse(body);
    const updated = await BookingDatabase.updateRoom(params.id, validated);
    if (!updated) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    return NextResponse.json({ room: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
