import { notFound } from 'next/navigation';
import { BookingDatabase } from '@/lib/db';
import { RoomClientView } from './RoomClientView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function RoomPage({ params }: PageProps) {
  const room = await BookingDatabase.getRoomById(params.id);

  if (!room) {
    notFound();
  }

  const [bookings, allRooms] = await Promise.all([
    BookingDatabase.getBookings(room.id),
    BookingDatabase.getRooms(),
  ]);

  return (
    <RoomClientView
      initialRoom={room}
      initialBookings={bookings}
      allRooms={allRooms}
    />
  );
}
