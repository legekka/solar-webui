import { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { X, Pause, Play } from 'lucide-react';

interface LogViewerProps {
  hostUrl: string;
  instanceId: string;
  alias: string;
  onClose: () => void;
}

export function LogViewer({ hostUrl, instanceId, alias, onClose }: LogViewerProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Build WebSocket URL
  const wsUrl = hostUrl ? `${hostUrl.replace(/^http/, 'ws')}/instances/${instanceId}/logs` : null;
  
  const { isConnected, messages } = useWebSocket({
    url: wsUrl,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-nord-1 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-nord-3">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-nord-3">
          <div>
            <h2 className="text-lg font-semibold text-nord-6">{alias} - Logs</h2>
            <p className="text-sm text-nord-4">
              {isConnected ? (
                <span className="text-nord-14">● Connected</span>
              ) : (
                <span className="text-nord-11">● Disconnected</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className="p-2 hover:bg-nord-2 rounded transition-colors text-nord-4"
              title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
            >
              {autoScroll ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-nord-2 rounded transition-colors text-nord-4"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Log content */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-nord-0 text-nord-6 font-mono text-sm"
        >
          {messages.length === 0 ? (
            <div className="text-nord-3">Waiting for logs...</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.seq} className="whitespace-pre-wrap break-words">
                <span className="text-nord-3">[{msg.timestamp}]</span> {msg.line}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-nord-3 bg-nord-2 text-sm text-nord-4">
          {messages.length} log messages
        </div>
      </div>
    </div>
  );
}

