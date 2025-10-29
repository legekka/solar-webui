import { useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { X } from 'lucide-react';
import { useRoutingEvents, RequestState } from '@/hooks/useRoutingEvents';
import { useInstances } from '@/hooks/useInstances';

const SOLAR_CONTROL_NODE_ID = 'solar-control';

function getStatusColor(status: RequestState['status']): string {
  switch (status) {
    case 'pending':
      return '#4C566A'; // nord3 - gray
    case 'routed':
    case 'processing':
      return '#D08770'; // nord12 - orange
    case 'success':
      return '#A3BE8C'; // nord14 - green
    case 'error':
      return '#BF616A'; // nord11 - red
    default:
      return '#4C566A'; // nord3
  }
}

export function RoutingGraph() {
  const baseUrl = import.meta.env.VITE_SOLAR_CONTROL_URL || 'http://localhost:8000';
  const { requests, removeRequest } = useRoutingEvents(baseUrl);
  const { hosts, loading } = useInstances(10000);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Build the graph structure
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // 1. Solar Control node (center)
    newNodes.push({
      id: SOLAR_CONTROL_NODE_ID,
      type: 'default',
      position: { x: 400, y: 300 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: (
          <div className="px-4 py-2 font-bold text-lg">
            Solar Control
          </div>
        ),
      },
      style: {
        background: '#5E81AC', // nord10 - blue
        color: '#ECEFF4', // nord6 - bright text
        border: '1px solid #4C566A', // nord3 - thin border
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        width: 200,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    });

    // 2. Build static infrastructure first (Host and Instance nodes)
    let hostYOffset = 100;
    hosts.forEach((host) => {
      const hostNodeId = `host-${host.id}`;

      // Host node
      newNodes.push({
        id: hostNodeId,
        type: 'default',
        position: { x: 750, y: hostYOffset },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: (
            <div className="text-sm font-semibold">
              {host.name}
            </div>
          ),
        },
        style: {
          background: host.status === 'online' ? '#A3BE8C' : '#4C566A', // nord14 green or nord3 gray
          color: host.status === 'online' ? '#2E3440' : '#D8DEE9', // dark text on green, light text on gray
          border: '1px solid #4C566A', // nord3 - thin border
          borderRadius: '8px',
          padding: '8px',
          width: 150,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
      });

      // Static edge from Solar Control to Host
      newEdges.push({
        id: `control-to-${hostNodeId}`,
        source: SOLAR_CONTROL_NODE_ID,
        target: hostNodeId,
        animated: false,
        style: {
          stroke: '#4C566A', // nord3
          strokeWidth: 2,
        },
      });

      // Instance nodes under this host
      let instanceYOffset = hostYOffset;
      host.instances.forEach((instance) => {
        const instanceNodeId = `instance-${host.id}-${instance.id}`;

        newNodes.push({
          id: instanceNodeId,
          type: 'default',
          position: { x: 950, y: instanceYOffset },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            label: (
              <div className="text-xs">
                <div className="font-semibold truncate max-w-[120px]" title={instance.config.alias}>
                  {instance.config.alias}
                </div>
                <div className={`text-[10px] font-medium ${instance.status === 'running' ? 'text-nord-0 opacity-70' : 'text-nord-4'}`}>
                  {instance.status}
                </div>
              </div>
            ),
          },
          style: {
            background: instance.status === 'running' ? '#88C0D0' : '#434C5E', // nord8 cyan or nord2
            color: instance.status === 'running' ? '#2E3440' : '#D8DEE9', // dark or light text
            border: '1px solid #4C566A', // nord3 - thin border
            borderRadius: '8px',
            padding: '6px',
            width: 140,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        });

        // Static edge from host to instance
        newEdges.push({
          id: `${hostNodeId}-to-${instanceNodeId}`,
          source: hostNodeId,
          target: instanceNodeId,
          animated: false,
          style: {
            stroke: '#4C566A', // nord3
            strokeWidth: 2,
          },
        });

        instanceYOffset += 100;
      });

      hostYOffset = instanceYOffset + 50; // Space between hosts
    });

    // 3. Client request nodes (left side) - added AFTER infrastructure
    const requestArray = Array.from(requests.values());
    requestArray.forEach((request, index) => {
      const yOffset = 100 + index * 120;
      const requestNodeId = `request-${request.request_id}`;

      newNodes.push({
        id: requestNodeId,
        type: 'default',
        position: { x: 50, y: yOffset },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: (
            <div className="flex items-center gap-2">
              <div className="flex flex-col text-left">
                {request.resolved_model && request.resolved_model !== request.model ? (
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm truncate max-w-[180px]" title={request.resolved_model}>
                      {request.resolved_model}
                    </span>
                    <span className="text-xs text-nord-6 opacity-60 truncate">
                      Requested: {request.model}
                    </span>
                  </div>
                ) : (
                  <span className="font-semibold text-sm truncate max-w-[180px]" title={request.model}>
                    {request.model}
                  </span>
                )}
                {request.client_ip && (
                  <span className="text-xs text-nord-6 opacity-80 truncate">
                    Client: {request.client_ip}
                  </span>
                )}
                {request.host_name && (
                  <span className="text-xs text-nord-6 opacity-80 truncate">
                    Host: {request.host_name}
                  </span>
                )}
                <span className="text-xs text-nord-6 opacity-60 truncate">
                  ID: {request.request_id.substring(0, 8)}
                </span>
                {request.duration && (
                  <span className="text-xs text-nord-6 opacity-80 font-medium">
                    ⏱ {request.duration.toFixed(2)}s
                  </span>
                )}
              </div>
              {request.status === 'error' && (
                <button
                  onClick={() => removeRequest(request.request_id)}
                  className="p-0.5 hover:bg-nord-0 hover:bg-opacity-20 rounded transition-colors"
                  title="Dismiss error"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ),
        },
        style: {
          background: getStatusColor(request.status),
          color: '#ECEFF4', // nord6 - bright text
          border: '1px solid #4C566A', // nord3 - thin border
          borderRadius: '8px',
          padding: '12px',
          width: 240,
          minHeight: 100,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
      });

      // Edge from request to Solar Control
      newEdges.push({
        id: `${requestNodeId}-to-control`,
        source: requestNodeId,
        target: SOLAR_CONTROL_NODE_ID,
        animated: request.status === 'pending' || request.status === 'processing' || request.status === 'routed',
        style: {
          stroke: getStatusColor(request.status),
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: getStatusColor(request.status),
        },
      });

      // Edges from Solar Control → Host → Instance (if routed)
      if (request.instance_id && request.host_id) {
        const hostNodeId = `host-${request.host_id}`;
        const instanceNodeId = `instance-${request.host_id}-${request.instance_id}`;
        
        // Edge 1: Solar Control → Host
        newEdges.push({
          id: `control-to-${hostNodeId}-${request.request_id}`,
          source: SOLAR_CONTROL_NODE_ID,
          target: hostNodeId,
          animated: request.status === 'processing' || request.status === 'routed',
          style: {
            stroke: getStatusColor(request.status),
            strokeWidth: 3,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: getStatusColor(request.status),
          },
        });
        
        // Edge 2: Host → Instance
        newEdges.push({
          id: `${hostNodeId}-to-${instanceNodeId}-${request.request_id}`,
          source: hostNodeId,
          target: instanceNodeId,
          animated: request.status === 'processing' || request.status === 'routed',
          style: {
            stroke: getStatusColor(request.status),
            strokeWidth: 3,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: getStatusColor(request.status),
          },
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [requests, hosts, removeRequest, setNodes, setEdges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 60px)' }}>
        <div className="text-xl text-nord-4">Loading routing visualization...</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-nord-0">
      <div className="p-4 bg-nord-1 border-b border-nord-3">
        <h1 className="text-2xl font-bold text-nord-6">Solar Routing Visualization</h1>
        <p className="text-sm text-nord-4 mt-1">
          Real-time view of API requests flowing through the system
        </p>
      </div>
      <div style={{ height: 'calc(100vh - 160px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-right"
        >
          <Background gap={16} size={0} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.id === SOLAR_CONTROL_NODE_ID) return '#5E81AC'; // nord10
              if (node.id.startsWith('request-')) {
                const status = node.style?.background as string;
                return status || '#4C566A'; // nord3
              }
              return '#4C566A'; // nord3
            }}
            style={{ backgroundColor: '#3B4252' }} // nord1
            maskColor="rgba(46, 52, 64, 0.6)" // nord0 with opacity
          />
        </ReactFlow>
      </div>
    </div>
  );
}

