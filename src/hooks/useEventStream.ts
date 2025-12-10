/**
 * useEventStream - Unified WebSocket hook for solar-webui (WebSocket 2.0)
 *
 * This hook provides a single WebSocket connection to solar-control's /ws/events
 * endpoint, which streams all events:
 * - host_status: Host online/offline status changes
 * - initial_status: Initial status of all hosts on connect
 * - log: Instance log messages from hosts
 * - instance_state: Instance runtime state updates from hosts
 * - request_start, request_routed, request_success, request_error: Routing events
 * - gateway_request: Completed request summaries (filterable)
 * - filter_status: Current filter configuration acknowledgement
 * - keepalive: Connection keepalive
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import solarClient from '@/api/client';
import { MemoryInfo, LogMessage } from '@/api/types';

// Event type definitions
export type WSMessageType =
  | 'initial_status'
  | 'host_status'
  | 'log'
  | 'instance_state'
  | 'host_health'
  | 'request_start'
  | 'request_routed'
  | 'request_success'
  | 'request_error'
  | 'request_reroute'
  | 'gateway_request'
  | 'filter_status'
  | 'keepalive';

export interface HostStatusData {
  host_id: string;
  name?: string;
  status: 'online' | 'offline' | 'error';
  url?: string;
  memory?: MemoryInfo;
  connected?: boolean;
  last_seen?: string;
  timestamp?: string;
}

export interface LogEventData {
  seq: number;
  line: string;
  level?: string;
}

export interface InstanceStateData {
  busy: boolean;
  phase?: string | null;
  prefill_progress?: number | null;
  active_slots: number;
  slot_id?: number | null;
  task_id?: number | null;
  prefill_prompt_tokens?: number | null;
  generated_tokens?: number | null;
  decode_tps?: number | null;
  decode_ms_per_token?: number | null;
  checkpoint_index?: number | null;
  checkpoint_total?: number | null;
}

export interface RoutingEventData {
  request_id: string;
  model?: string;
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
  attempt?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  decode_tps?: number;
}

// Gateway request summary (completed request)
export interface GatewayRequestSummary {
  request_id: string;
  request_type?: string; // chat, completion, embedding, classification, etc.
  status: 'success' | 'error' | 'missed';
  model?: string;
  resolved_model?: string;
  endpoint?: string;
  client_ip?: string;
  stream?: boolean;
  attempts: number;
  start_timestamp?: string;
  end_timestamp: string;
  duration_s?: number;
  host_id?: string;
  host_name?: string;
  instance_id?: string;
  instance_url?: string;
  error_message?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  decode_tps?: number;
  decode_ms_per_token?: number;
}

// Gateway filter configuration
export interface GatewayFilter {
  status: string; // all, success, error, missed
  request_type: string; // all, chat, completion, embedding, classification
  model?: string | null;
  host_id?: string | null;
}

export interface WSEvent {
  type: WSMessageType;
  host_id?: string;
  host_name?: string;
  instance_id?: string;
  timestamp?: string;
  data?: any;
  filter?: GatewayFilter;
}

export interface RequestState {
  request_id: string;
  model?: string;
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

// Event handlers interface
export interface EventHandlers {
  onHostStatus?: (data: HostStatusData) => void;
  onInitialStatus?: (hosts: HostStatusData[]) => void;
  onLog?: (hostId: string, instanceId: string, data: LogEventData) => void;
  onInstanceState?: (hostId: string, instanceId: string, data: InstanceStateData) => void;
  onRoutingEvent?: (type: WSMessageType, data: RoutingEventData) => void;
  onGatewayRequest?: (data: GatewayRequestSummary) => void;
  onFilterStatus?: (filter: GatewayFilter) => void;
}

const DEFAULT_FILTER: GatewayFilter = {
  status: 'all',
  request_type: 'all',
  model: null,
  host_id: null,
};

export function useEventStream(handlers: EventHandlers = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [hosts, setHosts] = useState<Map<string, HostStatusData>>(new Map());
  const [requests, setRequests] = useState<Map<string, RequestState>>(new Map());
  const [instanceStates, setInstanceStates] = useState<Map<string, InstanceStateData>>(new Map());
  const [logs, setLogs] = useState<Map<string, LogMessage[]>>(new Map());
  const [gatewayRequests, setGatewayRequests] = useState<GatewayRequestSummary[]>([]);
  const [gatewayFilter, setGatewayFilter] = useState<GatewayFilter>(DEFAULT_FILTER);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref updated
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const updateRequest = useCallback((requestId: string, updates: Partial<RequestState>) => {
    setRequests((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(requestId);
      if (existing) {
        newMap.set(requestId, { ...existing, ...updates });
      } else {
        newMap.set(requestId, {
          request_id: requestId,
          status: 'pending',
          timestamp: new Date().toISOString(),
          ...updates,
        } as RequestState);
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

  const handleEvent = useCallback((event: WSEvent) => {
    const h = handlersRef.current;

    switch (event.type) {
      case 'initial_status':
        if (Array.isArray(event.data)) {
          const hostMap = new Map<string, HostStatusData>();
          event.data.forEach((host: HostStatusData) => {
            hostMap.set(host.host_id, host);
          });
          setHosts(hostMap);
          h.onInitialStatus?.(event.data);
        }
        break;

      case 'host_status':
        if (event.data) {
          setHosts((prev) => {
            const newMap = new Map(prev);
            newMap.set(event.data.host_id, event.data);
            return newMap;
          });
          h.onHostStatus?.(event.data);
        }
        break;

      case 'log':
        if (event.host_id && event.instance_id && event.data) {
          const key = `${event.host_id}:${event.instance_id}`;
          const logMsg: LogMessage = {
            seq: event.data.seq,
            timestamp: event.timestamp || new Date().toISOString(),
            line: event.data.line,
          };
          setLogs((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(key) || [];
            // Keep last 1000 logs
            const updated = [...existing, logMsg].slice(-1000);
            newMap.set(key, updated);
            return newMap;
          });
          h.onLog?.(event.host_id, event.instance_id, event.data);
        }
        break;

      case 'instance_state':
        if (event.host_id && event.instance_id && event.data) {
          const key = `${event.host_id}:${event.instance_id}`;
          setInstanceStates((prev) => {
            const newMap = new Map(prev);
            newMap.set(key, event.data);
            return newMap;
          });
          h.onInstanceState?.(event.host_id, event.instance_id, event.data);
        }
        break;

      case 'host_health':
        if (event.host_id && event.data) {
          const hostId = event.host_id;
          setHosts((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(hostId);
            if (existing) {
              newMap.set(hostId, {
                ...existing,
                memory: event.data.memory,
              });
            }
            return newMap;
          });
        }
        break;

      case 'request_start':
        if (event.data?.request_id) {
          updateRequest(event.data.request_id, {
            model: event.data.model,
            endpoint: event.data.endpoint,
            status: 'pending',
            timestamp: event.data.timestamp,
            stream: event.data.stream,
            client_ip: event.data.client_ip,
          });
          h.onRoutingEvent?.(event.type, event.data);
        }
        break;

      case 'request_routed':
        if (event.data?.request_id) {
          updateRequest(event.data.request_id, {
            host_id: event.data.host_id,
            host_name: event.data.host_name,
            instance_id: event.data.instance_id,
            instance_url: event.data.instance_url,
            resolved_model: event.data.resolved_model,
            status: 'processing',
          });
          h.onRoutingEvent?.(event.type, event.data);
        }
        break;

      case 'request_success':
        if (event.data?.request_id) {
          updateRequest(event.data.request_id, {
            status: 'success',
            duration: event.data.duration,
          });
          h.onRoutingEvent?.(event.type, event.data);
          // Auto-remove after 5 seconds
          setTimeout(() => {
            removeRequest(event.data.request_id);
          }, 5000);
        }
        break;

      case 'request_error':
        if (event.data?.request_id) {
          updateRequest(event.data.request_id, {
            status: 'error',
            error_message: event.data.error_message,
            duration: event.data.duration,
            host_id: event.data.host_id,
            instance_id: event.data.instance_id,
          });
          h.onRoutingEvent?.(event.type, event.data);
        }
        break;

      case 'request_reroute':
        h.onRoutingEvent?.(event.type, event.data);
        break;

      case 'gateway_request':
        // Completed request summary
        if (event.data) {
          const summary: GatewayRequestSummary = event.data;
          setGatewayRequests((prev) => {
            // Add to front, keep last 500
            const updated = [summary, ...prev].slice(0, 500);
            return updated;
          });
          h.onGatewayRequest?.(summary);
        }
        break;

      case 'filter_status':
        // Filter configuration acknowledgement
        if (event.filter) {
          setGatewayFilter(event.filter);
          h.onFilterStatus?.(event.filter);
        }
        break;

      case 'keepalive':
        // Ignore keepalives
        break;
    }
  }, [updateRequest, removeRequest]);

  // Send filter update to server
  // Using functional update to avoid dependency on gatewayFilter (prevents infinite re-render loop)
  const setFilter = useCallback((filter: Partial<GatewayFilter>) => {
    setGatewayFilter((prevFilter) => {
      const newFilter: GatewayFilter = {
        ...prevFilter,
        ...filter,
      };
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'set_filter',
          filter: newFilter,
        }));
      }
      
      return newFilter;
    });
  }, []);

  // Clear gateway requests (when filter changes)
  const clearGatewayRequests = useCallback(() => {
    setGatewayRequests([]);
  }, []);

  const connect = useCallback(() => {
    const wsUrl = solarClient.getControlWebSocketUrl('/ws/events');

    console.log('EventStream: Connecting to', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('EventStream: Connected');
      setIsConnected(true);
      wsRef.current = ws;

      // Send ping every 25 seconds
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string' && event.data === 'pong') {
        return;
      }

      try {
        const message: WSEvent = JSON.parse(event.data);
        handleEvent(message);
      } catch (error) {
        console.error('EventStream: Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('EventStream: WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('EventStream: Disconnected, reconnecting in 5s...');
      setIsConnected(false);
      wsRef.current = null;

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 5000);
    };

    return ws;
  }, [handleEvent]);

  useEffect(() => {
    const ws = connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [connect]);

  // Helper to get logs for a specific instance
  const getInstanceLogs = useCallback(
    (hostId: string, instanceId: string): LogMessage[] => {
      return logs.get(`${hostId}:${instanceId}`) || [];
    },
    [logs]
  );

  // Helper to get state for a specific instance
  const getInstanceState = useCallback(
    (hostId: string, instanceId: string): InstanceStateData | undefined => {
      return instanceStates.get(`${hostId}:${instanceId}`);
    },
    [instanceStates]
  );

  // Helper to clear logs for an instance
  const clearInstanceLogs = useCallback((hostId: string, instanceId: string) => {
    setLogs((prev) => {
      const newMap = new Map(prev);
      newMap.delete(`${hostId}:${instanceId}`);
      return newMap;
    });
  }, []);

  return {
    isConnected,
    hosts,
    requests,
    instanceStates,
    logs,
    gatewayRequests,
    gatewayFilter,
    getInstanceLogs,
    getInstanceState,
    clearInstanceLogs,
    removeRequest,
    setFilter,
    clearGatewayRequests,
  };
}
