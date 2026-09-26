/**
 * Time utilities for PRISMA IA
 * Enforces Brasília Time (UTC-3) and Candlestick time intervals
 */

export function getBrasiliaDate(date: Date = new Date()): Date {
  // Convert current date to UTC-3 (Brasília)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc - 3 * 3600000);
}

export function formatBrasiliaTime(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getCandleOpenTimestamp(timestamp: number = Date.now(), tfMs: number = 60000): number {
  return Math.floor(timestamp / tfMs) * tfMs;
}

export function getCandleTimeRemainingSeconds(timestamp: number = Date.now(), tfMs: number = 60000): number {
  const openTime = getCandleOpenTimestamp(timestamp, tfMs);
  const nextOpenTime = openTime + tfMs;
  const diffMs = Math.max(0, nextOpenTime - timestamp);
  return Math.floor(diffMs / 1000);
}

export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getTimeframeLabel(tfMs: number): string {
  if (tfMs < 60000) {
    return `${tfMs / 1000}s`;
  }
  return `${tfMs / 60000}m`;
}
