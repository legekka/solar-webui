/**
 * RoutingEventsContext - Compatibility wrapper using the new EventStreamContext
 *
 * This context wraps the unified EventStreamContext to maintain backward
 * compatibility with existing components while using the new single
 * WebSocket architecture.
 */

import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { EventStreamProvider, useEventStreamContext, HostStatusData, RequestState } from './EventStreamContext';

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

// Re-export RequestState from EventStreamContext for compatibility
export type { RequestState };

interface RoutingEventsContextValue {
  requests: Map<string, RequestState>;
  removeRequest: (requestId: string) => void;
  events: RoutingEvent[];
  addRecentEvents: (items: RoutingEvent[]) => void;
  routingConnected: boolean;
  statusConnected: boolean;
  hostStatuses: Map<string, HostStatusData>;
}

const RoutingEventsContext = createContext<RoutingEventsContextValue | undefined>(undefined);

function RoutingEventsContextConsumer({ children }: { children: any }) {
  const eventStream = useEventStreamContext();
  const [events, setEvents] = useState<RoutingEvent[]>([]);
  const EVENTS_MAX = 2000;

  // Capture error and reroute events into a ring buffer
  useEffect(() => {
    // This will be called through the event handlers
  }, []);

  const addRecentEvents = useCallback((items: RoutingEvent[]) => {
    if (!items || items.length === 0) return;
    setEvents((prev) => {
      const merged = [...prev, ...items];
      merged.sort((a, b) => {
        const at = (a.data as any)?.timestamp || (a as any).timestamp || '';
        const bt = (b.data as any)?.timestamp || (b as any).timestamp || '';
        return at.localeCompare(bt);
      });
      return merged.length > EVENTS_MAX ? merged.slice(merged.length - EVENTS_MAX) : merged;
    });
  }, []);

  // Convert hosts Map to legacy format
  const hostStatuses = useMemo(() => {
    return eventStream.hosts;
  }, [eventStream.hosts]);

  const value = useMemo<RoutingEventsContextValue>(() => ({
    requests: eventStream.requests,
    removeRequest: eventStream.removeRequest,
    events,
    addRecentEvents,
    routingConnected: eventStream.isConnected,
    statusConnected: eventStream.isConnected, // Same connection now
    hostStatuses,
  }), [eventStream.requests, eventStream.removeRequest, eventStream.isConnected, events, addRecentEvents, hostStatuses]);

  return (
    <RoutingEventsContext.Provider value={value}>
      {children}
    </RoutingEventsContext.Provider>
  );
}

export function RoutingEventsProvider({ children }: { children: any }) {
  const [events, setEvents] = useState<RoutingEvent[]>([]);
  const EVENTS_MAX = 2000;

  // Handler for routing events to capture errors/reroutes
  const handleRoutingEvent = useCallback((type: string, data: any) => {
    if (type === 'request_error' || type === 'request_reroute') {
      setEvents((prev) => {
        const event: RoutingEvent = { type: type as any, data };
        const merged = [...prev, event];
        if (merged.length > EVENTS_MAX) return merged.slice(merged.length - EVENTS_MAX);
        return merged;
      });
    }
  }, []);

  return (
    <EventStreamProvider handlers={{ onRoutingEvent: handleRoutingEvent }}>
      <RoutingEventsContextConsumer>
        {children}
      </RoutingEventsContextConsumer>
    </EventStreamProvider>
  );
}

export function useRoutingEventsContext() {
  const ctx = useContext(RoutingEventsContext);
  if (!ctx) throw new Error('useRoutingEventsContext must be used within a RoutingEventsProvider');
  return ctx;
}
