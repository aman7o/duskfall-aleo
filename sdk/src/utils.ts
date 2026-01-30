/**
 * Utility functions for the Digital Will SDK
 */

import { BLOCKS_PER_DAY, BLOCK_TIME_SECONDS, MICROCREDITS_PER_ALEO } from './constants';
import { AleoAddress, AleoField } from './types';

/**
 * Convert days to blocks
 * @param days Number of days
 * @returns Number of blocks (approximately, u32 safe)
 */
export function daysToBlocks(days: number): number {
  if (days < 0) {
    throw new Error('Days cannot be negative');
  }
  const blocks = Math.floor(days * BLOCKS_PER_DAY);
  // Ensure result fits in u32 (max 4294967295)
  if (blocks > 4294967295) {
    throw new Error('Days value would overflow u32 block count');
  }
  return blocks;
}

/**
 * Convert blocks to days
 * @param blocks Number of blocks
 * @returns Number of days (approximately)
 */
export function blocksToDays(blocks: number): number {
  return blocks / BLOCKS_PER_DAY;
}

/**
 * Format time remaining from blocks to human-readable string
 * @param blocks Number of blocks remaining
 * @returns Human-readable string (e.g., "5 days, 3 hours")
 */
export function formatTimeRemaining(blocks: number): string {
  const totalSeconds = blocks * BLOCK_TIME_SECONDS;

  if (totalSeconds <= 0) {
    return 'Expired';
  }

  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0 && days === 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'Less than a minute';
}

/**
 * Generate a random nonce for will creation
 * @returns Random field element as string
 */
export function generateNonce(): string {
  // Generate a random 32-byte hex string
  const randomBytes = new Uint8Array(32);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else if (typeof require !== 'undefined') {
    // Node.js environment
    const cryptoNode = require('crypto');
    const buffer = cryptoNode.randomBytes(32);
    randomBytes.set(buffer);
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Convert to hex string and add field suffix
  const hex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${BigInt('0x' + hex).toString()}field`;
}

/**
 * Hash an Aleo address to a field element
 * Note: This is a placeholder - actual implementation needs Aleo SDK
 * @param address Aleo address
 * @returns Field element hash
 */
export function hashAddress(address: AleoAddress): AleoField {
  // Placeholder implementation
  // In production, use Aleo SDK's BHP256 hash function
  let hash = 0n;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31n + BigInt(address.charCodeAt(i))) % (2n ** 251n);
  }
  return `${hash}field`;
}

/**
 * Convert Aleo credits to microcredits
 * @param aleo Amount in ALEO
 * @returns Amount in microcredits
 */
export function aleoToMicrocredits(aleo: number): bigint {
  return BigInt(Math.floor(aleo * MICROCREDITS_PER_ALEO));
}

/**
 * Convert microcredits to Aleo credits
 * @param microcredits Amount in microcredits
 * @returns Amount in ALEO
 */
export function microcreditsToAleo(microcredits: bigint): number {
  // For values that fit safely in Number, use direct conversion
  // Number.MAX_SAFE_INTEGER = 9007199254740991 (~9 quadrillion microcredits = ~9 billion ALEO)
  if (microcredits <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(microcredits) / MICROCREDITS_PER_ALEO;
  }
  // For very large values, use string-based conversion to maintain precision
  // Split into whole ALEO and fractional parts
  const wholeAleo = microcredits / BigInt(MICROCREDITS_PER_ALEO);
  const remainder = microcredits % BigInt(MICROCREDITS_PER_ALEO);
  return Number(wholeAleo) + Number(remainder) / MICROCREDITS_PER_ALEO;
}

/**
 * Format microcredits to human-readable ALEO amount
 * @param microcredits Amount in microcredits
 * @param decimals Number of decimal places (default: 6)
 * @returns Formatted string (e.g., "1.5 ALEO")
 */
export function formatAleo(microcredits: bigint, decimals: number = 6): string {
  const aleo = microcreditsToAleo(microcredits);
  return `${aleo.toFixed(decimals)} ALEO`;
}

/**
 * Calculate share amount from basis points
 * @param totalAmount Total amount to split
 * @param shareBps Share in basis points (10000 = 100%)
 * @returns Share amount
 */
export function calculateShare(totalAmount: bigint, shareBps: number): bigint {
  if (shareBps < 0 || shareBps > 10000) {
    throw new Error('Share basis points must be between 0 and 10000');
  }
  return (totalAmount * BigInt(shareBps)) / 10000n;
}

/**
 * Convert basis points to percentage
 * @param bps Basis points
 * @returns Percentage (0-100)
 */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/**
 * Convert percentage to basis points
 * @param percent Percentage (0-100)
 * @returns Basis points (0-10000)
 */
export function percentToBps(percent: number): number {
  if (percent < 0 || percent > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }
  return Math.floor(percent * 100);
}

/**
 * Validate Aleo address format
 * @param address Address to validate
 * @returns True if valid
 */
export function isValidAleoAddress(address: string): boolean {
  // Basic validation - Aleo addresses start with 'aleo1' and are 63 characters
  // This is a simplified check; use Aleo SDK for production
  return typeof address === 'string' &&
         address.startsWith('aleo1') &&
         address.length === 63;
}

/**
 * Validate field element format
 * @param field Field element to validate
 * @returns True if valid
 */
export function isValidField(field: string): boolean {
  // Field elements end with 'field'
  return typeof field === 'string' && field.endsWith('field');
}

/**
 * Calculate trigger bounty amount
 * @param totalLocked Total locked amount in will
 * @param bountyBps Bounty in basis points (default: 10 = 0.1%)
 * @returns Bounty amount
 */
export function calculateTriggerBounty(totalLocked: bigint, bountyBps: number = 10): bigint {
  return (totalLocked * BigInt(bountyBps)) / 10000n;
}

/**
 * Check if current block height exceeds deadline
 * @param currentBlock Current block height
 * @param lastCheckin Last check-in block
 * @param checkinPeriod Check-in period in blocks
 * @param gracePeriod Grace period in blocks
 * @returns True if deadline has passed
 */
export function isDeadlinePassed(
  currentBlock: number,
  lastCheckin: number,
  checkinPeriod: number,
  gracePeriod: number
): boolean {
  const deadline = lastCheckin + checkinPeriod + gracePeriod;
  return currentBlock > deadline;
}

/**
 * Calculate blocks until deadline
 * @param currentBlock Current block height
 * @param lastCheckin Last check-in block
 * @param checkinPeriod Check-in period in blocks
 * @param gracePeriod Grace period in blocks
 * @returns Blocks remaining (negative if passed)
 */
export function blocksUntilDeadline(
  currentBlock: number,
  lastCheckin: number,
  checkinPeriod: number,
  gracePeriod: number
): number {
  const deadline = lastCheckin + checkinPeriod + gracePeriod;
  return deadline - currentBlock;
}

/**
 * Validate beneficiary shares total 100%
 * @param shares Array of share basis points
 * @returns True if total equals 10000 (100%)
 */
export function validateSharesTotal(shares: number[]): boolean {
  const total = shares.reduce((sum, share) => sum + share, 0);
  return total === 10000;
}

/**
 * Sleep for specified milliseconds (useful for polling)
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in ms
 * @returns Result of function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < maxRetries) {
        const delay = initialDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
