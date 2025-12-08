/**
 * useInstanceState - Hook for getting instance runtime state
 *
 * WebSocket 2.0: This hook now uses the unified EventStreamContext
 * instead of a direct WebSocket connection to the proxy endpoint.
 */

import { useCallback, useEffect, useState } from 'react';
import solarClient from '@/api/client';
import { InstanceRuntimeState } from '@/api/types';

// Try to use EventStreamContext if available
let useEventStreamContext: () => {
  getInstanceState: (hostId: string, instanceId: string) => any;
  isConnected: boolean;
} | null = null;

try {
  // Dynamic import to avoid circular dependencies
  const context = require('@/context/EventStreamContext');
  useEventStreamContext = context.useEventStreamContext;
} catch {
  // Context not available, will fall back to REST polling
}

export function useInstanceState(hostId: string, instanceId: string) {
  const [state, setState] = useState<InstanceRuntimeState | null>(null);
  const [connected, setConnected] = useState(false);

  // Try to use EventStreamContext
  let eventStreamState: any = null;
  let eventStreamConnected = false;

  try {
    if (useEventStreamContext) {
      const ctx = useEventStreamContext();
      eventStreamState = ctx.getInstanceState(hostId, instanceId);
      eventStreamConnected = ctx.isConnected;
    }
  } catch {
    // Not inside EventStreamProvider, use fallback
  }

  // Update state from event stream
  useEffect(() => {
    if (eventStreamState) {
      setState({
        instance_id: instanceId,
        busy: eventStreamState.busy || false,
        phase: eventStreamState.phase || 'idle',
        prefill_progress: eventStreamState.prefill_progress,
        active_slots: eventStreamState.active_slots || 0,
        slot_id: eventStreamState.slot_id,
        task_id: eventStreamState.task_id,
        prefill_prompt_tokens: eventStreamState.prefill_prompt_tokens,
        generated_tokens: eventStreamState.generated_tokens,
        decode_tps: eventStreamState.decode_tps,
        decode_ms_per_token: eventStreamState.decode_ms_per_token,
        checkpoint_index: eventStreamState.checkpoint_index,
        checkpoint_total: eventStreamState.checkpoint_total,
        timestamp: new Date().toISOString(),
      });
      setConnected(eventStreamConnected);
    }
  }, [eventStreamState, eventStreamConnected, instanceId]);

  // Fetch initial state via REST
  useEffect(() => {
    if (!hostId || !instanceId) return;

    let cancelled = false;
    (async () => {
      try {
        const snapshot = await solarClient.getInstanceState(hostId, instanceId);
        if (!cancelled) setState(snapshot);
      } catch {
        // Ignore initial fetch errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hostId, instanceId]);

  // If not using EventStreamContext, poll periodically as fallback
  useEffect(() => {
    if (eventStreamConnected) return; // Don't poll if WS connected

    const poll = async () => {
      try {
        const snapshot = await solarClient.getInstanceState(hostId, instanceId);
        setState(snapshot);
      } catch {
        // Ignore poll errors
      }
    };

    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [hostId, instanceId, eventStreamConnected]);

  return {
    state,
    connected: eventStreamConnected || connected,
  };
}
