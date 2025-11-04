import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, RotateCcw, TriangleAlert } from 'lucide-react';
import solarClient from '@/api/client';
import { GatewayRequestSummary, GatewayRequestsResponse, GatewayStats } from '@/api/types';
import { useRoutingEventsContext } from '@/context/RoutingEventsContext';
import { formatTokenCount } from '@/lib/utils';

function isoInput(dt: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

type TimePreset = '1h' | '12h' | '1d' | '7d' | '1m' | '1y' | 'custom';

function calculatePresetDates(preset: TimePreset): { from: string; to: string } {
  const now = new Date();
  const to = isoInput(now);
  let fromDate: Date;
  
  switch (preset) {
    case '1h':
      fromDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '12h':
      fromDate = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      break;
    case '1d':
      fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1m':
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
    default:
      // Return current values (will be set by state)
      const nowUtc = new Date();
      const startOfToday = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate(), 0, 0, 0));
      return { from: isoInput(startOfToday), to };
  }
  
  return { from: isoInput(fromDate), to };
}

export function GatewayDashboard() {
  const { events, addRecentEvents, requests } = useRoutingEventsContext();

  // Time range - initialize with 1d preset
  const initialPreset: TimePreset = '1d';
  const initialDates = calculatePresetDates(initialPreset);
  const [preset, setPreset] = useState<TimePreset>(initialPreset);
  const [from, setFrom] = useState<string>(initialDates.from);
  const [to, setTo] = useState<string>(initialDates.to);

  // Stats
  const [stats, setStats] = useState<GatewayStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Requests
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error' | 'missed'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [reqResp, setReqResp] = useState<GatewayRequestsResponse | null>(null);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [live, setLive] = useState(true);

  const fromIso = useMemo(() => new Date(from).toISOString(), [from]);
  const toIso = useMemo(() => new Date(to).toISOString(), [to]);

  // Update dates when preset changes
  useEffect(() => {
    if (preset !== 'custom') {
      const { from: newFrom, to: newTo } = calculatePresetDates(preset);
      setFrom(newFrom);
      setTo(newTo);
    }
  }, [preset]);

  const refreshStats = async () => {
    setLoadingStats(true);
    try {
      const s = await solarClient.getGatewayStats({ from: fromIso, to: toIso });
      setStats(s);
    } finally {
      setLoadingStats(false);
    }
  };

  const refreshRequests = async () => {
    setLoadingReqs(true);
    try {
      const res = await solarClient.listGatewayRequests({ from: fromIso, to: toIso, status: statusFilter, page, limit });
      setReqResp(res);
    } finally {
      setLoadingReqs(false);
    }
  };

  useEffect(() => {
    refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromIso, toIso]);

  useEffect(() => {
    refreshRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromIso, toIso, statusFilter, page, limit]);

  // Throttled live refresh on request completion/error events
  const refreshThrottleRef = useRef<number | null>(null);
  const completedCount = useMemo(() => {
    let c = 0;
    requests.forEach((r) => {
      if (r.status === 'success' || r.status === 'error') c += 1;
    });
    return c;
  }, [requests]);

  useEffect(() => {
    // Auto-refresh on request completion regardless of window, while in live mode
    if (!live) {
      if (refreshThrottleRef.current !== null) {
        clearTimeout(refreshThrottleRef.current);
        refreshThrottleRef.current = null;
      }
      return;
    }

    if (refreshThrottleRef.current !== null) {
      clearTimeout(refreshThrottleRef.current);
      refreshThrottleRef.current = null;
    }

    const timeoutId = window.setTimeout(() => {
      refreshThrottleRef.current = null;
      if (preset !== 'custom') {
        const nowIso = isoInput(new Date());
        setTo(nowIso);
        const { from: newFrom } = calculatePresetDates(preset);
        setFrom(newFrom);
      }
      refreshRequests();
      refreshStats();
    }, 800);
    refreshThrottleRef.current = timeoutId;

    return () => {
      clearTimeout(timeoutId);
      if (refreshThrottleRef.current === timeoutId) {
        refreshThrottleRef.current = null;
      }
    };
  }, [completedCount, live, preset]);

  // Periodic polling in live mode as a fallback (covers WS reconnect or idle periods)
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      if (preset !== 'custom') {
        const nowIso = isoInput(new Date());
        setTo(nowIso);
        const { from: newFrom } = calculatePresetDates(preset);
        setFrom(newFrom);
      }
      refreshRequests();
      refreshStats();
    }, 2000);
    return () => window.clearInterval(id);
  }, [live, fromIso, statusFilter, page, limit, preset]);

  // Backfill recent events on mount
  useEffect(() => {
    handleLoadRecentEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadRecentEvents = async () => {
    const res = await solarClient.getRecentGatewayEvents({ from: fromIso, to: toIso, limit: 1000, types: 'request_error,request_reroute' });
    addRecentEvents(res.items as unknown as any); // same shape as RoutingEvent subset
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="text-nord-8" />
          <h1 className="text-2xl font-semibold text-nord-6">Gateway Monitoring</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive((v) => !v)}
            className={`px-3 py-2 rounded ${live ? 'bg-nord-10 text-nord-6' : 'bg-nord-3 text-nord-6 hover:bg-nord-2'}`}
            title={live ? 'Live updating' : 'Enable live updates'}
          >
            {live ? 'Live' : 'Go Live'}
          </button>
          <div className="flex items-center gap-1">
            {(['1h', '12h', '1d', '7d', '1m', '1y', 'custom'] as TimePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1 text-sm rounded ${
                  preset === p
                    ? 'bg-nord-10 text-nord-6 font-medium'
                    : 'bg-nord-2 text-nord-6 hover:bg-nord-3'
                }`}
              >
                {p === 'custom' ? 'Custom' : p}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPreset('custom');
                }}
                className="bg-nord-1 text-nord-6 border border-nord-3 rounded px-2 py-1"
              />
              <span className="text-nord-4">to</span>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPreset('custom');
                }}
                className="bg-nord-1 text-nord-6 border border-nord-3 rounded px-2 py-1"
              />
            </>
          )}
          <button onClick={refreshStats} className="px-3 py-2 bg-nord-3 text-nord-6 rounded hover:bg-nord-2">
            <RefreshCw size={16} className={loadingStats ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-nord-1 border border-nord-3 rounded p-4">
          <div className="text-nord-4 text-sm">Completed</div>
          <div className="text-nord-14 text-2xl font-semibold">{stats?.completed ?? '—'}</div>
        </div>
        <div className="bg-nord-1 border border-nord-3 rounded p-4">
          <div className="text-nord-4 text-sm">Missed</div>
          <div className="text-nord-11 text-2xl font-semibold">{stats?.missed ?? '—'}</div>
        </div>
        <div className="bg-nord-1 border border-nord-3 rounded p-4">
          <div className="text-nord-4 text-sm">Errors</div>
          <div className="text-nord-12 text-2xl font-semibold">{stats?.error ?? '—'}</div>
        </div>
        <div className="bg-nord-1 border border-nord-3 rounded p-4">
          <div className="text-nord-4 text-sm">Rerouted Requests</div>
          <div className="text-nord-13 text-2xl font-semibold">{stats?.rerouted_requests ?? '—'}</div>
        </div>
        <div className="bg-nord-1 border border-nord-3 rounded p-4">
          <div className="text-nord-4 text-sm">Input tokens</div>
          <div className="text-nord-6 text-lg">{formatTokenCount(stats?.token_in_total)}</div>
          <div className="text-nord-4 text-xs">avg {formatTokenCount(stats?.avg_tokens_in)}</div>
        </div>
        <div className="bg-nord-1 border border-nord-3 rounded p-4">
          <div className="text-nord-4 text-sm">Output tokens</div>
          <div className="text-nord-6 text-lg">{formatTokenCount(stats?.token_out_total)}</div>
          <div className="text-nord-4 text-xs">avg {formatTokenCount(stats?.avg_tokens_out)}</div>
        </div>
      </div>

      {/* Live Events */}
      <div className="bg-nord-1 border border-nord-3 rounded">
        <div className="p-4 flex items-center justify-between border-b border-nord-3">
          <div className="text-nord-6 font-medium">Live Events</div>
          <div className="flex items-center gap-2">
            <button onClick={handleLoadRecentEvents} className="px-3 py-2 bg-nord-3 text-nord-6 rounded hover:bg-nord-2 flex items-center gap-2">
              <RotateCcw size={16} /> Load recent
            </button>
            <div className="text-sm text-nord-4">{events.length} events</div>
          </div>
        </div>
        <div className="max-h-72 overflow-auto p-3 text-sm">
          {events.length === 0 ? (
            <div className="text-nord-4">No events yet</div>
          ) : (
            events.map((e, idx) => (
              <div key={idx} className="flex items-start gap-2 py-1">
                {e.type === 'request_reroute' ? (
                  <AlertTriangle className="text-nord-13" size={16} />
                ) : (
                  <TriangleAlert className="text-nord-12" size={16} />
                )}
                <div className="text-nord-6">
                  <span className="text-nord-4">[{(e as any).data?.timestamp || (e as any).timestamp}]</span>{' '}
                  <span className="uppercase text-xs px-2 py-0.5 rounded bg-nord-2 text-nord-4 mr-2">{e.type}</span>
                  <span>{(e as any).data?.model}</span>
                  {e.type === 'request_reroute' && (
                    <span className="text-nord-4"> → attempt {(e as any).data?.attempt}</span>
                  )}
                  {e.type === 'request_error' && (
                    <span className="text-nord-11"> {(e as any).data?.error_message}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Requests table */}
      <div className="bg-nord-1 border border-nord-3 rounded">
        <div className="p-4 flex items-center justify-between border-b border-nord-3">
          <div className="text-nord-6 font-medium">Requests</div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value as any); }}
              className="bg-nord-2 text-nord-6 border border-nord-3 rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="missed">Missed</option>
            </select>
            <button onClick={refreshRequests} className="px-3 py-2 bg-nord-3 text-nord-6 rounded hover:bg-nord-2">
              <RefreshCw size={16} className={loadingReqs ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-nord-2 text-nord-4">
              <tr>
                <th className="text-left px-3 py-2">Time</th>
                <th className="text-left px-3 py-2">Model</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Host</th>
                <th className="text-left px-3 py-2">Input tokens</th>
                <th className="text-left px-3 py-2">Output tokens</th>
                <th className="text-left px-3 py-2">Total tokens</th>
                <th className="text-left px-3 py-2">Duration</th>
                <th className="text-left px-3 py-2">Attempts</th>
                <th className="text-left px-3 py-2">Endpoint</th>
              </tr>
            </thead>
            <tbody className="text-nord-6">
              {reqResp?.items?.length ? (
                reqResp.items.map((r: GatewayRequestSummary) => (
                  <tr key={r.request_id} className="border-t border-nord-3">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.end_timestamp).toLocaleString()}</td>
                    <td className="px-3 py-2">{r.resolved_model || r.model}</td>
                    <td className="px-3 py-2">
                      {r.status === 'success' ? (
                        <span className="text-nord-14 flex items-center gap-1"><CheckCircle2 size={14} /> success</span>
                      ) : r.status === 'missed' ? (
                        <span className="text-nord-11">missed</span>
                      ) : (
                        <span className="text-nord-12">error</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.host_name || r.host_id || '—'}</td>
                    <td className="px-3 py-2">{formatTokenCount(r.prompt_tokens)}</td>
                    <td className="px-3 py-2">{formatTokenCount(r.completion_tokens)}</td>
                    <td className="px-3 py-2">{formatTokenCount(r.total_tokens ?? (typeof r.prompt_tokens === 'number' && typeof r.completion_tokens === 'number' ? r.prompt_tokens + r.completion_tokens : undefined))}</td>
                    <td className="px-3 py-2">{r.duration_s?.toFixed(2)}s</td>
                    <td className="px-3 py-2">{r.attempts}</td>
                    <td className="px-3 py-2">{r.endpoint}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-nord-4">No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-nord-3 flex items-center justify-between text-sm text-nord-4">
          <div>
            Page {page} • {reqResp?.total ?? 0} total
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 bg-nord-2 text-nord-6 rounded disabled:opacity-50">Prev</button>
            <button disabled={(reqResp?.items?.length || 0) < limit} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 bg-nord-2 text-nord-6 rounded disabled:opacity-50">Next</button>
            <select value={limit} onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }} className="bg-nord-2 text-nord-6 border border-nord-3 rounded px-2 py-1">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Breakdown tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-nord-1 border border-nord-3 rounded">
          <div className="p-4 border-b border-nord-3 text-nord-6 font-medium">By Model</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-nord-2 text-nord-4">
                <tr>
                  <th className="text-left px-3 py-2">Model</th>
                  <th className="text-left px-3 py-2">Completed</th>
                  <th className="text-left px-3 py-2">Input tokens</th>
                  <th className="text-left px-3 py-2">Output tokens</th>
                  <th className="text-left px-3 py-2">Avg Duration</th>
                </tr>
              </thead>
              <tbody className="text-nord-6">
                {stats?.models?.length ? stats.models.map((m) => (
                  <tr key={m.model} className="border-t border-nord-3">
                    <td className="px-3 py-2">{m.model}</td>
                    <td className="px-3 py-2">{m.completed}</td>
                    <td className="px-3 py-2">{formatTokenCount(m.token_in)}</td>
                    <td className="px-3 py-2">{formatTokenCount(m.token_out)}</td>
                    <td className="px-3 py-2">{m.avg_duration_s.toFixed(2)}s</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-3 py-4 text-center text-nord-4">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-nord-1 border border-nord-3 rounded">
          <div className="p-4 border-b border-nord-3 text-nord-6 font-medium">By Host</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-nord-2 text-nord-4">
                <tr>
                  <th className="text-left px-3 py-2">Host</th>
                  <th className="text-left px-3 py-2">Completed</th>
                  <th className="text-left px-3 py-2">Input tokens</th>
                  <th className="text-left px-3 py-2">Output tokens</th>
                  <th className="text-left px-3 py-2">Avg Duration</th>
                </tr>
              </thead>
              <tbody className="text-nord-6">
                {stats?.hosts?.length ? stats.hosts.map((h) => (
                  <tr key={h.host_id} className="border-t border-nord-3">
                    <td className="px-3 py-2">{h.host_name || h.host_id}</td>
                    <td className="px-3 py-2">{h.completed}</td>
                    <td className="px-3 py-2">{formatTokenCount(h.token_in)}</td>
                    <td className="px-3 py-2">{formatTokenCount(h.token_out)}</td>
                    <td className="px-3 py-2">{h.avg_duration_s.toFixed(2)}s</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-3 py-4 text-center text-nord-4">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


