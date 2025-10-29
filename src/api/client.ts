import axios, { AxiosInstance } from 'axios';
import {
  Host,
  HostCreateRequest,
  Instance,
  ModelInfo,
} from './types';

class SolarClient {
  private client: AxiosInstance;

  constructor(baseURL?: string, apiKey?: string) {
    this.client = axios.create({
      baseURL: baseURL || import.meta.env.VITE_API_URL || 'http://localhost:8000',
      headers: {
        'X-API-Key': apiKey || import.meta.env.VITE_API_KEY || '',
        'Content-Type': 'application/json',
      },
    });
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

