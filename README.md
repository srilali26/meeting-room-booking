# QuickRoom Live — Real-Time Meeting Room Booking Web Application

A production-ready, mobile-first meeting room booking system with real-time WebSocket/SSE synchronization, database-level exclusion constraint overlap prevention, secret token cancellation (no accounts needed), and instant QR code access for physical doors.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase (Postgres + Realtime + RLS)**, and **Zod**.

---

## 🌟 Key Features

### 1. Seamless User Flow (Zero Login Required)
- **Permanent Room URLs:** Every meeting room has a permanent route at `/room/{roomId}`.
- **Scan & Land:** Employees or visitors scan the door's QR code on their smartphone and land straight onto that room's live schedule.
- **Vertical Daily Timeline:** 08:00 to 20:00 (Asia/Dubai UTC+4) displayed in 30-minute intervals:
  - 🔴 **Booked slots** in high-contrast red with meeting title & organizer name.
  - 🟢 **Free slots** in emerald green with instant touch/click targets and range selection.
  - ⏱️ **Live "Now" Indicator Line** showing exact current Dubai time along the timeline.
  - 📢 **Status Banner:** Dynamically shows *"Available now until HH:MM"* or *"Occupied until HH:MM, free from HH:MM"*.
- **Booking Modal Sheet:** Pre-fills start and end times, validates with Zod, saves to Postgres, and pushes real-time updates to all screens in < 1 second.
- **Secret Token Cancellation:** On booking confirmation, users receive an on-screen cancel link with a cryptographic token (`/booking/cancel?token=...`). They can cancel anytime without logging in.
- **30-Day Date Picker:** Horizontally scrollable calendar selector to book up to 30 days in advance.

### 2. Database-Level Overlap & Conflict Prevention
- Utilizes Postgres **`btree_gist`** extension and **`tstzrange`** exclusion constraints:
  ```sql
  CONSTRAINT no_overlapping_confirmed_bookings EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status = 'confirmed');
  ```
- If two people attempt to book overlapping slots concurrently, the database rejects the second one with Postgres error code `23P01`.
- API layer catches this and surfaces a friendly message: *"This slot was just taken, please pick another"*.

### 3. Wall-Mounted Tablet Display Mode (`/room/{roomId}/display`)
- Designed for iPads or Android tablets mounted outside meeting room doors.
- Fullscreen kiosk dark mode with large live digital clock in Dubai time.
- Huge status hero banner (*AVAILABLE NOW* or *IN USE*).
- "Up Next Today" schedule showing the next 3 meetings.
- Direct on-screen QR code so passersby can point their phone camera and reserve the room on the spot.

### 4. Admin Management Console (`/admin`)
- Protected authentication via Supabase Auth (with built-in demo credentials).
- Room CRUD: Create rooms, edit capacity/amenities, and toggle active/inactive.
- QR Code Suite: Preview QR code, download high-res PNG or SVG vector.
- **Print QR Sign:** Opens `/room/{roomId}/print`, producing a pixel-perfect, print-styled A4 sign with room name, capacity, QR code, and scan instructions.
- All Bookings Table with room, date, status, and organizer search filters, plus admin override cancellation.
- Real-time Analytics: Bookings today, total hours booked, 12-hour room utilization rate %, and most-used rooms ranking.

### 5. Email Confirmation (Resend & Fallback)
- Automatically dispatches HTML confirmation email to the organizer with Dubai meeting time, room location, and direct cancel link.
- Integrated with Resend API (or logs to console when running locally).

---

## 🏗️ Tech Stack

- **Framework:** Next.js 14.2 (App Router, Server Components & Route Handlers)
- **Language:** TypeScript 5.6
- **Styling:** Tailwind CSS 3.4 with dark mode support and custom print stylesheets
- **Database:** Supabase (PostgreSQL 15+, btree_gist extension, RLS policies, Realtime publication)
- **Validation:** Zod 3.23 (client & server-side validation)
- **QR Engine:** `qrcode` (PNG data URLs and SVG vectors)
- **Timezone Management:** `date-fns` & `date-fns-tz` with permanent `Asia/Dubai` (UTC+4) normalization
- **Icons & Polish:** Lucide React, `canvas-confetti`

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Node.js 18.17+ or Node.js 20+
- npm / pnpm / yarn

### 2. Installation
```bash
# Clone repository
git clone <repo-url>
cd meeting-room-booking

# Install dependencies
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Application Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TIMEZONE=Asia/Dubai

# Supabase (Optional for local testing; zero-config storage is built-in)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Delivery (Optional)
RESEND_API_KEY=

# Default Admin Portal Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=adminpassword123
```

> **Note on Zero-Config Mode:** If Supabase credentials are omitted, the application runs out-of-the-box with a high-fidelity local database engine and Server-Sent Events (SSE) realtime hub. It pre-seeds 3 sample rooms and realistic sample bookings for today!

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Supabase Setup & Migrations

If deploying with Supabase:
1. Create a new project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Run the migration script located at:
   [`supabase/migrations/20261102000000_init_meeting_rooms.sql`](file:///supabase/migrations/20261102000000_init_meeting_rooms.sql)
4. Run the seed data script:
   [`supabase/seed.sql`](file:///supabase/seed.sql)
5. Copy your **Project URL**, **Anon Key**, and **Service Role Key** from **Project Settings -> API** into `.env.local` or Vercel environment variables.

---

## 🧪 Automated Testing

Run the test suite:
```bash
npm test
# or: node scripts/run-tests.mjs
```

The test runner asserts:
1. **Overlap Prevention:** Confirms that booking an overlapping slot (or contained slot) in the same room is rejected with error code `23P01`, while contiguous adjacent slots succeed.
2. **Past-Booking Rejection:** Confirms that attempting to book a past time fails validation.
3. **Realtime Broadcast & Token Cancellation:** Verifies realtime `INSERT` events, generates cryptographic cancel tokens, asserts realtime `UPDATE` (cancellation) events, and verifies the slot becomes immediately rebookable.

---

## 🖨️ How to Print and Place Room QR Codes

1. Navigate to the Admin Dashboard at `/admin` (Login: `admin@example.com` / `adminpassword123`).
2. Under the **Rooms** tab, find the room you wish to deploy.
3. Click **"Sign"** or **"QR Code" -> "Open Printable A4 Sign"**.
4. The page opens the dedicated printable view at `/room/{roomId}/print`.
5. Press the blue **"Print QR Sign"** button (or `Ctrl+P` / `Cmd+P`).
6. In the print dialog:
   - Destination: Color printer or "Save as PDF".
   - Paper Size: **A4**.
   - Margins: Default.
   - Background Graphics: **Checked**.
7. Mount the sign outside the room at eye level (140–160 cm from the floor) near the door handle or card reader.

---

## 🚢 Deployment to Vercel

1. Push your repository to GitHub / GitLab.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New Project** and import the repository.
3. Set the Environment Variables:
   - `NEXT_PUBLIC_APP_URL`: Your production domain (e.g. `https://rooms.yourdomain.com`).
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase public anon key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key.
   - `RESEND_API_KEY`: (Optional) Your Resend API key for automated confirmation emails.
   - `ADMIN_EMAIL` & `ADMIN_PASSWORD`: Your admin credentials.
4. Click **Deploy**. Vercel will build and deploy the Next.js application automatically.
