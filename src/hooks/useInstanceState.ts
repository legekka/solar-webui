import { useCallback, useEffect, useRef, useState } from 'react';
import solarClient from '@/api/client';
import { InstanceRuntimeState } from '@/api/types';

export function useInstanceState(hostId: string, instanceId: string) {
  const [state, setState] = useState<InstanceRuntimeState | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);

  const baseUrl = (import.meta as any).env.VITE_SOLAR_CONTROL_URL || 'http://localhost:8000';

  const connect = useCallback(() => {
    if (!hostId || !instanceId) return;
    const wsUrl = solarClient.getInstanceStateWebSocketUrl(baseUrl, hostId, instanceId);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (typeof msg === 'object' && msg && msg.type === 'instance_state' && msg.data) {
            const data = msg.data as InstanceRuntimeState;
            setState(data);
          }
          // Ignore keepalive or other messages
        } catch (e) {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect after short delay
        reconnectRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current = ws;
    } catch {
      // Ignore errors creating WebSocket
    }
  }, [baseUrl, hostId, instanceId]);

  useEffect(() => {
    // Initial REST snapshot
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await solarClient.getInstanceState(hostId, instanceId);
        if (!cancelled) setState(snapshot);
      } catch {
        // Ignore initial fetch errors
      }
    })();

    connect();

    return () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
    };
  }, [connect, hostId, instanceId]);

  return {
    state,
    connected,
  };
}


