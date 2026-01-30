/**
 * Frontend Types for Duskfall on Aleo
 * These types are designed for the Aleo blockchain
 */

// ============================================
// Core Aleo Types
// ============================================

/**
 * Aleo address type (starts with aleo1...)
 */
export type AleoAddress = string;

/**
 * Aleo field element type (ends with 'field')
 */
export type AleoField = string;

// ============================================
// Will Types (matching SDK/Contract)
// ============================================

/**
 * Main will configuration
 *
 * NOTE: checkInPeriod and gracePeriod are u32 in the Leo contract but
 * stored as bigint here for consistency with block height arithmetic.
 * The SDK uses number for these fields - conversion happens at transaction boundary.
 */
export interface WillConfig {
  owner: AleoAddress;
  willId: AleoField;
  checkInPeriod: bigint;  // in blocks (u32 in Leo, bigint for block arithmetic)
  gracePeriod: bigint;    // in blocks (u32 in Leo, bigint for block arithmetic)
  totalSharesBps: number; // basis points (10000 = 100%)
  numBeneficiaries: number;
  isActive: boolean;
  nonce: AleoField;
}

/**
 * Beneficiary record
 */
export interface Beneficiary {
  owner: AleoAddress;
  willOwner: AleoAddress;
  willId: AleoField;
  shareBps: number;
  priority: number;
  verificationHash: AleoField;
  isActive: boolean;
}

/**
 * Locked credits in the will
 */
export interface LockedCredits {
  owner: AleoAddress;
  willId: AleoField;
  amount: bigint;  // in microcredits
  depositor: AleoAddress;
}

// ============================================
// UI State Types
// ============================================

/**
 * Wallet connection state
 */
export interface WalletState {
  address: AleoAddress | null;
  isConnected: boolean;
  balance: bigint;  // in microcredits
  publicKey: string | null;
}

/**
 * Will status enum matching contract
 */
export enum WillStatus {
  INACTIVE = 0,
  ACTIVE = 1,
  TRIGGERED = 2,
  CLAIMED = 3,
  FULLY_CLAIMED = 3, // Alias for backwards compatibility
}

/**
 * Status labels for display
 */
export const STATUS_LABELS: Record<WillStatus, string> = {
  [WillStatus.INACTIVE]: 'Inactive',
  [WillStatus.ACTIVE]: 'Active',
  [WillStatus.TRIGGERED]: 'Triggered',
  [WillStatus.CLAIMED]: 'Claimed',
};

/**
 * Extended beneficiary with UI-specific fields
 */
export interface UIBeneficiary extends Beneficiary {
  displayName?: string;
  relationship?: string;
  sharePercent: number;  // calculated from shareBps
  beneficiaryAddr?: AleoAddress; // Alias for BenAllocation pattern
}

/**
 * Will with computed UI fields
 */
export interface UIWill extends WillConfig {
  status: WillStatus;
  lastCheckIn: bigint;        // block number
  deadline: bigint;           // block number
  blocksRemaining: bigint;    // blocks until deadline
  timeRemaining: string;      // human readable
  totalLocked: bigint;        // microcredits
  totalClaimed: bigint;       // microcredits
  beneficiaries: UIBeneficiary[];
  allocatedPercent: number;   // percentage of shares allocated
  unallocatedPercent: number; // percentage of shares remaining
}

/**
 * Will type alias for component compatibility
 */
export type Will = UIWill;

// ============================================
// Form Types
// ============================================

/**
 * Create will form data
 */
export interface CreateWillFormData {
  checkInPeriodDays: number;
  gracePeriodDays: number;
  beneficiaries: BeneficiaryFormData[];
  initialDeposit: string;  // in ALEO (will be converted to microcredits)
}

/**
 * Beneficiary form data
 */
export interface BeneficiaryFormData {
  address: AleoAddress;
  name: string;
  sharePercent: number;  // 0-100
  relationship: string;
}

// ============================================
// Toast/Modal Types
// ============================================

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export interface ModalState {
  isOpen: boolean;
  type: 'addBeneficiary' | 'deposit' | 'withdraw' | 'confirm' | null;
  data?: unknown;
}

// ============================================
// Constants
// ============================================

/**
 * Block time in seconds (Aleo ~20 seconds)
 */
export const BLOCK_TIME_SECONDS = 20;

/**
 * Blocks per day
 */
export const BLOCKS_PER_DAY = 4320;

/**
 * Microcredits per ALEO
 */
export const MICROCREDITS_PER_ALEO = 1_000_000n;

/**
 * Maximum beneficiaries
 */
export const MAX_BENEFICIARIES = 10;

// ============================================
// Utility Functions
// ============================================

/**
 * Convert days to blocks
 */
export function daysToBlocks(days: number): bigint {
  const blocks = Math.floor(days * BLOCKS_PER_DAY);
  // Cap at u32 max to match Leo contract's u32 type
  if (blocks > 4294967295) {
    return 4294967295n;
  }
  return BigInt(blocks);
}

/**
 * Convert blocks to days
 */
export function blocksToDays(blocks: bigint): number {
  return Number(blocks) / BLOCKS_PER_DAY;
}

/**
 * Format Aleo address for display (truncated)
 */
export function formatAddress(address: AleoAddress): string {
  if (!address || address.length < 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

/**
 * Convert microcredits to ALEO string
 */
export function formatCredits(microcredits: bigint): string {
  // Use BigInt division to avoid precision loss for large values
  const whole = microcredits / MICROCREDITS_PER_ALEO;
  const remainder = microcredits % MICROCREDITS_PER_ALEO;
  const decimal = Number(remainder) / Number(MICROCREDITS_PER_ALEO);
  const aleo = Number(whole) + decimal;
  return `${aleo.toFixed(2)} ALEO`;
}

/**
 * Convert ALEO to microcredits
 */
export function aleoToMicrocredits(aleo: string | number): bigint {
  return BigInt(Math.floor(Number(aleo) * 1_000_000));
}

/**
 * Convert blocks to human-readable time
 */
export function blocksToTime(blocks: bigint): string {
  const totalSeconds = Number(blocks) * BLOCK_TIME_SECONDS;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Convert basis points to percentage
 */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/**
 * Convert percentage to basis points
 */
export function percentToBps(percent: number): number {
  if (percent < 0 || percent > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }
  return Math.floor(percent * 100);
}

/**
 * Bech32 character set (excludes 1, b, i, o to avoid visual confusion)
 */
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

/**
 * Validate Aleo address format
 * Aleo addresses use Bech32 encoding: aleo1 prefix + 58 Bech32 characters
 */
export function isValidAleoAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  if (!address.startsWith('aleo1')) return false;
  if (address.length !== 63) return false;

  // Validate each character after the prefix is in Bech32 charset
  const data = address.slice(5); // Remove "aleo1" prefix
  for (const char of data) {
    if (!BECH32_CHARSET.includes(char)) {
      return false;
    }
  }
  return true;
}
