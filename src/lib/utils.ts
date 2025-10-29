import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | undefined): string {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatDateTime(date: string | undefined): string {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium'
  });
}

export function formatRelativeTime(date: string | undefined): string {
  if (!date) return 'Never';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(date);
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
      return 'text-nord-6 bg-nord-14'; // green
    case 'stopped':
    case 'offline':
      return 'text-nord-4 bg-nord-3'; // blue-gray
    case 'starting':
    case 'stopping':
      return 'text-nord-0 bg-nord-13'; // yellow
    case 'failed':
    case 'error':
      return 'text-nord-6 bg-nord-11'; // red
    default:
      return 'text-nord-4 bg-nord-3'; // blue-gray
  }
}

