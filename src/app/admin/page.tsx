import { BookingDatabase } from '@/lib/db';
import { AdminClientView } from './AdminClientView';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [rooms, bookings] = await Promise.all([
    BookingDatabase.getRooms(),
    BookingDatabase.getBookings(),
  ]);

  return <AdminClientView initialRooms={rooms} initialBookings={bookings} />;
}
