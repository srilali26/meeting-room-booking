import { subscribeToRealtime } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(': connected\n\n'));

      const unsubscribe = subscribeToRealtime((event) => {
        try {
          if (controller.desiredSize !== null) {
            const payload = JSON.stringify(event);
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch (e) {
          // Closed stream or disconnected client
        }
      });

      // Send periodic heartbeat every 25 seconds
      const heartbeat = setInterval(() => {
        try {
          if (controller.desiredSize !== null) {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } else {
            clearInterval(heartbeat);
          }
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 25000);

      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
