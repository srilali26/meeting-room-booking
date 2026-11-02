import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Real-time Meeting Room Booking | QR & Timeline',
  description: 'Book meeting rooms instantly via permanent QR codes with real-time schedule updates and conflict exclusion.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
