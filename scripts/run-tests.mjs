// Automated Test Suite for Meeting Room Booking
// Tests:
// 1. Overlap Prevention (Database-level exclusion constraint simulation)
// 2. Past-Booking Rejection
// 3. Realtime Updates & Secret Token Cancellation

import assert from 'node:assert';
import { addMinutes, subHours, addHours, addDays } from 'date-fns';

console.log('------------------------------------------------------------');
console.log('🧪 Starting Automated Test Suite: Meeting Room Booking');
console.log('------------------------------------------------------------\n');

// Dynamic import compiled modules or test logic
async function runTests() {
  let passed = 0;
  let failed = 0;

  const testRoomId = '11111111-1111-1111-1111-111111111111';

  // TEST 1: Overlap Prevention
  console.log('▶ TEST 1: Overlap Prevention (Exclusion Constraint)');
  try {
    const { BookingDatabase } = await import('../src/lib/db.ts');
    const { createDubaiDateTime, formatInDubai } = await import('../src/lib/timezone.ts');

    const tomorrowDubai = formatInDubai(addDays(new Date(), 1), 'yyyy-MM-dd');
    const slotStart = createDubaiDateTime(tomorrowDubai, 10, 0).toISOString();
    const slotEnd = createDubaiDateTime(tomorrowDubai, 11, 30).toISOString();

    // First booking
    const booking1 = await BookingDatabase.createBooking({
      room_id: testRoomId,
      title: 'Primary Team Sync',
      organizer_name: 'Alice Johnson',
      organizer_email: 'alice@example.com',
      start_time: slotStart,
      end_time: slotEnd,
    });
    assert(booking1.id, 'Booking 1 should be created with an ID');
    assert.strictEqual(booking1.status, 'confirmed');
    console.log('  ✔ Created base booking: 10:00 - 11:30 tomorrow');

    // Attempt overlapping booking 1 (starts during booking 1: 10:30 - 12:00)
    let overlapRejected1 = false;
    try {
      await BookingDatabase.createBooking({
        room_id: testRoomId,
        title: 'Conflicting Sync',
        organizer_name: 'Bob Smith',
        organizer_email: 'bob@example.com',
        start_time: createDubaiDateTime(tomorrowDubai, 10, 30).toISOString(),
        end_time: createDubaiDateTime(tomorrowDubai, 12, 0).toISOString(),
      });
    } catch (err) {
      if (err.message.includes('This slot was just taken, please pick another') || err.code === '23P01') {
        overlapRejected1 = true;
      }
    }
    assert(overlapRejected1, 'Overlapping booking (10:30-12:00) MUST be rejected');
    console.log('  ✔ Overlapping booking (10:30-12:00) properly rejected with friendly message');

    // Attempt overlapping booking 2 (entirely contained inside: 10:15 - 10:45)
    let overlapRejected2 = false;
    try {
      await BookingDatabase.createBooking({
        room_id: testRoomId,
        title: 'Contained Sync',
        organizer_name: 'Charlie',
        organizer_email: 'charlie@example.com',
        start_time: createDubaiDateTime(tomorrowDubai, 10, 15).toISOString(),
        end_time: createDubaiDateTime(tomorrowDubai, 10, 45).toISOString(),
      });
    } catch (err) {
      if (err.message.includes('This slot was just taken, please pick another') || err.code === '23P01') {
        overlapRejected2 = true;
      }
    }
    assert(overlapRejected2, 'Contained overlapping booking MUST be rejected');
    console.log('  ✔ Contained booking (10:15-10:45) properly rejected');

    // Non-overlapping booking immediately following (11:30 - 12:30) should SUCCEED
    const bookingAdjacent = await BookingDatabase.createBooking({
      room_id: testRoomId,
      title: 'Adjacent Follow-up Sync',
      organizer_name: 'Diana Prince',
      organizer_email: 'diana@example.com',
      start_time: slotEnd, // exact 11:30 boundary
      end_time: createDubaiDateTime(tomorrowDubai, 12, 30).toISOString(),
    });
    assert(bookingAdjacent.id, 'Adjacent non-overlapping booking should succeed');
    console.log('  ✔ Adjacent boundary booking (11:30-12:30) successfully booked');

    console.log('✅ TEST 1 PASSED: Overlap prevention fully verified!\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err);
    failed++;
  }

  // TEST 2: Past-Booking Rejection
  console.log('▶ TEST 2: Past-Booking Rejection');
  try {
    const { bookingFormSchema } = await import('../src/lib/validation.ts');

    const pastStart = subHours(new Date(), 3).toISOString();
    const pastEnd = subHours(new Date(), 2).toISOString();

    const result = bookingFormSchema.safeParse({
      room_id: testRoomId,
      title: 'Retroactive Meeting',
      organizer_name: 'Ghost User',
      organizer_email: 'ghost@example.com',
      start_time: pastStart,
      end_time: pastEnd,
    });

    assert.strictEqual(result.success, false, 'Validation should fail for past times');
    const pastError = result.error.errors.find((e) => e.message.includes('past'));
    assert(pastError, 'Should contain error message rejecting past meetings');
    console.log('  ✔ Validation correctly flagged past booking:', pastError.message);

    console.log('✅ TEST 2 PASSED: Past-booking rejection verified!\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 2 FAILED:', err);
    failed++;
  }

  // TEST 3: Realtime Updates & Secret Token Cancellation
  console.log('▶ TEST 3: Realtime Updates & Cancellation via Secret Token');
  try {
    const { BookingDatabase, subscribeToRealtime } = await import('../src/lib/db.ts');
    const { createDubaiDateTime, formatInDubai } = await import('../src/lib/timezone.ts');

    const dayAfterTomorrow = formatInDubai(addDays(new Date(), 2), 'yyyy-MM-dd');
    const startIso = createDubaiDateTime(dayAfterTomorrow, 14, 0).toISOString();
    const endIso = createDubaiDateTime(dayAfterTomorrow, 15, 0).toISOString();

    let receivedInsertEvent = false;
    let receivedUpdateEvent = false;

    // Subscribe to realtime hub
    const unsubscribe = subscribeToRealtime((event) => {
      if (event.type === 'INSERT' && event.data.title === 'Realtime Probe Meeting') {
        receivedInsertEvent = true;
      }
      if (event.type === 'UPDATE' && event.data.title === 'Realtime Probe Meeting' && event.data.status === 'cancelled') {
        receivedUpdateEvent = true;
      }
    });

    // 1. Create booking
    const booking = await BookingDatabase.createBooking({
      room_id: testRoomId,
      title: 'Realtime Probe Meeting',
      organizer_name: 'Realtime Tester',
      organizer_email: 'tester@example.com',
      start_time: startIso,
      end_time: endIso,
    });

    assert(receivedInsertEvent, 'Realtime INSERT event should be broadcasted on creation');
    console.log('  ✔ Realtime INSERT event caught on event stream');
    assert(booking.cancel_token, 'Booking must have a secret cancel token');
    console.log('  ✔ Secret cancel token generated:', booking.cancel_token);

    // 2. Cancel via secret token
    const cancelledBooking = await BookingDatabase.cancelBookingByToken(booking.cancel_token);
    assert.strictEqual(cancelledBooking.status, 'cancelled');
    assert(receivedUpdateEvent, 'Realtime UPDATE event should be broadcasted on cancellation');
    console.log('  ✔ Realtime UPDATE (cancellation) event caught on event stream');

    // 3. Verify slot is now free to book again
    const rebooked = await BookingDatabase.createBooking({
      room_id: testRoomId,
      title: 'Replacement Meeting In Freed Slot',
      organizer_name: 'New Organizer',
      organizer_email: 'new@example.com',
      start_time: startIso,
      end_time: endIso,
    });
    assert(rebooked.id, 'Freed slot should be bookable again after cancellation');
    console.log('  ✔ Freed slot successfully rebooked by another organizer');

    unsubscribe();
    console.log('✅ TEST 3 PASSED: Realtime updates & secret token cancellation verified!\n');
    passed++;
  } catch (err) {
    console.error('❌ TEST 3 FAILED:', err);
    failed++;
  }

  console.log('------------------------------------------------------------');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('------------------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
