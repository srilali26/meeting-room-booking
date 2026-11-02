-- Seed data: 3 sample rooms and today's initial bookings

INSERT INTO public.rooms (id, name, location, capacity, amenities, is_active)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Meeting Room 1',
    'Floor 1, Main Wing',
    16,
    ARRAY['4K Dual Display', 'Video Conferencing Kit', 'Conference Phone', 'Digital Whiteboard', 'High-speed Wi-Fi'],
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Meeting Room 2',
    'Floor 2, East Wing',
    8,
    ARRAY['Touchscreen Smart Board', 'Video Conferencing', 'Modular Desks', 'Wireless Presentation'],
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Meeting Room 3',
    'Floor 2, Quiet Zone',
    4,
    ARRAY['Ultra-wide Monitor', 'Acoustic Soundproofing', 'Ergonomic Seating', 'High-speed Wi-Fi'],
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Sample bookings for today in Asia/Dubai (UTC+4)
-- Slot 09:00 - 10:30 Dubai = 05:00 - 06:30 UTC
-- Slot 14:00 - 15:30 Dubai = 10:00 - 11:30 UTC
-- Slot 16:30 - 17:30 Dubai = 12:30 - 13:30 UTC
INSERT INTO public.bookings (id, room_id, title, organizer_name, organizer_email, start_time, end_time, notes, cancel_token, status)
VALUES
  (
    'aaaa1111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Quarterly Strategy Alignment',
    'Sarah Al Mansoor',
    'sarah.mansoor@example.com',
    (CURRENT_DATE + TIME '09:00:00') AT TIME ZONE 'Asia/Dubai',
    (CURRENT_DATE + TIME '10:30:00') AT TIME ZONE 'Asia/Dubai',
    'Board members attending in-person, remote team joining via Webex.',
    'token-sample-sarah-1',
    'confirmed'
  ),
  (
    'aaaa2222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Product Roadmap Sync',
    'Tariq Mahmoud',
    'tariq.m@example.com',
    (CURRENT_DATE + TIME '14:00:00') AT TIME ZONE 'Asia/Dubai',
    (CURRENT_DATE + TIME '15:30:00') AT TIME ZONE 'Asia/Dubai',
    'Q1 feature prioritisation and design reviews.',
    'token-sample-tariq-2',
    'confirmed'
  ),
  (
    'bbbb1111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'AI Architecture Sprint',
    'Elena Rostova',
    'elena.r@example.com',
    (CURRENT_DATE + TIME '11:00:00') AT TIME ZONE 'Asia/Dubai',
    (CURRENT_DATE + TIME '13:00:00') AT TIME ZONE 'Asia/Dubai',
    'Brainstorming session on real-time event pipeline.',
    'token-sample-elena-3',
    'confirmed'
  )
ON CONFLICT (id) DO NOTHING;
