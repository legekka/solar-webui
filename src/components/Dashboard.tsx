import { useState } from 'react';
import { useInstances } from '@/hooks/useInstances';
import { HostCard } from './HostCard';
import { AddHostModal } from './AddHostModal';
import { Plus, RefreshCw, AlertCircle, Server } from 'lucide-react';
import solarClient from '@/api/client';

export function Dashboard() {
  const {
    hosts,
    loading,
    error,
    refresh,
    startInstance,
    stopInstance,
    restartInstance,
  } = useInstances();
  
  const [showAddHost, setShowAddHost] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleDeleteHost = async (hostId: string) => {
    if (!confirm('Are you sure you want to remove this host?')) return;
    
    try {
      await solarClient.deleteHost(hostId);
      await refresh();
    } catch (error) {
      console.error('Failed to delete host:', error);
      alert('Failed to delete host');
    }
  };

  const handleCreateInstance = async (hostId: string, config: any) => {
    try {
      await solarClient.createInstance(hostId, config);
      await refresh();
    } catch (error) {
      console.error('Failed to create instance:', error);
      throw error;
    }
  };

  const handleUpdateInstance = async (hostId: string, instanceId: string, config: any) => {
    try {
      await solarClient.updateInstance(hostId, instanceId, config);
      await refresh();
    } catch (error) {
      console.error('Failed to update instance:', error);
      throw error;
    }
  };

  const handleDeleteInstance = async (hostId: string, instanceId: string) => {
    if (!confirm('Are you sure you want to delete this instance?')) return;
    
    try {
      await solarClient.deleteInstance(hostId, instanceId);
      await refresh();
    } catch (error) {
      console.error('Failed to delete instance:', error);
      alert('Failed to delete instance');
    }
  };

  if (loading && hosts.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 60px)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nord-9 mx-auto mb-4"></div>
          <p className="text-nord-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-nord-0">
      {/* Header */}
      <header className="bg-nord-1 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-nord-6">Solar Dashboard</h1>
              <p className="text-sm text-nord-4 mt-1">
                Multi-Host LLM Manager
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-nord-3 text-nord-6 rounded-lg hover:bg-nord-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={() => setShowAddHost(true)}
                className="flex items-center gap-2 px-4 py-2 bg-nord-10 text-nord-6 rounded-lg hover:bg-nord-9 transition-colors"
              >
                <Plus size={18} />
                Add Host
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-nord-11 bg-opacity-20 border border-nord-11 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-nord-11 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-semibold text-nord-6">Error</h3>
              <p className="text-sm text-nord-4">{error}</p>
            </div>
          </div>
        )}

        {hosts.length === 0 ? (
          <div className="text-center py-16">
            <Server size={64} className="mx-auto text-nord-3 mb-4" />
            <h2 className="text-2xl font-semibold text-nord-6 mb-2">
              No hosts configured
            </h2>
            <p className="text-nord-4 mb-6">
              Add your first solar-host to get started
            </p>
            <button
              onClick={() => setShowAddHost(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-nord-10 text-nord-6 rounded-lg hover:bg-nord-9 transition-colors"
            >
              <Plus size={20} />
              Add Host
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {hosts.map((host) => (
              <HostCard
                key={host.id}
                host={host}
                onStartInstance={startInstance}
                onStopInstance={stopInstance}
                onRestartInstance={restartInstance}
                onUpdateInstance={handleUpdateInstance}
                onDeleteInstance={handleDeleteInstance}
                onCreateInstance={handleCreateInstance}
                onDeleteHost={handleDeleteHost}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showAddHost && (
        <AddHostModal
          onClose={() => setShowAddHost(false)}
          onSuccess={() => refresh()}
        />
      )}
    </div>
  );
}

