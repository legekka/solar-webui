import axios, { AxiosInstance } from 'axios';
import {
  Host,
  HostCreateRequest,
  Instance,
  ModelInfo,
  InstanceRuntimeState,
} from './types';

class SolarClient {
  private client: AxiosInstance;

  constructor(baseURL?: string, apiKey?: string) {
    const effectiveBaseURL = baseURL || import.meta.env.VITE_SOLAR_CONTROL_URL || 'http://localhost:8000';
    const effectiveApiKey = apiKey || import.meta.env.VITE_SOLAR_CONTROL_API_KEY || '';
    
    // Debug logging (only in development)
    if (import.meta.env.DEV) {
      console.log('SolarClient initialized:', {
        baseURL: effectiveBaseURL,
        hasApiKey: !!effectiveApiKey,
        apiKeyLength: effectiveApiKey.length
      });
    }
    
    this.client = axios.create({
      baseURL: effectiveBaseURL,
      headers: {
        'X-API-Key': effectiveApiKey,
        'Content-Type': 'application/json',
      },
    });
    
    // Add request interceptor to log outgoing requests in dev
    if (import.meta.env.DEV) {
      this.client.interceptors.request.use((config) => {
        console.log(`→ ${config.method?.toUpperCase()} ${config.url}`, {
          hasApiKey: !!config.headers['X-API-Key']
        });
        return config;
      });
    }
    
    // Add response interceptor to log errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error('❌ 401 Unauthorized - Check your API key in .env file');
        }
        return Promise.reject(error);
      }
    );
  }

  // Host Management
  async getHosts(): Promise<Host[]> {
    const response = await this.client.get('/hosts');
    return response.data;
  }

  async getHost(hostId: string): Promise<Host> {
    const response = await this.client.get(`/hosts/${hostId}`);
    return response.data;
  }

  async createHost(data: HostCreateRequest): Promise<{ host: Host; message: string }> {
    const response = await this.client.post('/hosts', data);
    return response.data;
  }

  async deleteHost(hostId: string): Promise<{ host: Host; message: string }> {
    const response = await this.client.delete(`/hosts/${hostId}`);
    return response.data;
  }

  async refreshAllHosts(): Promise<{ message: string; results: Array<{ host_id: string; name: string; status: string; message: string }> }> {
    const response = await this.client.post('/hosts/refresh-all');
    return response.data;
  }

  async getHostInstances(hostId: string): Promise<Instance[]> {
    const response = await this.client.get(`/hosts/${hostId}/instances`);
    return response.data;
  }

  // Instance Control (via solar-control proxy)
  async startInstance(hostId: string, instanceId: string): Promise<{ instance: Instance; message: string }> {
    const response = await this.client.post(`/hosts/${hostId}/instances/${instanceId}/start`);
    return response.data;
  }

  async stopInstance(hostId: string, instanceId: string): Promise<{ instance: Instance; message: string }> {
    const response = await this.client.post(`/hosts/${hostId}/instances/${instanceId}/stop`);
    return response.data;
  }

  async restartInstance(hostId: string, instanceId: string): Promise<{ instance: Instance; message: string }> {
    const response = await this.client.post(`/hosts/${hostId}/instances/${instanceId}/restart`);
    return response.data;
  }

  async createInstance(hostId: string, config: any): Promise<{ instance: Instance; message: string }> {
    const response = await this.client.post(`/hosts/${hostId}/instances`, { config });
    return response.data;
  }

  async updateInstance(hostId: string, instanceId: string, config: any): Promise<{ instance: Instance; message: string }> {
    const response = await this.client.put(`/hosts/${hostId}/instances/${instanceId}`, { config });
    return response.data;
  }

  async deleteInstance(hostId: string, instanceId: string): Promise<{ instance: Instance; message: string }> {
    const response = await this.client.delete(`/hosts/${hostId}/instances/${instanceId}`);
    return response.data;
  }

  // Instance runtime state (via solar-control proxy)
  async getInstanceState(hostId: string, instanceId: string): Promise<InstanceRuntimeState> {
    const response = await this.client.get(`/hosts/${hostId}/instances/${instanceId}/state`);
    return response.data;
  }

  getInstanceStateWebSocketUrl(controlBaseUrl: string, hostId: string, instanceId: string): string {
    const wsProtocol = controlBaseUrl.startsWith('https') ? 'wss' : 'ws';
    const base = controlBaseUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${base}/ws/instances/${hostId}/${instanceId}/state`;
  }

  // OpenAI Gateway
  async getModels(): Promise<ModelInfo[]> {
    const response = await this.client.get('/v1/models');
    return response.data.data;
  }

  async chatCompletion(model: string, messages: Array<{ role: string; content: string }>) {
    const response = await this.client.post('/v1/chat/completions', {
      model,
      messages,
      stream: false,
    });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; service: string; version: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // WebSocket URL for logs
  getLogWebSocketUrl(hostUrl: string, instanceId: string, apiKey: string): string {
    const wsProtocol = hostUrl.startsWith('https') ? 'wss' : 'ws';
    const url = hostUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${url}/instances/${instanceId}/logs?api_key=${apiKey}`;
  }
}

// Export a default instance
const solarClient = new SolarClient();
export default solarClient;
export { SolarClient };

