import { useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
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

function getBrighterColor(color: string): string {
  // Convert hex to RGB, increase brightness and saturation
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  // Increase each channel by 20% and cap at 255
  const brighterR = Math.min(255, Math.round(r * 1.3));
  const brighterG = Math.min(255, Math.round(g * 1.3));
  const brighterB = Math.min(255, Math.round(b * 1.3));
  
  return `#${brighterR.toString(16).padStart(2, '0')}${brighterG.toString(16).padStart(2, '0')}${brighterB.toString(16).padStart(2, '0')}`;
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

    // Calculate stats for Solar Control
    const onlineHosts = hosts.filter(h => h.status === 'online').length;
    const totalInstances = hosts.reduce((sum, h) => sum + h.instances.length, 0);
    const runningInstances = hosts.reduce((sum, h) => sum + h.instances.filter(i => i.status === 'running').length, 0);
    const activeRequests = Array.from(requests.values()).filter(r => r.status === 'processing' || r.status === 'routed').length;

    // Track which instances are currently processing requests
    const processingInstances = new Set<string>();
    Array.from(requests.values()).forEach(req => {
      if ((req.status === 'processing' || req.status === 'routed') && req.host_id && req.instance_id) {
        processingInstances.add(`${req.host_id}-${req.instance_id}`);
      }
    });

    const solarControlBg = '#5E81AC'; // nord10 - blue

    // 1. Solar Control node (center)
    newNodes.push({
      id: SOLAR_CONTROL_NODE_ID,
      type: 'default',
      position: { x: 400, y: 300 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: (
          <div className="px-4 py-3">
            <div className="font-bold text-lg mb-2 text-center">Solar Control</div>
            <div className="text-xs space-y-1 text-nord-6 opacity-90 text-left">
              <div>{onlineHosts} / {hosts.length} hosts online</div>
              <div>{runningInstances} / {totalInstances} instances</div>
              <div>{activeRequests} active requests</div>
            </div>
          </div>
        ),
      },
      style: {
        background: solarControlBg,
        color: '#ECEFF4', // nord6 - bright text
        border: `1px solid ${getBrighterColor(solarControlBg)}`,
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        width: 220,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    });

    // 2. Build static infrastructure first (Host and Instance nodes)
    let hostYOffset = 100;
    hosts.forEach((host) => {
      const hostNodeId = `host-${host.id}`;

      // Host node
      const hostBg = host.status === 'online' ? '#A3BE8C' : '#4C566A'; // nord14 green or nord3 gray
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
          background: hostBg,
          color: host.status === 'online' ? '#2E3440' : '#D8DEE9', // dark text on green, light text on gray
          border: `1px solid ${getBrighterColor(hostBg)}`,
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
        const instanceBg = instance.status === 'running' ? '#88C0D0' : '#434C5E'; // nord8 cyan or nord2
        
        // Check if this instance is currently processing a request
        const isProcessing = processingInstances.has(`${host.id}-${instance.id}`);
        const borderColor = isProcessing ? '#EBCB8B' : getBrighterColor(instanceBg); // nord13 yellow when processing

        newNodes.push({
          id: instanceNodeId,
          type: 'default',
          position: { x: 1000, y: instanceYOffset },
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
            background: instanceBg,
            color: instance.status === 'running' ? '#2E3440' : '#D8DEE9', // dark or light text
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '6px',
            width: 140,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transition: 'border-color 0.3s ease',
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
          border: `1px solid ${getBrighterColor(getStatusColor(request.status))}`,
          borderRadius: '8px',
          padding: '12px',
          width: 240,
          minHeight: 100,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        className: request.removing ? 'request-node-animated removing' : 'request-node-animated',
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
      <style>{`
        /* Fade in animation - opacity only, let React Flow handle position */
        .react-flow__node.request-node-animated > div {
          animation: fadeIn 0.3s ease-out;
        }
        
        .react-flow__node.request-node-animated.removing > div {
          animation: fadeOut 0.3s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        
        /* Smooth position transitions for ALL nodes */
        .react-flow__node {
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        /* Smooth edge path transitions */
        .react-flow__edge.react-flow__edge-default {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        .react-flow__edge-path {
          transition: d 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
      `}</style>
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
          fitView={nodes.length === 0}
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          attributionPosition="bottom-right"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.5}
          maxZoom={1.5}
        >
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

