import { useEffect, useRef, useState, useCallback } from 'react';

export interface RoutingEvent {
  type: 'request_start' | 'request_routed' | 'request_success' | 'request_error' | 'keepalive';
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
}

export function useRoutingEvents(baseUrl: string) {
  const [requests, setRequests] = useState<Map<string, RequestState>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const updateRequest = useCallback((requestId: string, updates: Partial<RequestState>) => {
    setRequests((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(requestId);
      if (existing) {
        newMap.set(requestId, { ...existing, ...updates });
      } else {
        // Create new request entry
        newMap.set(requestId, { request_id: requestId, status: 'pending', timestamp: new Date().toISOString(), ...updates } as RequestState);
      }
      return newMap;
    });
  }, []);

  const removeRequest = useCallback((requestId: string) => {
    setRequests((prev) => {
      const newMap = new Map(prev);
      newMap.delete(requestId);
      return newMap;
    });
  }, []);

  const handleEvent = useCallback((event: RoutingEvent) => {
    if (event.type === 'keepalive' || !event.data) return;

    const { request_id, ...data } = event.data;

    switch (event.type) {
      case 'request_start':
        updateRequest(request_id, {
          model: data.model,
          endpoint: data.endpoint,
          status: 'pending',
          timestamp: data.timestamp,
          stream: data.stream,
          client_ip: data.client_ip,
        });
        break;

      case 'request_routed':
        updateRequest(request_id, {
          host_id: data.host_id,
          host_name: data.host_name,
          instance_id: data.instance_id,
          instance_url: data.instance_url,
          resolved_model: data.resolved_model,
          status: 'processing',
        });
        break;

      case 'request_success':
        updateRequest(request_id, {
          status: 'success',
          duration: data.duration,
        });
        // Auto-remove successful requests after 5 seconds
        setTimeout(() => {
          removeRequest(request_id);
        }, 5000);
        break;

      case 'request_error':
        updateRequest(request_id, {
          status: 'error',
          error_message: data.error_message,
          duration: data.duration,
          host_id: data.host_id,
          instance_id: data.instance_id,
        });
        // Error requests stay until manually dismissed
        break;
    }
  }, [updateRequest, removeRequest]);

  const connect = useCallback(() => {
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const url = baseUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${url}/ws/routing`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      // Send ping every 25 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send('ping');
        } else {
          clearInterval(pingInterval);
        }
      }, 25000);
    };

    wsRef.current.onmessage = (event) => {
      // Ignore plain text responses like "pong"
      if (typeof event.data === 'string' && event.data === 'pong') {
        return;
      }

      try {
        const message = JSON.parse(event.data);
        handleEvent(message as RoutingEvent);
      } catch (error) {
        console.error('Failed to parse routing event:', error);
      }
    };

    wsRef.current.onclose = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000); // Reconnect after 5 seconds
    };

    wsRef.current.onerror = () => {
      wsRef.current?.close();
    };
  }, [baseUrl, handleEvent]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    requests,
    removeRequest,
  };
}

