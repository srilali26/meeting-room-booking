import { notFound } from 'next/navigation';
import { BookingDatabase } from '@/lib/db';
import { DisplayClientView } from './DisplayClientView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function DisplayPage({ params }: PageProps) {
  const room = await BookingDatabase.getRoomById(params.id);

  if (!room) {
    notFound();
  }

  const bookings = await BookingDatabase.getBookings(room.id);

  return <DisplayClientView room={room} initialBookings={bookings} />;
}
