import { useState, useEffect, useCallback } from 'react';
import solarClient from '@/api/client';
import { Host, Instance } from '@/api/types';
import { useHostStatus } from './useHostStatus';

interface HostWithInstances extends Host {
  instances: Instance[];
}

export function useInstances(refreshInterval = 10000) {
  const [hosts, setHosts] = useState<HostWithInstances[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh
    const interval = setInterval(fetchData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const startInstance = useCallback(async (hostId: string, instanceId: string) => {
    try {
      await solarClient.startInstance(hostId, instanceId);
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

  // Handle real-time status updates from WebSocket
  const handleStatusUpdate = useCallback((update: { host_id: string; status: string }) => {
    setHosts((prevHosts) =>
      prevHosts.map((host) =>
        host.id === update.host_id
          ? { ...host, status: update.status as any }
          : host
      )
    );
  }, []);

  const handleInitialStatus = useCallback((statuses: Array<{ host_id: string; status: string }>) => {
    setHosts((prevHosts) =>
      prevHosts.map((host) => {
        const status = statuses.find((s) => s.host_id === host.id);
        return status ? { ...host, status: status.status as any } : host;
      })
    );
  }, []);

  // Connect to status WebSocket
  const baseUrl = import.meta.env.VITE_SOLAR_CONTROL_URL || 'http://localhost:8000';
  useHostStatus(baseUrl, handleStatusUpdate, handleInitialStatus);

  return {
    hosts,
    loading,
    error,
    refresh: fetchData,
    startInstance,
    stopInstance,
    restartInstance,
  };
}

