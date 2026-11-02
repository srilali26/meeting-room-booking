import { z } from 'zod';
import { isAfter, isBefore, parseISO, differenceInMinutes } from 'date-fns';
import { formatInDubai } from './timezone';

export const bookingFormSchema = z
  .object({
    room_id: z.string().uuid({ message: 'Invalid room ID' }),
    title: z.string().min(2, { message: 'Meeting title must be at least 2 characters' }).max(100),
    organizer_name: z.string().min(2, { message: 'Organizer name must be at least 2 characters' }).max(100),
    organizer_email: z.string().email({ message: 'Please enter a valid email address' }),
    start_time: z.string().datetime({ offset: true, message: 'Invalid start time' }),
    end_time: z.string().datetime({ offset: true, message: 'Invalid end time' }),
    notes: z.string().max(500, { message: 'Notes cannot exceed 500 characters' }).optional().nullable(),
  })
  .refine(
    (data) => {
      const start = parseISO(data.start_time);
      const end = parseISO(data.end_time);
      return isAfter(end, start);
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    }
  )
  .refine(
    (data) => {
      const start = parseISO(data.start_time);
      const end = parseISO(data.end_time);
      const durationMinutes = differenceInMinutes(end, start);
      return durationMinutes <= 240; // Max 4 hours
    },
    {
      message: 'Booking duration cannot exceed 4 hours',
      path: ['end_time'],
    }
  )
  .refine(
    (data) => {
      const start = parseISO(data.start_time);
      const end = parseISO(data.end_time);
      const durationMinutes = differenceInMinutes(end, start);
      return durationMinutes >= 15; // Min 15 minutes
    },
    {
      message: 'Booking duration must be at least 15 minutes',
      path: ['end_time'],
    }
  )
  .refine(
    (data) => {
      const start = parseISO(data.start_time);
      // Allow 2-minute buffer for network latency
      const nowWithBuffer = new Date(Date.now() - 2 * 60 * 1000);
      return isAfter(start, nowWithBuffer);
    },
    {
      message: 'Cannot book meetings in the past',
      path: ['start_time'],
    }
  )
  .refine(
    (data) => {
      // Must be between 08:00 and 20:00 Dubai time
      const startHourDubai = parseInt(formatInDubai(data.start_time, 'H'), 10);
      const endHourDubai = parseInt(formatInDubai(data.end_time, 'H'), 10);
      const endMinDubai = parseInt(formatInDubai(data.end_time, 'm'), 10);

      const isStartValid = startHourDubai >= 8 && startHourDubai < 20;
      // End can be up to 20:00
      const isEndValid = (endHourDubai < 20) || (endHourDubai === 20 && endMinDubai === 0);

      return isStartValid && isEndValid;
    },
    {
      message: 'Bookings are only permitted within 08:00 to 20:00 Dubai time',
      path: ['start_time'],
    }
  );

export type BookingFormData = z.infer<typeof bookingFormSchema>;

export const cancelBookingSchema = z.object({
  token: z.string().min(5, { message: 'Cancellation token is required' }),
});
