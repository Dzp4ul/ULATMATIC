import { useEffect, useRef, useState } from 'react';

interface RealtimeUpdate {
  type: 'incident' | 'complaint';
  data: any;
}

export const useRealtime = (userType: string, userId: number) => {
  const [updates, setUpdates] = useState<RealtimeUpdate[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userType || !userId) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost/ULATMATIC/api';
    const url = `${apiUrl}/realtime/sse.php?user_type=${userType}&user_id=${userId}`;

    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.addEventListener('update', (e) => {
      const data = JSON.parse(e.data);
      setUpdates(data);
    });

    eventSourceRef.current.addEventListener('heartbeat', () => {
      console.log('SSE heartbeat');
    });

    eventSourceRef.current.onerror = () => {
      console.error('SSE connection error');
      eventSourceRef.current?.close();
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          eventSourceRef.current = new EventSource(url);
        }
      }, 5000);
    };

    return () => {
      eventSourceRef.current?.close();
    };
  }, [userType, userId]);

  return { updates, clearUpdates: () => setUpdates([]) };
};
