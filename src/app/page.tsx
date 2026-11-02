import Link from 'next/link';
import { BookingDatabase } from '@/lib/db';
import { Navbar } from '@/components/Navbar';
import { computeRoomStatus } from '@/lib/timezone';
import { Users, MapPin, Clock, ArrowRight, QrCode, Monitor, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [rooms, allBookings] = await Promise.all([
    BookingDatabase.getRooms(),
    BookingDatabase.getBookings(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar rooms={rooms} />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-time QR Room Reservation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Meeting Rooms &bull; Dubai HQ
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Scan a room’s permanent QR sign or select a room below to view today’s live timeline and reserve a slot in seconds. No login required.
          </p>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const roomBookings = allBookings.filter((b) => b.room_id === room.id);
            const statusInfo = computeRoomStatus(roomBookings);
            const isAvailable = statusInfo.isAvailableNow;

            return (
              <div
                key={room.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  {/* Status Pill */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <Badge variant={isAvailable ? 'success' : 'destructive'} className="text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
                      {isAvailable ? 'Available Now' : 'Occupied'}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-400">
                      Capacity: {room.capacity}
                    </span>
                  </div>

                  {/* Room Name */}
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {room.name}
                  </h2>

                  <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {room.location}
                  </p>

                  {/* Status Banner */}
                  <div
                    className={`mt-4 p-3 rounded-xl border text-xs font-medium ${
                      isAvailable
                        ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300'
                        : 'bg-red-50/60 border-red-200/80 text-red-800 dark:bg-red-950/20 dark:border-red-800/40 dark:text-red-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                    <span>{statusInfo.statusText}</span>
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1 mt-4">
                    {room.amenities.map((a, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/room/${room.id}/print`}
                      target="_blank"
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Print QR Sign"
                    >
                      <QrCode className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/room/${room.id}/display`}
                      target="_blank"
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Open Tablet Display"
                    >
                      <Monitor className="w-4 h-4" />
                    </Link>
                  </div>

                  <Link href={`/room/${room.id}`}>
                    <Button size="sm" variant="default" className="text-xs gap-1.5 font-bold">
                      <span>View Schedule</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        Meeting Room Real-time System &bull; Asia/Dubai Timezone (UTC+4) &bull; Supabase &amp; Next.js App Router
      </footer>
    </div>
  );
}
