import { useState } from 'react';
import { Play, Square, RotateCw, FileText } from 'lucide-react';
import { Instance } from '@/api/types';
import { cn, getStatusColor, formatUptime } from '@/lib/utils';
import { LogViewer } from './LogViewer';

interface InstanceCardProps {
  instance: Instance;
  hostId: string;
  hostUrl: string;
  onStart: (hostId: string, instanceId: string) => Promise<void>;
  onStop: (hostId: string, instanceId: string) => Promise<void>;
  onRestart: (hostId: string, instanceId: string) => Promise<void>;
}

export function InstanceCard({
  instance,
  hostId,
  hostUrl,
  onStart,
  onStop,
  onRestart,
}: InstanceCardProps) {
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{instance.config.alias}</h3>
            <p className="text-sm text-gray-500 truncate">{instance.config.model}</p>
          </div>
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              getStatusColor(instance.status)
            )}
          >
            {instance.status}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-1 text-sm text-gray-600 mb-3">
          {instance.port && (
            <div className="flex justify-between">
              <span>Port:</span>
              <span className="font-mono">{instance.port}</span>
            </div>
          )}
          {instance.pid && (
            <div className="flex justify-between">
              <span>PID:</span>
              <span className="font-mono">{instance.pid}</span>
            </div>
          )}
          {instance.started_at && (
            <div className="flex justify-between">
              <span>Uptime:</span>
              <span className="font-mono">{formatUptime(instance.started_at)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Context:</span>
            <span className="font-mono">{instance.config.ctx_size.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>GPU Layers:</span>
            <span className="font-mono">{instance.config.n_gpu_layers}</span>
          </div>
        </div>

        {/* Error message */}
        {instance.error_message && (
          <div className="mb-3 p-2 bg-red-50 text-red-700 text-xs rounded">
            {instance.error_message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {instance.status === 'stopped' || instance.status === 'failed' ? (
            <button
              onClick={() => handleAction(() => onStart(hostId, instance.id))}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Play size={16} />
              Start
            </button>
          ) : instance.status === 'running' ? (
            <>
              <button
                onClick={() => handleAction(() => onStop(hostId, instance.id))}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Square size={16} />
                Stop
              </button>
              <button
                onClick={() => handleAction(() => onRestart(hostId, instance.id))}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RotateCw size={16} />
                Restart
              </button>
            </>
          ) : (
            <button
              disabled
              className="flex-1 px-3 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed"
            >
              {instance.status}...
            </button>
          )}
          <button
            onClick={() => setShowLogs(true)}
            className="px-3 py-2 border rounded hover:bg-gray-50 transition-colors"
            title="View logs"
          >
            <FileText size={16} />
          </button>
        </div>
      </div>

      {/* Log Viewer Modal */}
      {showLogs && (
        <LogViewer
          hostUrl={hostUrl}
          instanceId={instance.id}
          alias={instance.config.alias}
          onClose={() => setShowLogs(false)}
        />
      )}
    </>
  );
}

