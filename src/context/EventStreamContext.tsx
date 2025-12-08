/**
 * EventStreamContext - Global context for the unified WebSocket event stream
 *
 * This context provides access to the event stream throughout the application,
 * ensuring a single WebSocket connection is shared across all components.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import {
  useEventStream,
  HostStatusData,
  InstanceStateData,
  RequestState,
  WSMessageType,
  RoutingEventData,
  LogEventData,
  EventHandlers,
} from '@/hooks/useEventStream';
import { LogMessage } from '@/api/types';

interface EventStreamContextValue {
  isConnected: boolean;
  hosts: Map<string, HostStatusData>;
  requests: Map<string, RequestState>;
  instanceStates: Map<string, InstanceStateData>;
  logs: Map<string, LogMessage[]>;
  getInstanceLogs: (hostId: string, instanceId: string) => LogMessage[];
  getInstanceState: (hostId: string, instanceId: string) => InstanceStateData | undefined;
  clearInstanceLogs: (hostId: string, instanceId: string) => void;
  removeRequest: (requestId: string) => void;
}

const EventStreamContext = createContext<EventStreamContextValue | null>(null);

interface EventStreamProviderProps {
  children: ReactNode;
  handlers?: EventHandlers;
}

export function EventStreamProvider({ children, handlers }: EventStreamProviderProps) {
  const eventStream = useEventStream(handlers);

  return (
    <EventStreamContext.Provider value={eventStream}>
      {children}
    </EventStreamContext.Provider>
  );
}

export function useEventStreamContext(): EventStreamContextValue {
  const context = useContext(EventStreamContext);
  if (!context) {
    throw new Error('useEventStreamContext must be used within an EventStreamProvider');
  }
  return context;
}

// Re-export types for convenience
export type {
  HostStatusData,
  InstanceStateData,
  RequestState,
  WSMessageType,
  RoutingEventData,
  LogEventData,
  EventHandlers,
};

