// Type definitions for Solar API

export type InstanceStatus = 'stopped' | 'starting' | 'running' | 'failed' | 'stopping';

export type HostStatus = 'online' | 'offline' | 'error';

export interface MemoryInfo {
  used_gb: number;
  total_gb: number;
  percent: number;
  memory_type: string;
}

export interface InstanceConfig {
  model: string;
  alias: string;
  threads: number;
  n_gpu_layers: number;
  temp: number;
  top_p: number;
  top_k: number;
  min_p: number;
  ctx_size: number;
  chat_template_file?: string;
  host: string;
  port?: number;
  api_key: string;
}

export interface Instance {
  id: string;
  config: InstanceConfig;
  status: InstanceStatus;
  port?: number;
  pid?: number;
  created_at: string;
  started_at?: string;
  error_message?: string;
  retry_count: number;
  // Ephemeral runtime fields (provided via separate state API/WS)
  busy?: boolean;
  prefill_progress?: number;
  active_slots?: number;
}

export interface Host {
  id: string;
  name: string;
  url: string;
  api_key: string;
  status: HostStatus;
  last_seen?: string;
  memory?: MemoryInfo;
  created_at: string;
}

export interface HostWithInstances extends Host {
  instances?: Instance[];
}

export interface LogMessage {
  seq: number;
  timestamp: string;
  line: string;
}

export interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

// Runtime state structures
export interface InstanceRuntimeState {
  instance_id: string;
  busy: boolean;
  phase: 'idle' | 'prefill' | 'generating';
  prefill_progress?: number | null;
  active_slots: number;
  slot_id?: number | null;
  task_id?: number | null;
  prefill_prompt_tokens?: number | null;
  generated_tokens?: number | null;
  decode_tps?: number | null;
  decode_ms_per_token?: number | null;
  checkpoint_index?: number | null;
  checkpoint_total?: number | null;
  timestamp: string;
}

export interface InstanceStateEvent {
  seq: number;
  timestamp: string;
  type: 'instance_state';
  data: InstanceRuntimeState;
}

export interface HostCreateRequest {
  name: string;
  url: string;
  api_key: string;
}

export interface InstanceCreateRequest {
  config: InstanceConfig;
}

// Gateway monitoring
export interface GatewayStats {
  from: string;
  to: string;
  completed: number;
  missed: number;
  error: number;
  rerouted_requests: number;
}

export interface GatewayRequestSummary {
  request_id: string;
  status: 'success' | 'error' | 'missed';
  model?: string;
  resolved_model?: string;
  endpoint?: string;
  client_ip?: string;
  stream?: boolean;
  attempts: number;
  start_timestamp?: string;
  end_timestamp: string;
  duration_s?: number;
  host_id?: string;
  host_name?: string;
  instance_id?: string;
  instance_url?: string;
  error_message?: string;
}

export interface GatewayRequestsResponse {
  from: string;
  to: string;
  page: number;
  limit: number;
  total: number;
  items: GatewayRequestSummary[];
}

export interface GatewayEventDTO {
  type: 'request_error' | 'request_reroute';
  data?: any;
  timestamp?: string;
}

