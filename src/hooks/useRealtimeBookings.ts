'use client';

import { useEffect, useState, useRef } from 'react';
import { Booking } from '@/types';
import { createClient } from '@/lib/supabase/client';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

interface UseRealtimeBookingsOptions {
  roomId?: string;
  onBookingChange?: (booking: Booking, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
}

export function useRealtimeBookings({ roomId, onBookingChange }: UseRealtimeBookingsOptions = {}) {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const callbackRef = useRef(onBookingChange);
  callbackRef.current = onBookingChange;

  useEffect(() => {
    let sseSource: EventSource | null = null;
    let supabaseChannel: any = null;
    let isSubscribed = true;
    let retryTimeout: NodeJS.Timeout | null = null;

    // 1. Try Supabase Realtime if configured
    const supabase = createClient();
    if (supabase) {
      try {
        const channelName = roomId ? `room-${roomId}` : 'all-rooms';
        supabaseChannel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'bookings',
              filter: roomId ? `room_id=eq.${roomId}` : undefined,
            },
            (payload) => {
              const newBooking = (payload.new || payload.old) as Booking;
              if (callbackRef.current) {
                callbackRef.current(newBooking, payload.eventType as any);
              }
            }
          )
          .subscribe((channelStatus) => {
            if (channelStatus === 'SUBSCRIBED') {
              setStatus('connected');
            } else if (channelStatus === 'CLOSED' || channelStatus === 'CHANNEL_ERROR') {
              setStatus('disconnected');
            }
          });
      } catch (err) {
        console.warn('Supabase realtime init error, falling back to SSE:', err);
      }
    }

    // 2. High-reliability SSE stream connection (works universally in all environments)
    function connectSSE() {
      if (!isSubscribed) return;
      try {
        sseSource = new EventSource('/api/realtime');

        sseSource.onopen = () => {
          if (isSubscribed) setStatus('connected');
        };

        sseSource.onmessage = (event) => {
          if (!isSubscribed || !event.data) return;
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.data) {
              const booking = parsed.data as Booking;
              if (!roomId || booking.room_id === roomId) {
                if (callbackRef.current) {
                  callbackRef.current(booking, parsed.type);
                }
              }
            }
          } catch (e) {
            // Heartbeats or parse errors
          }
        };

        sseSource.onerror = () => {
          if (!isSubscribed) return;
          setStatus('disconnected');
          if (sseSource) {
            sseSource.close();
            sseSource = null;
          }
          // Auto-reconnect after 3 seconds
          retryTimeout = setTimeout(() => {
            if (isSubscribed) {
              setStatus('connecting');
              connectSSE();
            }
          }, 3000);
        };
      } catch (e) {
        console.error('SSE initialization error:', e);
        setStatus('disconnected');
      }
    }

    connectSSE();

    return () => {
      isSubscribed = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (sseSource) {
        sseSource.close();
      }
      if (supabaseChannel && supabase) {
        supabase.removeChannel(supabaseChannel);
      }
    };
  }, [roomId]);

  return { status };
}
