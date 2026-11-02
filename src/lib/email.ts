import { Booking, Room } from '@/types';
import { formatInDubai } from './timezone';

interface SendConfirmationEmailParams {
  booking: Booking;
  room: Room;
}

export async function sendBookingConfirmationEmail({
  booking,
  room,
}: SendConfirmationEmailParams): Promise<{ success: boolean; previewUrl?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cancelUrl = `${baseUrl}/booking/cancel?token=${booking.cancel_token}`;
  const roomUrl = `${baseUrl}/room/${room.id}`;

  const formattedDate = formatInDubai(booking.start_time, 'EEEE, d MMMM yyyy');
  const startTime = formatInDubai(booking.start_time, 'HH:mm');
  const endTime = formatInDubai(booking.end_time, 'HH:mm');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
          .card { background: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: #1e293b; color: #ffffff; padding: 24px; text-align: center; }
          .badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 8px; }
          .content { padding: 28px; line-height: 1.6; }
          .details-box { background: #f1f5f9; border-radius: 8px; padding: 18px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .detail-label { color: #64748b; font-weight: 500; }
          .detail-value { font-weight: 600; color: #0f172a; text-align: right; }
          .btn-cancel { display: inline-block; background: #ef4444; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; font-size: 14px; margin-top: 12px; }
          .btn-room { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; font-size: 14px; margin-top: 12px; margin-right: 8px; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; padding: 20px; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="badge">Booking Confirmed</div>
            <h1 style="margin: 0; font-size: 22px;">${booking.title}</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${booking.organizer_name}</strong>,</p>
            <p>Your meeting room reservation has been confirmed. Below are your booking details:</p>
            
            <div class="details-box">
              <div class="detail-row">
                <span class="detail-label">Room:</span>
                <span class="detail-value">${room.name} (${room.location})</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${startTime} – ${endTime} (Dubai Time, UTC+4)</span>
              </div>
              ${booking.notes ? `
              <div class="detail-row" style="margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                <span class="detail-label">Notes:</span>
                <span class="detail-value">${booking.notes}</span>
              </div>` : ''}
            </div>

            <p style="margin-top: 24px; font-size: 14px; color: #475569;">
              Need to cancel or make changes? You can cancel anytime without logging in:
            </p>

            <div>
              <a href="${roomUrl}" class="btn-room">View Room Timeline</a>
              <a href="${cancelUrl}" class="btn-cancel">Cancel Booking</a>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
              Secret Cancel Token: <code>${booking.cancel_token}</code>
            </p>
          </div>
          <div class="footer">
            Real-time Meeting Room System &bull; Asia/Dubai (UTC+4)
          </div>
        </div>
      </body>
    </html>
  `;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'Meeting Rooms <noreply@resend.dev>',
          to: [booking.organizer_email],
          subject: `Confirmed: ${booking.title} @ ${room.name}`,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        console.warn('Resend email failed:', await response.text());
        return { success: false };
      }
      return { success: true };
    } catch (err) {
      console.error('Error sending confirmation email via Resend:', err);
      return { success: false };
    }
  }

  // Fallback: log to console with formatted details
  console.log(`[Email Service Mock] Booking Confirmation Email sent to: ${booking.organizer_email}`);
  console.log(`[Email Service Mock] Cancel URL: ${cancelUrl}`);
  return { success: true, previewUrl: cancelUrl };
}
