'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Room, Booking } from '@/types';
import { formatInDubai } from '@/lib/timezone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LiveIndicator } from '@/components/LiveIndicator';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import QRCode from 'qrcode';
import {
  DoorClosed,
  Calendar,
  BarChart3,
  Plus,
  QrCode,
  Download,
  Printer,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ExternalLink,
  LogOut,
  Users,
  MapPin,
  Clock,
  Edit,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface AdminClientViewProps {
  initialRooms: Room[];
  initialBookings: Booking[];
}

export function AdminClientView({ initialRooms, initialBookings }: AdminClientViewProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [activeTab, setActiveTab] = useState<'rooms' | 'bookings' | 'analytics'>('rooms');

  // QR Modal State
  const [qrModalRoom, setQrModalRoom] = useState<Room | null>(null);
  const [qrPngUrl, setQrPngUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');

  // Create/Edit Room Modal State
  const [roomModalMode, setRoomModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomFormName, setRoomFormName] = useState('');
  const [roomFormLocation, setRoomFormLocation] = useState('');
  const [roomFormCapacity, setRoomFormCapacity] = useState(8);
  const [roomFormAmenities, setRoomFormAmenities] = useState('');
  const [isRoomSubmitting, setIsRoomSubmitting] = useState(false);

  // Bookings Filter State
  const [filterRoomId, setFilterRoomId] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Realtime hook
  const handleBookingRealtimeChange = useCallback(
    (booking: Booking, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
      setBookings((prev) => {
        if (eventType === 'INSERT') {
          if (prev.some((b) => b.id === booking.id)) return prev;
          return [booking, ...prev];
        } else if (eventType === 'UPDATE') {
          return prev.map((b) => (b.id === booking.id ? booking : b));
        } else if (eventType === 'DELETE') {
          return prev.filter((b) => b.id !== booking.id);
        }
        return prev;
      });
    },
    []
  );

  const { status: realtimeStatus } = useRealtimeBookings({
    onBookingChange: handleBookingRealtimeChange,
  });

  // Verify authentication on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('admin_session');
      if (!session) {
        router.push('/admin/login');
      }
    }
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_session');
      document.cookie = 'admin_session=; path=/; max-age=0';
    }
    router.push('/admin/login');
  };

  // QR Code Generation
  const handleOpenQrModal = async (room: Room) => {
    setQrModalRoom(room);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const roomUrl = `${origin}/room/${room.id}`;

    const png = await QRCode.toDataURL(roomUrl, {
      width: 450,
      margin: 2,
      errorCorrectionLevel: 'H',
    });
    setQrPngUrl(png);

    const svg = await QRCode.toString(roomUrl, {
      type: 'svg',
      width: 450,
      margin: 2,
      errorCorrectionLevel: 'H',
    });
    setQrSvgString(svg);
  };

  const downloadQrPng = () => {
    if (!qrModalRoom || !qrPngUrl) return;
    const a = document.createElement('a');
    a.href = qrPngUrl;
    a.download = `qr-${qrModalRoom.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const downloadQrSvg = () => {
    if (!qrModalRoom || !qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${qrModalRoom.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Toggle Room Active Status
  const toggleRoomStatus = async (room: Room) => {
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !room.is_active }),
      });
      if (res.ok) {
        setRooms((prev) =>
          prev.map((r) => (r.id === room.id ? { ...r, is_active: !r.is_active } : r))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Room Modal
  const openCreateRoomModal = () => {
    setRoomModalMode('create');
    setEditingRoom(null);
    setRoomFormName('');
    setRoomFormLocation('');
    setRoomFormCapacity(8);
    setRoomFormAmenities('4K Display, Video Conference, Whiteboard');
  };

  const openEditRoomModal = (room: Room) => {
    setRoomModalMode('edit');
    setEditingRoom(room);
    setRoomFormName(room.name);
    setRoomFormLocation(room.location);
    setRoomFormCapacity(room.capacity);
    setRoomFormAmenities(room.amenities.join(', '));
  };

  // Save Room (Create / Update)
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRoomSubmitting(true);

    const amenitiesArray = roomFormAmenities
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      if (roomModalMode === 'create') {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roomFormName,
            location: roomFormLocation,
            capacity: Number(roomFormCapacity),
            amenities: amenitiesArray,
            is_active: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setRooms((prev) => [...prev, data.room]);
          setRoomModalMode(null);
        }
      } else if (roomModalMode === 'edit' && editingRoom) {
        const res = await fetch(`/api/rooms/${editingRoom.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roomFormName,
            location: roomFormLocation,
            capacity: Number(roomFormCapacity),
            amenities: amenitiesArray,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setRooms((prev) => prev.map((r) => (r.id === data.room.id ? data.room : r)));
          setRoomModalMode(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRoomSubmitting(false);
    }
  };

  // Cancel Booking (Admin Action)
  const handleAdminCancelBooking = async (bookingId: string) => {
    if (!confirm('Cancel this booking immediately? The slot will be freed in real-time.')) {
      return;
    }
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (filterRoomId !== 'all' && b.room_id !== filterRoomId) return false;
      if (filterStatus !== 'all' && b.status !== filterStatus) return false;
      if (filterSearch) {
        const term = filterSearch.toLowerCase();
        const matchesTitle = b.title.toLowerCase().includes(term);
        const matchesName = b.organizer_name.toLowerCase().includes(term);
        const matchesEmail = b.organizer_email.toLowerCase().includes(term);
        if (!matchesTitle && !matchesName && !matchesEmail) return false;
      }
      return true;
    });
  }, [bookings, filterRoomId, filterStatus, filterSearch]);

  // Analytics Computation
  const stats = useMemo(() => {
    const todayDubaiStr = formatInDubai(new Date(), 'yyyy-MM-dd');
    const todayBookings = bookings.filter((b) => {
      const bDay = formatInDubai(b.start_time, 'yyyy-MM-dd');
      return bDay === todayDubaiStr && b.status === 'confirmed';
    });

    const activeRooms = rooms.filter((r) => r.is_active);
    const totalAvailableHours = activeRooms.length * 12; // 08:00 to 20:00

    let totalHoursBooked = 0;
    const roomCounts: Record<string, number> = {};

    rooms.forEach((r) => {
      roomCounts[r.id] = 0;
    });

    bookings.forEach((b) => {
      if (b.status === 'confirmed') {
        roomCounts[b.room_id] = (roomCounts[b.room_id] || 0) + 1;
      }
    });

    todayBookings.forEach((b) => {
      const s = new Date(b.start_time).getTime();
      const e = new Date(b.end_time).getTime();
      const hours = (e - s) / (1000 * 60 * 60);
      totalHoursBooked += hours;
    });

    const utilization =
      totalAvailableHours > 0
        ? Math.min(100, Math.round((totalHoursBooked / totalAvailableHours) * 100))
        : 0;

    const rankedRooms = [...rooms]
      .map((r) => ({
        room: r,
        count: roomCounts[r.id] || 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      todayCount: todayBookings.length,
      totalHoursBooked: Math.round(totalHoursBooked * 10) / 10,
      utilization,
      rankedRooms,
    };
  }, [rooms, bookings]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans">
      {/* Admin Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                <DoorClosed className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                Admin Console
              </span>
            </Link>
            <div className="ml-4 pl-4 border-l border-slate-200 dark:border-slate-800">
              <LiveIndicator status={realtimeStatus} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"
            >
              Public App View
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'rooms'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <DoorClosed className="w-4 h-4" />
            <span>Rooms ({rooms.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'bookings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>All Bookings ({bookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Stats &amp; Utilization</span>
          </button>
        </div>

        {/* TAB 1: ROOMS MANAGEMENT */}
        {activeTab === 'rooms' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Meeting Rooms
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage active rooms, print QR signs, and customize equipment.
                </p>
              </div>
              <Button onClick={openCreateRoomModal} className="gap-2 self-start sm:self-auto font-bold">
                <Plus className="w-4 h-4" /> Add New Room
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <Card key={room.id} className="overflow-hidden flex flex-col justify-between shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg font-bold">{room.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{room.location}</span>
                        </CardDescription>
                      </div>
                      <Badge variant={room.is_active ? 'success' : 'destructive'}>
                        {room.is_active ? 'Active' : 'Deactivated'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-4">
                    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Capacity: {room.capacity}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {room.amenities.map((a, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-medium"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </CardContent>

                  <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1.5"
                        onClick={() => handleOpenQrModal(room)}
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-600" />
                        <span>QR Code</span>
                      </Button>
                      <Link href={`/room/${room.id}/print`} target="_blank">
                        <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
                          <Printer className="w-3.5 h-3.5" />
                          <span>Sign</span>
                        </Button>
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 px-2"
                        onClick={() => openEditRoomModal(room)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant={room.is_active ? 'secondary' : 'default'}
                        className="text-xs h-8"
                        onClick={() => toggleRoomStatus(room)}
                      >
                        {room.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: ALL BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Bookings Master List
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Realtime database view. Cancel any reservation with admin override.
              </p>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    placeholder="Search title, name, email..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                {/* Room Filter */}
                <select
                  value={filterRoomId}
                  onChange={(e) => setFilterRoomId(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Meeting Rooms</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium self-end md:self-center">
                Showing {filteredBookings.length} bookings
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Room</th>
                      <th className="py-3.5 px-4">Meeting Title</th>
                      <th className="py-3.5 px-4">Date &amp; Time (Dubai)</th>
                      <th className="py-3.5 px-4">Organizer</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No matching bookings found.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => {
                        const room = rooms.find((r) => r.id === b.room_id);
                        const dateStr = formatInDubai(b.start_time, 'MMM d, yyyy');
                        const sTime = formatInDubai(b.start_time, 'HH:mm');
                        const eTime = formatInDubai(b.end_time, 'HH:mm');

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                              {room ? room.name : 'Unknown Room'}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {b.title}
                              </div>
                              {b.notes && (
                                <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                  {b.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              <div className="font-semibold text-slate-700 dark:text-slate-300">
                                {dateStr}
                              </div>
                              <div className="text-[11px] text-blue-600 dark:text-blue-400">
                                {sTime} – {eTime}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {b.organizer_name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {b.organizer_email}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant={b.status === 'confirmed' ? 'success' : 'destructive'}>
                                {b.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {b.status === 'confirmed' && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 text-xs px-2.5 gap-1"
                                  onClick={() => handleAdminCancelBooking(b.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Cancel</span>
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STATS & UTILIZATION */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Performance &amp; Utilization Analytics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time usage metrics calculated based on 08:00–20:00 operational window in Dubai.
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Bookings Today
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  {stats.todayCount}
                </div>
                <p className="text-xs text-slate-400 mt-1">Confirmed reservations today</p>
              </Card>

              <Card className="p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Hours Booked Today
                </div>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
                  {stats.totalHoursBooked} hrs
                </div>
                <p className="text-xs text-slate-400 mt-1">Total occupied meeting time</p>
              </Card>

              <Card className="p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Room Utilization %
                </div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  {stats.utilization}%
                </div>
                <p className="text-xs text-slate-400 mt-1">Of available 12h schedule</p>
              </Card>

              <Card className="p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Rooms
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  {rooms.filter((r) => r.is_active).length} / {rooms.length}
                </div>
                <p className="text-xs text-slate-400 mt-1">Available for reservations</p>
              </Card>
            </div>

            {/* Most Used Rooms Ranking */}
            <Card className="p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
                Most-Used Rooms Ranking
              </h3>
              <div className="space-y-4">
                {stats.rankedRooms.map(({ room, count }, idx) => {
                  const maxCount = Math.max(...stats.rankedRooms.map((r) => r.count), 1);
                  const percentage = Math.round((count / maxCount) * 100);

                  return (
                    <div key={room.id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          {room.name}
                        </span>
                        <span className="font-semibold text-slate-500">
                          {count} bookings
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* QR PREVIEW & DOWNLOAD MODAL */}
      {qrModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {qrModalRoom.name} QR Code
              </h3>
              <button
                onClick={() => setQrModalRoom(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl border-2 border-slate-900 shadow-inner inline-block my-2">
              {qrPngUrl && (
                <img
                  src={qrPngUrl}
                  alt="QR Code"
                  className="w-56 h-56 object-contain"
                />
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-mono break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/room/${qrModalRoom.id}` : ''}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={downloadQrPng} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> Download PNG
                </Button>
                <Button variant="outline" size="sm" onClick={downloadQrSvg} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> Download SVG
                </Button>
              </div>

              <Link href={`/room/${qrModalRoom.id}/print`} target="_blank">
                <Button variant="default" size="sm" className="w-full gap-2 text-xs font-bold">
                  <Printer className="w-3.5 h-3.5" />
                  <span>Open Printable A4 Sign</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ROOM MODAL */}
      {roomModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {roomModalMode === 'create' ? 'Add New Meeting Room' : 'Edit Meeting Room'}
              </h3>
              <button
                onClick={() => setRoomModalMode(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Room Name
                </label>
                <Input
                  required
                  placeholder="e.g. Marina Boardroom"
                  value={roomFormName}
                  onChange={(e) => setRoomFormName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Location / Floor
                </label>
                <Input
                  required
                  placeholder="e.g. Floor 12, South Wing"
                  value={roomFormLocation}
                  onChange={(e) => setRoomFormLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Capacity (People)
                </label>
                <Input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={roomFormCapacity}
                  onChange={(e) => setRoomFormCapacity(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Amenities (comma-separated)
                </label>
                <Input
                  placeholder="4K Display, Webex, Whiteboard"
                  value={roomFormAmenities}
                  onChange={(e) => setRoomFormAmenities(e.target.value)}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRoomModalMode(null)}
                  disabled={isRoomSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="default" disabled={isRoomSubmitting}>
                  {isRoomSubmitting ? 'Saving...' : roomModalMode === 'create' ? 'Create Room' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
