import { useEffect, useCallback, useRef } from 'react';

interface HostStatusUpdate {
  host_id: string;
  name: string;
  status: string;
  url: string;
}

interface StatusMessage {
  type: 'initial_status' | 'host_status' | 'keepalive';
  data?: HostStatusUpdate | HostStatusUpdate[];
}

export function useHostStatus(
  baseUrl: string,
  onStatusUpdate: (update: HostStatusUpdate) => void,
  onInitialStatus: (statuses: HostStatusUpdate[]) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${baseUrl.replace(/^https?:\/\//, '')}/status`;

    console.log('Connecting to status WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Status WebSocket connected');
      wsRef.current = ws;

      // Send ping every 20 seconds to keep connection alive
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 20000);
    };

    ws.onmessage = (event) => {
      try {
        const message: StatusMessage = JSON.parse(event.data);

        if (message.type === 'initial_status' && Array.isArray(message.data)) {
          console.log('Received initial status:', message.data);
          onInitialStatus(message.data);
        } else if (message.type === 'host_status' && message.data && !Array.isArray(message.data)) {
          console.log('Host status update:', message.data);
          onStatusUpdate(message.data);
        } else if (message.type === 'keepalive') {
          // Just a keepalive, ignore
        }
      } catch (error) {
        console.error('Failed to parse status message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Status WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Status WebSocket disconnected, reconnecting in 5s...');
      wsRef.current = null;

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Attempt to reconnect after 5 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 5000);
    };

    return ws;
  }, [baseUrl, onStatusUpdate, onInitialStatus]);

  useEffect(() => {
    const ws = connect();

    return () => {
      // Cleanup on unmount
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
}

