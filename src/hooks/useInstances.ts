import { useState, useEffect, useCallback, useMemo } from 'react';
import solarClient from '@/api/client';
import { Host, Instance } from '@/api/types';
import { useRoutingEventsContext } from '@/context/RoutingEventsContext';

interface HostWithInstances extends Host {
  instances: Instance[];
}

export function useInstances(refreshInterval = 30000) {
  // Increased default to 30s since WebSocket handles real-time updates
  const [hosts, setHosts] = useState<HostWithInstances[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hostStatuses, routingConnected } = useRoutingEventsContext();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch all hosts
      const hostsData = await solarClient.getHosts();
      
      // Fetch instances for each host
      const hostsWithInstances = await Promise.all(
        hostsData.map(async (host) => {
          try {
            const instances = await solarClient.getHostInstances(host.id);
            return { ...host, instances };
          } catch (err) {
            console.error(`Failed to fetch instances for host ${host.name}:`, err);
            return { ...host, instances: [] };
          }
        })
      );
      
      setHosts(hostsWithInstances);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Failed to fetch hosts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh at a slower rate (WebSocket handles real-time updates)
  useEffect(() => {
    // If connected via WebSocket, poll less frequently
    const interval = routingConnected ? refreshInterval : 10000;
    const timer = setInterval(fetchData, interval);
    return () => clearInterval(timer);
  }, [fetchData, refreshInterval, routingConnected]);

  const startInstance = useCallback(async (hostId: string, instanceId: string) => {
    try {
      await solarClient.startInstance(hostId, instanceId);
      // Immediate refresh after action
      await fetchData();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to start instance');
    }
  }, [fetchData]);

  const stopInstance = useCallback(async (hostId: string, instanceId: string) => {
    try {
      await solarClient.stopInstance(hostId, instanceId);
      await fetchData();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to stop instance');
    }
  }, [fetchData]);

  const restartInstance = useCallback(async (hostId: string, instanceId: string) => {
    try {
      await solarClient.restartInstance(hostId, instanceId);
      await fetchData();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to restart instance');
    }
  }, [fetchData]);

  // Merge WebSocket status updates into hosts data
  const mergedHosts = useMemo(() => {
    if (!hostStatuses || hostStatuses.size === 0) return hosts;
    
    return hosts.map((host) => {
      const wsStatus = hostStatuses.get(host.id);
      if (!wsStatus) return host;
      return {
        ...host,
        status: wsStatus.status as any,
        memory: wsStatus.memory || host.memory,
      };
    });
  }, [hosts, hostStatuses]);

  return {
    hosts: mergedHosts,
    loading,
    error,
    refresh: fetchData,
    startInstance,
    stopInstance,
    restartInstance,
  };
}
