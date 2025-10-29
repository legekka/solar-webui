import { useState } from 'react';
import { Play, Square, RotateCw, FileText, Trash2, Edit } from 'lucide-react';
import { Instance, InstanceConfig } from '@/api/types';
import { cn, getStatusColor, formatUptime } from '@/lib/utils';
import { LogViewer } from './LogViewer';
import { EditInstanceModal } from './EditInstanceModal';

interface InstanceCardProps {
  instance: Instance;
  hostId: string;
  onStart: (hostId: string, instanceId: string) => Promise<void>;
  onStop: (hostId: string, instanceId: string) => Promise<void>;
  onRestart: (hostId: string, instanceId: string) => Promise<void>;
  onUpdate: (hostId: string, instanceId: string, config: InstanceConfig) => Promise<void>;
  onDelete: (hostId: string, instanceId: string) => Promise<void>;
}

export function InstanceCard({
  instance,
  hostId,
  onStart,
  onStop,
  onRestart,
  onUpdate,
  onDelete,
}: InstanceCardProps) {
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

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
      <div className="bg-nord-2 rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow border border-nord-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate text-nord-6">{instance.config.alias}</h3>
            <p className="text-sm text-nord-4 truncate" title={instance.config.model}>
              {instance.config.model}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span
              className={cn(
                'px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                getStatusColor(instance.status)
              )}
            >
              {instance.status}
            </span>
            {(instance.status === 'stopped' || instance.status === 'failed') && (
              <>
                <button
                  onClick={() => setShowEdit(true)}
                  disabled={loading}
                  className="p-1 hover:bg-nord-10 hover:bg-opacity-20 text-nord-10 rounded transition-colors disabled:opacity-50"
                  title="Edit instance"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleAction(() => onDelete(hostId, instance.id))}
                  disabled={loading}
                  className="p-1 hover:bg-nord-11 hover:bg-opacity-20 text-nord-11 rounded transition-colors disabled:opacity-50"
                  title="Delete instance"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1 text-sm text-nord-4 mb-3">
          {instance.port && (
            <div className="flex justify-between">
              <span>Port:</span>
              <span className="font-mono text-nord-8">{instance.port}</span>
            </div>
          )}
          {instance.pid && (
            <div className="flex justify-between">
              <span>PID:</span>
              <span className="font-mono text-nord-8">{instance.pid}</span>
            </div>
          )}
          {instance.started_at && (
            <div className="flex justify-between">
              <span>Uptime:</span>
              <span className="font-mono text-nord-8">{formatUptime(instance.started_at)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Context:</span>
            <span className="font-mono text-nord-8">{instance.config.ctx_size.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>GPU Layers:</span>
            <span className="font-mono text-nord-8">{instance.config.n_gpu_layers}</span>
          </div>
        </div>

        {/* Error message */}
        {instance.error_message && (
          <div className="mb-3 p-2 bg-nord-11 bg-opacity-20 text-nord-11 text-xs rounded border border-nord-11">
            {instance.error_message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {instance.status === 'stopped' || instance.status === 'failed' ? (
            <button
              onClick={() => handleAction(() => onStart(hostId, instance.id))}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-nord-14 text-nord-0 rounded hover:bg-opacity-90 transition-colors disabled:opacity-50 font-medium"
            >
              <Play size={16} />
              Start
            </button>
          ) : instance.status === 'running' ? (
            <>
              <button
                onClick={() => handleAction(() => onStop(hostId, instance.id))}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-nord-11 text-nord-6 rounded hover:bg-opacity-90 transition-colors disabled:opacity-50 font-medium"
              >
                <Square size={16} />
                Stop
              </button>
              <button
                onClick={() => handleAction(() => onRestart(hostId, instance.id))}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-nord-10 text-nord-6 rounded hover:bg-nord-9 transition-colors disabled:opacity-50 font-medium"
              >
                <RotateCw size={16} />
                Restart
              </button>
            </>
          ) : (
            <button
              disabled
              className="flex-1 px-3 py-2 bg-nord-3 text-nord-4 rounded cursor-not-allowed"
            >
              {instance.status}...
            </button>
          )}
          <button
            onClick={() => setShowLogs(true)}
            className="px-3 py-2 border border-nord-3 text-nord-4 rounded hover:bg-nord-3 transition-colors"
            title="View logs"
          >
            <FileText size={16} />
          </button>
        </div>
      </div>

      {/* Log Viewer Modal */}
      {showLogs && (
        <LogViewer
          hostId={hostId}
          instanceId={instance.id}
          alias={instance.config.alias}
          onClose={() => setShowLogs(false)}
        />
      )}

      {/* Edit Instance Modal */}
      {showEdit && (
        <EditInstanceModal
          instance={instance}
          hostId={hostId}
          onClose={() => setShowEdit(false)}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}

