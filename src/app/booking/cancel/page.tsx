import { Suspense } from 'react';
import { CancelClientView } from './CancelClientView';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function CancelBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <CancelClientView />
    </Suspense>
  );
}
