/**
 * useInstanceState - Hook for getting instance runtime state
 *
 * WebSocket 2.0: This hook uses the unified EventStreamContext.
 * Falls back to REST polling only when EventStreamContext is not available.
 */

import { useEffect, useState, useMemo } from 'react';
import solarClient from '@/api/client';
import { InstanceRuntimeState } from '@/api/types';
import { useEventStreamContext } from '@/context/EventStreamContext';

export function useInstanceState(hostId: string, instanceId: string) {
  const [restState, setRestState] = useState<InstanceRuntimeState | null>(null);
  
  // Get state from EventStreamContext
  let eventStreamState: any = undefined;
  let eventStreamConnected = false;
  
  try {
    const ctx = useEventStreamContext();
    eventStreamState = ctx.getInstanceState(hostId, instanceId);
    eventStreamConnected = ctx.isConnected;
  } catch {
    // Not inside EventStreamProvider - will use REST polling
  }

  // Convert event stream state to InstanceRuntimeState format
  const wsState = useMemo<InstanceRuntimeState | null>(() => {
    if (!eventStreamState) return null;
    return {
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
    };
  }, [eventStreamState, instanceId]);

  // Fetch initial state via REST (one-time on mount)
  useEffect(() => {
    if (!hostId || !instanceId) return;

    let cancelled = false;
    (async () => {
      try {
        const snapshot = await solarClient.getInstanceState(hostId, instanceId);
        if (!cancelled) setRestState(snapshot);
      } catch {
        // Ignore initial fetch errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hostId, instanceId]);

  // Only poll if NOT connected via WebSocket
  useEffect(() => {
    if (eventStreamConnected) return; // Don't poll when WS is connected
    if (!hostId || !instanceId) return;

    const poll = async () => {
      try {
        const snapshot = await solarClient.getInstanceState(hostId, instanceId);
        setRestState(snapshot);
      } catch {
        // Ignore poll errors
      }
    };

    const interval = setInterval(poll, 5000); // Poll every 5s as fallback
    return () => clearInterval(interval);
  }, [hostId, instanceId, eventStreamConnected]);

  // Prefer WebSocket state, fall back to REST state
  const state = wsState || restState;

  return {
    state,
    connected: eventStreamConnected,
  };
}
