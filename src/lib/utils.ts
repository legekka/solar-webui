import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | undefined): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
}

export function formatUptime(startedAt: string | undefined): string {
  if (!startedAt) return 'Not running';
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diff = now - start;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'running':
    case 'online':
      return 'text-green-600 bg-green-100';
    case 'stopped':
    case 'offline':
      return 'text-gray-600 bg-gray-100';
    case 'starting':
    case 'stopping':
      return 'text-yellow-600 bg-yellow-100';
    case 'failed':
    case 'error':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

