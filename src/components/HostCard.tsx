import { useState } from 'react';
import { Instance, InstanceConfig } from '@/api/types';
import { cn, getStatusColor, formatDate } from '@/lib/utils';
import { InstanceCard } from './InstanceCard';
import { AddInstanceModal } from './AddInstanceModal';
import { Server, Trash2, Plus } from 'lucide-react';

interface HostCardProps {
  host: {
    id: string;
    name: string;
    url: string;
    api_key: string;
    status: string;
    last_seen?: string;
    instances: Instance[];
  };
  onStartInstance: (hostId: string, instanceId: string) => Promise<void>;
  onStopInstance: (hostId: string, instanceId: string) => Promise<void>;
  onRestartInstance: (hostId: string, instanceId: string) => Promise<void>;
  onUpdateInstance: (hostId: string, instanceId: string, config: InstanceConfig) => Promise<void>;
  onDeleteInstance: (hostId: string, instanceId: string) => Promise<void>;
  onCreateInstance: (hostId: string, config: InstanceConfig) => Promise<void>;
  onDeleteHost: (hostId: string) => Promise<void>;
}

export function HostCard({
  host,
  onStartInstance,
  onStopInstance,
  onRestartInstance,
  onUpdateInstance,
  onDeleteInstance,
  onCreateInstance,
  onDeleteHost,
}: HostCardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const runningCount = host.instances.filter((i) => i.status === 'running').length;

  return (
    <>
    <div className="bg-nord-1 rounded-lg shadow-lg overflow-hidden">
      {/* Host Header */}
      <div className="bg-gradient-to-r from-nord-10 to-nord-9 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Server size={24} />
            <div>
              <h2 className="text-xl font-bold text-nord-6">{host.name}</h2>
              <p className="text-sm text-nord-4">{host.url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                getStatusColor(host.status)
              )}
            >
              {host.status}
            </span>
            <button
              onClick={() => onDeleteHost(host.id)}
              className="p-2 hover:bg-nord-8 hover:bg-opacity-30 rounded transition-colors text-nord-6"
              title="Remove host"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-nord-4">
          <span>
            {runningCount} / {host.instances.length} instances running
          </span>
          <div className="flex items-center gap-2">
            {host.last_seen && <span>Last seen: {formatDate(host.last_seen)}</span>}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-3 py-1 bg-nord-6 hover:bg-nord-5 rounded transition-colors text-sm font-medium text-nord-0 shadow-md"
              title="Add instance"
            >
              <Plus size={16} />
              Add Instance
            </button>
          </div>
        </div>
      </div>

      {/* Instances */}
      <div className="p-4">
        {host.instances.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No instances configured</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Add First Instance
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {host.instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                hostId={host.id}
                onStart={onStartInstance}
                onStop={onStopInstance}
                onRestart={onRestartInstance}
                onUpdate={onUpdateInstance}
                onDelete={onDeleteInstance}
              />
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Add Instance Modal */}
    {showAddModal && (
      <AddInstanceModal
        hostId={host.id}
        hostName={host.name}
        onClose={() => setShowAddModal(false)}
        onCreate={onCreateInstance}
      />
    )}
    </>
  );
}

