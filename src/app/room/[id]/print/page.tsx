import { notFound } from 'next/navigation';
import { BookingDatabase } from '@/lib/db';
import { PrintClientView } from './PrintClientView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PrintRoomPage({ params }: PageProps) {
  const room = await BookingDatabase.getRoomById(params.id);

  if (!room) {
    notFound();
  }

  return <PrintClientView room={room} />;
}
