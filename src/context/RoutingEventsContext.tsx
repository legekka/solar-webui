import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import solarClient from '@/api/client';

export interface RoutingEvent {
  type: 'request_start' | 'request_routed' | 'request_success' | 'request_error' | 'request_reroute' | 'keepalive';
  data?: {
    request_id: string;
    model: string;
    resolved_model?: string;
    endpoint?: string;
    host_id?: string;
    host_name?: string;
    instance_id?: string;
    instance_url?: string;
    error_message?: string;
    duration?: number;
    timestamp: string;
    stream?: boolean;
    client_ip?: string;
  };
}

export interface RequestState {
  request_id: string;
  model: string;
  resolved_model?: string;
  endpoint?: string;
  host_id?: string;
  host_name?: string;
  instance_id?: string;
  instance_url?: string;
  status: 'pending' | 'routed' | 'processing' | 'success' | 'error';
  error_message?: string;
  duration?: number;
  timestamp: string;
  stream?: boolean;
  client_ip?: string;
  removing?: boolean;
}

interface RoutingEventsContextValue {
  requests: Map<string, RequestState>;
  removeRequest: (requestId: string) => void;
  events: RoutingEvent[];
  addRecentEvents: (items: RoutingEvent[]) => void;
  routingConnected: boolean;
  statusConnected: boolean;
  hostStatuses: Map<string, { host_id: string; name: string; status: string; url: string; memory?: any; last_seen?: string | null }>;
}

const RoutingEventsContext = createContext<RoutingEventsContextValue | undefined>(undefined);

export function RoutingEventsProvider({ children }: { children: any }) {
  const [requests, setRequests] = useState<Map<string, RequestState>>(new Map());
  const [events, setEvents] = useState<RoutingEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const statusWsRef = useRef<WebSocket | null>(null);
  const statusReconnectRef = useRef<number | null>(null);
  const statusPingRef = useRef<number | null>(null);
  const [routingConnected, setRoutingConnected] = useState(false);
  const [statusConnected, setStatusConnected] = useState(false);
  const [hostStatuses, setHostStatuses] = useState<Map<string, { host_id: string; name: string; status: string; url: string; memory?: any; last_seen?: string | null }>>(new Map());
  const EVENTS_MAX = 2000;

  const updateRequest = useCallback((requestId: string, updates: Partial<RequestState>) => {
    setRequests((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(requestId);
      if (existing) {
        newMap.set(requestId, { ...existing, ...updates });
      } else {
        newMap.set(requestId, { request_id: requestId, status: 'pending', timestamp: new Date().toISOString(), ...updates } as RequestState);
      }
      return newMap;
    });
  }, []);

  const removeRequest = useCallback((requestId: string) => {
    setRequests((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(requestId);
      if (existing) {
        newMap.set(requestId, { ...existing, removing: true });
      }
      return newMap;
    });
    setTimeout(() => {
      setRequests((prev) => {
        const newMap = new Map(prev);
        newMap.delete(requestId);
        return newMap;
      });
    }, 350);
  }, []);

  const handleEvent = useCallback((event: RoutingEvent) => {
    if (event.type === 'keepalive' || !event.data) return;
    const { request_id, ...data } = event.data;
    // Capture non-regular events into a ring buffer
    if (event.type === 'request_error' || event.type === 'request_reroute') {
      setEvents((prev) => {
        const merged = [...prev, event];
        if (merged.length > EVENTS_MAX) return merged.slice(merged.length - EVENTS_MAX);
        return merged;
      });
    }
    switch (event.type) {
      case 'request_start':
        updateRequest(request_id, {
          model: data.model,
          endpoint: data.endpoint,
          status: 'pending',
          timestamp: event.data.timestamp,
          stream: event.data.stream,
          client_ip: event.data.client_ip,
        });
        break;
      case 'request_routed':
        updateRequest(request_id, {
          host_id: event.data.host_id,
          host_name: event.data.host_name,
          instance_id: event.data.instance_id,
          instance_url: event.data.instance_url,
          resolved_model: event.data.resolved_model,
          status: 'processing',
        });
        break;
      case 'request_success':
        updateRequest(request_id, {
          status: 'success',
          duration: event.data.duration,
        });
        setTimeout(() => removeRequest(request_id), 5000);
        break;
      case 'request_error':
        updateRequest(request_id, {
          status: 'error',
          error_message: event.data.error_message,
          duration: event.data.duration,
          host_id: event.data.host_id,
          instance_id: event.data.instance_id,
        });
        break;
    }
  }, [updateRequest, removeRequest]);

  const addRecentEvents = useCallback((items: RoutingEvent[]) => {
    if (!items || items.length === 0) return;
    setEvents((prev) => {
      // Merge, then limit; simple concat is fine since items are historical
      const merged = [...prev, ...items];
      // Sort by timestamp if present
      merged.sort((a, b) => {
        const at = (a.data as any)?.timestamp || (a as any).timestamp || '';
        const bt = (b.data as any)?.timestamp || (b as any).timestamp || '';
        return at.localeCompare(bt);
      });
      return merged.length > EVENTS_MAX ? merged.slice(merged.length - EVENTS_MAX) : merged;
    });
  }, []);

  useEffect(() => {
    const connect = () => {
      const wsUrl = solarClient.getControlWebSocketUrl('/ws/routing');
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setRoutingConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        pingIntervalRef.current = window.setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send('ping');
          }
        }, 25000);
      };

      wsRef.current.onmessage = (event) => {
        if (typeof event.data === 'string' && event.data === 'pong') return;
        try {
          const message = JSON.parse(event.data);
          handleEvent(message as RoutingEvent);
        } catch {}
      };

      wsRef.current.onclose = () => {
        setRoutingConnected(false);
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        reconnectTimeoutRef.current = window.setTimeout(() => connect(), 5000);
      };

      wsRef.current.onerror = () => {
        try { wsRef.current?.close(); } catch {}
      };
    };

    connect();
    // Also connect to status websocket globally
    const connectStatus = () => {
      const wsUrl = solarClient.getControlWebSocketUrl('/ws/status');
      statusWsRef.current = new WebSocket(wsUrl);

      statusWsRef.current.onopen = () => {
        setStatusConnected(true);
        if (statusReconnectRef.current) {
          clearTimeout(statusReconnectRef.current);
          statusReconnectRef.current = null;
        }
        if (statusPingRef.current) {
          clearInterval(statusPingRef.current);
          statusPingRef.current = null;
        }
        statusPingRef.current = window.setInterval(() => {
          if (statusWsRef.current?.readyState === WebSocket.OPEN) {
            statusWsRef.current.send('ping');
          }
        }, 25000);
      };

      statusWsRef.current.onmessage = (event) => {
        if (typeof event.data === 'string' && event.data === 'pong') return;
        try {
          const message = JSON.parse(event.data);
          if (message?.type === 'initial_status' && Array.isArray(message.data)) {
            setHostStatuses(() => {
              const m = new Map<string, any>();
              (message.data as any[]).forEach((s) => m.set(s.host_id, s));
              return m;
            });
          } else if (message?.type === 'host_status' && message.data && !Array.isArray(message.data)) {
            setHostStatuses((prev) => {
              const m = new Map(prev);
              m.set(message.data.host_id, message.data);
              return m;
            });
          }
        } catch {}
      };

      statusWsRef.current.onclose = () => {
        setStatusConnected(false);
        if (statusPingRef.current) {
          clearInterval(statusPingRef.current);
          statusPingRef.current = null;
        }
        statusReconnectRef.current = window.setTimeout(() => connectStatus(), 5000);
      };

      statusWsRef.current.onerror = () => {
        try { statusWsRef.current?.close(); } catch {}
      };
    };
    connectStatus();
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
      if (statusPingRef.current) {
        clearInterval(statusPingRef.current);
        statusPingRef.current = null;
      }
      if (statusReconnectRef.current) {
        clearTimeout(statusReconnectRef.current);
        statusReconnectRef.current = null;
      }
      if (statusWsRef.current) {
        try { statusWsRef.current.close(); } catch {}
        statusWsRef.current = null;
      }
    };
  }, [handleEvent]);

  const value = useMemo<RoutingEventsContextValue>(() => ({ requests, removeRequest, events, addRecentEvents, routingConnected, statusConnected, hostStatuses }), [requests, removeRequest, events, addRecentEvents, routingConnected, statusConnected, hostStatuses]);
  return (
    <RoutingEventsContext.Provider value={value}>
      {children}
    </RoutingEventsContext.Provider>
  );
}

export function useRoutingEventsContext() {
  const ctx = useContext(RoutingEventsContext);
  if (!ctx) throw new Error('useRoutingEventsContext must be used within a RoutingEventsProvider');
  return ctx;
}


