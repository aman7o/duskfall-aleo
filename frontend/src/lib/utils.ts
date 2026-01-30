import { type ClassValue, clsx } from 'clsx';

// Utility for merging classNames
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format wallet address (works for both Aleo and other formats)
export function formatAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars + 4)}...${address.slice(-chars)}`;
}

// Format ALEO credits (from microcredits)
export function formatCredits(microcredits: bigint | string | number): string {
  const value = typeof microcredits === 'bigint'
    ? Number(microcredits)
    : Number(microcredits);
  return `${(value / 1_000_000).toFixed(2)} ALEO`;
}

// Convert blocks to human readable time (Aleo: ~20 seconds per block)
export function blocksToTime(blocks: bigint | number): string {
  const blockCount = typeof blocks === 'bigint' ? Number(blocks) : blocks;
  const seconds = blockCount * 20; // 20 seconds per block on Aleo

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Convert days to blocks (Aleo: ~4320 blocks per day)
export function daysToBlocks(days: number): bigint {
  return BigInt(Math.floor(days * 4320));
}

// Convert blocks to days
export function blocksToDays(blocks: bigint | number): number {
  const blockCount = typeof blocks === 'bigint' ? Number(blocks) : blocks;
  return blockCount / 4320;
}

// Calculate time remaining in parts from blocks
export function getTimeRemainingFromBlocks(blocks: bigint | number) {
  const blockCount = typeof blocks === 'bigint' ? Number(blocks) : blocks;

  if (blockCount <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const totalSeconds = blockCount * 20;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return { days, hours, minutes, seconds, isExpired: false };
}

// Format date
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format interval from days
export function formatInterval(days: number): string {
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''}`;
  const hours = Math.floor(days * 24);
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return 'Less than 1 hour';
}

// Validate Aleo address
export function isValidAleoAddress(address: string): boolean {
  // Aleo addresses start with 'aleo1' and are 63 characters total
  return /^aleo1[a-z0-9]{58}$/.test(address);
}

// Legacy alias for backwards compatibility
export const isValidAddress = isValidAleoAddress;

// Calculate percentage of time passed
export function getProgressPercentage(elapsed: number, total: number): number {
  if (elapsed >= total) return 100;
  if (elapsed <= 0) return 0;
  return Math.floor((elapsed / total) * 100);
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

// Wait utility
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Copy to clipboard (SSR-safe)
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// Convert basis points to percentage
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

// Convert percentage to basis points
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

// Get Aleo explorer URL for transaction
export function getExplorerTxUrl(txId: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  return `https://explorer.provable.com/${network}/transaction/${txId}`;
}

// Get Aleo explorer URL for address
export function getExplorerAddressUrl(address: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  return `https://explorer.provable.com/${network}/address/${address}`;
}
