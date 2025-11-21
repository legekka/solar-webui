import { useEffect, useRef, useState } from 'react';
import solarClient from '@/api/client';
import { InstanceRuntimeState } from '@/api/types';

export type InstanceKey = string; // `${hostId}-${instanceId}`

export function useInstancesState(instances: Array<{ hostId: string; instanceId: string }>) {
  const [stateMap, setStateMap] = useState<Map<InstanceKey, InstanceRuntimeState>>(new Map());
  const socketsRef = useRef<Map<InstanceKey, WebSocket>>(new Map());
  const reconnectTimersRef = useRef<Map<InstanceKey, number>>(new Map());
  useEffect(() => {
    const desiredKeys = new Set<InstanceKey>();

    // Create or keep connections for desired instances
    instances.forEach(({ hostId, instanceId }) => {
      const key = `${hostId}-${instanceId}`;
      desiredKeys.add(key);
      if (socketsRef.current.has(key)) return;

      // Initial snapshot via REST
      (async () => {
        try {
          const snapshot = await solarClient.getInstanceState(hostId, instanceId);
          setStateMap((prev) => new Map(prev).set(key, snapshot));
        } catch {
          // ignore
        }
      })();

      const url = solarClient.getInstanceStateWebSocketUrl(hostId, instanceId);
      const ws = new WebSocket(url);
      socketsRef.current.set(key, ws);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg && msg.type === 'instance_state' && msg.data) {
            const data = msg.data as InstanceRuntimeState;
            setStateMap((prev) => new Map(prev).set(key, data));
          }
        } catch {}
      };

      ws.onclose = () => {
        // Attempt reconnect
        const timer = window.setTimeout(() => {
          socketsRef.current.delete(key);
          reconnectTimersRef.current.delete(key);
          // Trigger effect to recreate
          setStateMap((prev) => new Map(prev));
        }, 3000);
        reconnectTimersRef.current.set(key, timer);
      };
    });

    // Close connections that are no longer needed
    Array.from(socketsRef.current.keys()).forEach((key) => {
      if (!desiredKeys.has(key)) {
        const ws = socketsRef.current.get(key);
        if (ws) {
          try { ws.close(); } catch {}
        }
        socketsRef.current.delete(key);
      }
    });

    return () => {
      // Cleanup on unmount
      socketsRef.current.forEach((ws) => {
        try { ws.close(); } catch {}
      });
      socketsRef.current.clear();
      reconnectTimersRef.current.forEach((t) => clearTimeout(t));
      reconnectTimersRef.current.clear();
    };
  }, [JSON.stringify(instances)]);

  return stateMap;
}


