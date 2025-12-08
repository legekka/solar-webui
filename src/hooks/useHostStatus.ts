/**
 * useHostStatus - Hook for subscribing to host status updates
 *
 * WebSocket 2.0: This hook now uses the unified EventStreamContext
 * instead of a separate WebSocket connection.
 */

import { useEffect, useCallback } from 'react';
import { MemoryInfo } from '@/api/types';

interface HostStatusUpdate {
  host_id: string;
  name: string;
  status: string;
  url: string;
  memory?: MemoryInfo;
}

// Try to use EventStreamContext if available
let useEventStreamContext: () => {
  hosts: Map<string, any>;
  isConnected: boolean;
} | null = null;

try {
  const context = require('@/context/EventStreamContext');
  useEventStreamContext = context.useEventStreamContext;
} catch {
  // Context not available
}

export function useHostStatus(
  onStatusUpdate: (update: HostStatusUpdate) => void,
  onInitialStatus: (statuses: HostStatusUpdate[]) => void
) {
  // Try to use EventStreamContext
  useEffect(() => {
    if (!useEventStreamContext) return;

    try {
      const ctx = useEventStreamContext();

      // Convert hosts map to array and call onInitialStatus
      if (ctx.hosts.size > 0) {
        const statuses: HostStatusUpdate[] = Array.from(ctx.hosts.values()).map((h) => ({
          host_id: h.host_id,
          name: h.name || '',
          status: h.status,
          url: h.url || '',
          memory: h.memory,
        }));
        onInitialStatus(statuses);
      }
    } catch {
      // Not inside EventStreamProvider
    }
  }, [onInitialStatus]);

  // The event stream will call handlers automatically through the context
  // Individual updates are handled by the EventStreamContext
}
