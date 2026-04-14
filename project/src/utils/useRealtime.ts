import { useEffect, useRef, useState } from 'react';

interface RealtimeUpdate {
  type: 'incident' | 'complaint';
  data: Record<string, unknown>;
}

export const useRealtime = (userType: string, userId: number) => {
  const [updates, setUpdates] = useState<RealtimeUpdate[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userType || !userId) return;

    const apiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
    const url = `${apiUrl}/realtime/sse.php?user_type=${userType}&user_id=${userId}`;

    const connect = () => {
      eventSourceRef.current?.close();
      const source = new EventSource(url);
      eventSourceRef.current = source;

      source.addEventListener('update', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (Array.isArray(data)) {
            setUpdates(data);
          }
        } catch {
          // Ignore malformed realtime packets.
        }
      });

      source.addEventListener('heartbeat', () => {
        // Keep the connection open.
      });

      source.onerror = () => {
        source.close();
        if (reconnectTimerRef.current !== null) {
          window.clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = window.setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      eventSourceRef.current?.close();
    };
  }, [userType, userId]);

  return { updates, clearUpdates: () => setUpdates([]) };
};
