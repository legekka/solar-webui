// Type definitions for Solar API

export type InstanceStatus = 'stopped' | 'starting' | 'running' | 'failed' | 'stopping';

export type HostStatus = 'online' | 'offline' | 'error';

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
}

export interface Host {
  id: string;
  name: string;
  url: string;
  api_key: string;
  status: HostStatus;
  last_seen?: string;
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

export interface HostCreateRequest {
  name: string;
  url: string;
  api_key: string;
}

export interface InstanceCreateRequest {
  config: InstanceConfig;
}

