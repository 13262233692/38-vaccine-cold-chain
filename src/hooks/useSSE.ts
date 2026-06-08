import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import type { SSEEvent, SSEEventData } from '../../shared/types';

export function useSSE() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { updateVehicleFromSSE, setSseConnected } = useStore();

  useEffect(() => {
    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/sse/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data);
          if (sseEvent.type === 'temperature' || sseEvent.type === 'alert' || sseEvent.type === 'blockchain') {
            updateVehicleFromSSE(sseEvent.data as SSEEventData);
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [updateVehicleFromSSE, setSseConnected]);
}
