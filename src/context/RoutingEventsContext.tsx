import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

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
}

const RoutingEventsContext = createContext<RoutingEventsContextValue | undefined>(undefined);

export function RoutingEventsProvider({ children }: { children: any }) {
  const [requests, setRequests] = useState<Map<string, RequestState>>(new Map());
  const [events, setEvents] = useState<RoutingEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const baseUrl = (import.meta as any).env.VITE_SOLAR_CONTROL_URL || 'http://localhost:8000';
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
      const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
      const url = baseUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${url}/ws/routing`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
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
    };
  }, [baseUrl, handleEvent]);

  const value = useMemo<RoutingEventsContextValue>(() => ({ requests, removeRequest, events, addRecentEvents }), [requests, removeRequest, events, addRecentEvents]);
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


