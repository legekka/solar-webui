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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{alias} - Logs</h2>
            <p className="text-sm text-gray-500">
              {isConnected ? (
                <span className="text-green-600">● Connected</span>
              ) : (
                <span className="text-red-600">● Disconnected</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
            >
              {autoScroll ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Log content */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-gray-900 text-gray-100 font-mono text-sm"
        >
          {messages.length === 0 ? (
            <div className="text-gray-500">Waiting for logs...</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.seq} className="whitespace-pre-wrap break-words">
                <span className="text-gray-500">[{msg.timestamp}]</span> {msg.line}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50 text-sm text-gray-600">
          {messages.length} log messages
        </div>
      </div>
    </div>
  );
}

