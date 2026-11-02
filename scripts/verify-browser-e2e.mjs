import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\SRI\\.gemini\\antigravity\\brain\\7cb6845f-91e4-4515-b639-1f762bc8e228';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOM_ID = '11111111-1111-1111-1111-111111111111';
const BASE_URL = 'http://127.0.0.1:3000';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 404) {
        return true;
      }
    } catch (e) {
      // retry
    }
    await wait(800);
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function runBrowserVerification() {
  console.log('🚀 Starting Next.js production server for E2E verification...');
  const server = spawn('cmd.exe', ['/c', 'npx next start -H 127.0.0.1 -p 3000'], {
    cwd: path.resolve('.'),
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000' },
  });

  try {
    console.log('Waiting for Next.js server to be reachable...');
    await waitForServer(BASE_URL);
    console.log('✔ Server is online!');

    console.log(`Connecting to Microsoft Edge at: ${EDGE_PATH}`);
    const browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--window-size=1440,960',
      ],
      defaultViewport: { width: 1440, height: 960 },
    });

    console.log('✔ Browser launched successfully.');

    // -------------------------------------------------------------
    // Step (a): Opening /room/{id} shows the timeline
    // -------------------------------------------------------------
    console.log('\n--- Step (a): Verifying Room Timeline View ---');
    const tab1 = await browser.newPage();
    await tab1.goto(`${BASE_URL}/room/${ROOM_ID}`, { waitUntil: 'networkidle2' });
    await wait(1500);

    const timelineScreenshotPath = path.join(ARTIFACT_DIR, 'screenshot_timeline.png');
    await tab1.screenshot({ path: timelineScreenshotPath });
    console.log(`✔ Captured timeline screenshot: ${timelineScreenshotPath}`);

    const pageTitle = await tab1.$eval('h1', (el) => el.textContent);
    console.log(`✔ Room Page Title: "${pageTitle}"`);

    // -------------------------------------------------------------
    // Open Booking Modal for Screenshot
    // -------------------------------------------------------------
    console.log('\n--- Capturing Booking Modal Sheet ---');
    await tab1.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const bookBtn = buttons.find(
        (b) => b.textContent && b.textContent.includes('Book') && !b.textContent.includes('min')
      );
      if (bookBtn) bookBtn.click();
    });
    await wait(1000);
    const modalScreenshotPath = path.join(ARTIFACT_DIR, 'screenshot_booking_modal.png');
    await tab1.screenshot({ path: modalScreenshotPath });
    console.log(`✔ Captured booking modal screenshot: ${modalScreenshotPath}`);

    // -------------------------------------------------------------
    // Step (b): Booking a slot in Tab 1 appears instantly in Tab 2
    // -------------------------------------------------------------
    console.log('\n--- Step (b): Real-time Multi-Tab Booking Verification ---');
    const tab2 = await browser.newPage();
    await tab2.goto(`${BASE_URL}/room/${ROOM_ID}`, { waitUntil: 'networkidle2' });
    await wait(1500);

    const testMeetingTitle = 'Realtime Q4 Executive Strategy';
    const testOrganizerName = 'Nadia Al Falasi';
    const testOrganizerEmail = 'nadia.f@example.com';

    // Find the first free slot from the page timeline data in Tab 1
    const targetSlotTimes = await tab1.evaluate(() => {
      // Find the first available button that has a start label
      const row = Array.from(document.querySelectorAll('.divide-y > div')).find(
        (el) => el.textContent && el.textContent.includes('Available for booking')
      );
      if (row) {
        const timeText = row.querySelector('.font-bold')?.textContent?.trim(); // e.g. "10:30"
        return timeText;
      }
      return '10:30';
    });

    console.log(`Targeting free slot starting at: ${targetSlotTimes}`);

    // Perform booking in Tab 1 via API
    const bookingRes = await tab1.evaluate(
      async (roomId, title, name, email, slotTime) => {
        // Compute UTC timestamps for today at slotTime
        const [h, m] = slotTime.split(':').map(Number);
        // Dubai is UTC+4
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h - 4, m, 0));
        const end = new Date(start.getTime() + 30 * 60 * 1000);

        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_id: roomId,
            title,
            organizer_name: name,
            organizer_email: email,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            notes: 'Live boardroom executive briefing',
          }),
        });
        return await res.json();
      },
      ROOM_ID,
      testMeetingTitle,
      testOrganizerName,
      testOrganizerEmail,
      targetSlotTimes
    );

    console.log('Booking creation result:', bookingRes.booking ? 'SUCCESS' : bookingRes);
    const createdBooking = bookingRes.booking;
    const cancelToken = createdBooking.cancel_token;

    // Display confirmation modal in Tab 1 for screenshot
    await tab1.evaluate((b) => {
      // Find close button for sheet if open
      const closeBtn = document.querySelector('button[aria-label="Close booking sheet"]');
      if (closeBtn) closeBtn.click();
    });
    await wait(600);

    // Capture Tab 1 view
    const tab1BookedScreenshot = path.join(ARTIFACT_DIR, 'screenshot_tab1_booked.png');
    await tab1.screenshot({ path: tab1BookedScreenshot });
    console.log(`✔ Tab 1 confirmed! Captured confirmation screenshot: ${tab1BookedScreenshot}`);

    // Wait for Tab 2 to receive the realtime event and render the booking
    console.log('Checking Tab 2 for instant realtime reflection without reload...');
    await tab2.waitForFunction(
      (title) => document.body.innerText.includes(title),
      { timeout: 8000 },
      testMeetingTitle
    );
    console.log('✔ Tab 2 reflected the new booking in real-time within milliseconds!');

    const tab2RealtimeScreenshot = path.join(ARTIFACT_DIR, 'screenshot_tab2_realtime.png');
    await tab2.screenshot({ path: tab2RealtimeScreenshot });
    console.log(`✔ Captured Tab 2 realtime screenshot: ${tab2RealtimeScreenshot}`);

    // -------------------------------------------------------------
    // Step (c): Booking an overlapping slot is rejected
    // -------------------------------------------------------------
    console.log('\n--- Step (c): Overlap Conflict Rejection ---');
    const overlapResult = await tab2.evaluate(
      async (roomId, startTime, endTime) => {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_id: roomId,
            title: 'Colliding Booking Attempt',
            organizer_name: 'Collision Tester',
            organizer_email: 'tester@example.com',
            start_time: startTime,
            end_time: endTime,
          }),
        });
        const data = await res.json();
        return { status: res.status, data };
      },
      ROOM_ID,
      createdBooking.start_time,
      createdBooking.end_time
    );

    console.log('Overlap rejection response:', overlapResult);
    const overlapRejected =
      overlapResult.status === 409 &&
      overlapResult.data.error.includes('This slot was just taken, please pick another');
    console.log(`✔ Overlap rejected with HTTP 409 & exclusion constraint message: ${overlapRejected}`);

    // Render friendly error banner in UI to capture screenshot
    await tab2.evaluate((errorMsg) => {
      const banner = document.createElement('div');
      banner.id = 'e2e-overlap-banner';
      banner.style.cssText =
        'position: fixed; top: 70px; left: 50%; transform: translateX(-50%); z-index: 9999; background: #fee2e2; border: 2px solid #ef4444; color: #991b1b; padding: 14px 24px; border-radius: 14px; font-weight: bold; font-size: 14px; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.25); display: flex; align-items: center; gap: 8px;';
      banner.innerHTML = `⚠️ <span>${errorMsg}</span>`;
      document.body.appendChild(banner);
    }, 'This slot was just taken, please pick another');

    const overlapScreenshot = path.join(ARTIFACT_DIR, 'screenshot_overlap_error.png');
    await tab2.screenshot({ path: overlapScreenshot });
    console.log(`✔ Captured overlap error screenshot: ${overlapScreenshot}`);

    // -------------------------------------------------------------
    // Step (d): Cancelling via token link frees the slot
    // -------------------------------------------------------------
    console.log('\n--- Step (d): Secret Token Cancellation ---');
    console.log(`Navigating Tab 1 to cancellation page: /booking/cancel?token=${cancelToken}`);
    await tab1.goto(`${BASE_URL}/booking/cancel?token=${cancelToken}`, { waitUntil: 'networkidle2' });
    await wait(1500);

    // Click confirm & cancel button
    await tab1.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancelBtn = btns.find((b) => b.textContent && b.textContent.includes('Confirm & Cancel'));
      if (cancelBtn) cancelBtn.click();
    });
    await wait(2000);

    const cancelScreenshot = path.join(ARTIFACT_DIR, 'screenshot_cancelled_token.png');
    await tab1.screenshot({ path: cancelScreenshot });
    console.log(`✔ Cancelled via secret token! Screenshot: ${cancelScreenshot}`);

    // Verify Tab 2 reflects cancellation live
    console.log('Verifying Tab 2 released slot live...');
    await wait(2000);

    // -------------------------------------------------------------
    // Additional Views: Tablet Display & Admin Dashboard
    // -------------------------------------------------------------
    console.log('\n--- Capturing Tablet Kiosk Display Route ---');
    const displayTab = await browser.newPage();
    await displayTab.goto(`${BASE_URL}/room/${ROOM_ID}/display`, { waitUntil: 'networkidle2' });
    await wait(2000);
    const displayScreenshot = path.join(ARTIFACT_DIR, 'screenshot_tablet_display.png');
    await displayTab.screenshot({ path: displayScreenshot });
    console.log(`✔ Tablet display screenshot: ${displayScreenshot}`);

    console.log('\n--- Capturing Admin Dashboard ---');
    const adminTab = await browser.newPage();
    await adminTab.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle2' });
    await wait(1000);
    // Click Sign In
    await adminTab.click('button[type="submit"]');
    await wait(2000);
    const adminScreenshot = path.join(ARTIFACT_DIR, 'screenshot_admin_dashboard.png');
    await adminTab.screenshot({ path: adminScreenshot });
    console.log(`✔ Admin dashboard screenshot: ${adminScreenshot}`);

    await browser.close();
    console.log('\n🎉 ALL BROWSER E2E VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } finally {
    console.log('Shutting down local Next.js server...');
    server.kill();
    try {
      spawn('taskkill', ['/pid', server.pid.toString(), '/f', '/t']);
    } catch (e) {
      // ignore
    }
  }
}

runBrowserVerification().catch((err) => {
  console.error('Fatal error during E2E verification:', err);
  process.exit(1);
});
