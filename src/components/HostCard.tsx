import { Instance } from '@/api/types';
import { cn, getStatusColor, formatDate } from '@/lib/utils';
import { InstanceCard } from './InstanceCard';
import { Server, Trash2 } from 'lucide-react';

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
  onDeleteHost: (hostId: string) => Promise<void>;
}

export function HostCard({
  host,
  onStartInstance,
  onStopInstance,
  onRestartInstance,
  onDeleteHost,
}: HostCardProps) {
  const runningCount = host.instances.filter((i) => i.status === 'running').length;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Host Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Server size={24} />
            <div>
              <h2 className="text-xl font-bold">{host.name}</h2>
              <p className="text-sm text-blue-100">{host.url}</p>
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
              className="p-2 hover:bg-blue-800 rounded transition-colors"
              title="Remove host"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span>
            {runningCount} / {host.instances.length} instances running
          </span>
          {host.last_seen && <span>Last seen: {formatDate(host.last_seen)}</span>}
        </div>
      </div>

      {/* Instances */}
      <div className="p-4">
        {host.instances.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No instances configured
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {host.instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                hostId={host.id}
                hostUrl={host.url}
                onStart={onStartInstance}
                onStop={onStopInstance}
                onRestart={onRestartInstance}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

