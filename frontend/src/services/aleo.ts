/**
 * Aleo Blockchain Service
 * Testnet-only integration using robust RPC client
 */

import { AleoRPCClient, aleoRPC, TransactionChainStatus } from './rpc-client';
import { logger } from '@/utils/debug';
import {
  PROGRAM_ID,
  RPC_URL,
  TRANSACTION_FEE,
  EXPLORER_URL,
} from '@/constants/config';

// Use config values - these are exported for backward compatibility
const ALEO_RPC = RPC_URL;
const DEFAULT_TRANSACTION_FEE = TRANSACTION_FEE;

export interface AleoTransaction {
  id: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockHeight?: number;
}

export interface WillInfo {
  status: number;
  lastCheckIn: bigint;
  totalLocked: bigint;
  totalClaimed: bigint;
  checkInPeriod: bigint;
  gracePeriod: bigint;
}

/**
 * Extended will status info with calculated fields
 * Used by React Query hooks for deadline tracking
 *
 * NOTE: Uses camelCase consistently - lastCheckIn, checkInPeriod inherited from WillInfo
 * The `lastCheckin` and `checkinPeriod` aliases are kept for backward compatibility
 * but consumers should prefer the WillInfo fields (lastCheckIn, checkInPeriod)
 */
export interface WillStatusInfo extends WillInfo {
  blocksUntilDeadline: bigint;
  isOverdue: boolean;
  deadline: bigint;
  /** @deprecated Use lastCheckIn instead */
  lastCheckin: bigint;
  /** @deprecated Use checkInPeriod instead */
  checkinPeriod: bigint;
}

/**
 * Beneficiary information from chain
 */
export interface BeneficiaryInfo {
  willId: string;
  address: string;
  shareBps: number;
  priority: number;
  hasClaimed: boolean;
}

/**
 * Parse a u8 value from mapping response
 */
function parseU8(data: string | null): number | null {
  if (!data) return null;
  const match = data.match(/(\d+)u8/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Parse a u32 value from mapping response
 */
function parseU32(data: string | null): bigint | null {
  if (!data) return null;
  const match = data.match(/(\d+)u32/);
  return match ? BigInt(match[1]) : null;
}

/**
 * Parse a u64 value from mapping response
 */
function parseU64(data: string | null): bigint | null {
  if (!data) return null;
  const match = data.match(/(\d+)u64/);
  return match ? BigInt(match[1]) : null;
}

/**
 * Fetch a mapping value from an Aleo program
 * Returns null for non-existent keys, throws for network errors
 */
export async function getMappingValue(
  programId: string,
  mappingName: string,
  key: string
): Promise<string | null> {
  logger.rpc.request(`getMappingValue`, { programId, mappingName, key });
  try {
    const result = await aleoRPC.getMappingValue(programId, mappingName, key);
    logger.rpc.response(`getMappingValue:${mappingName}`, result);
    return result;
  } catch (error) {
    // FIX: Log and propagate network errors so callers can handle appropriately
    logger.rpc.error(`getMappingValue:${mappingName}`, error instanceof Error ? error : String(error));
    throw error;
  }
}

/**
 * Fetch the latest block height
 * Throws on network error to prevent incorrect deadline calculations
 */
export async function getLatestBlockHeight(): Promise<bigint> {
  logger.rpc.request('getHeight');
  try {
    const height = await aleoRPC.getHeight();
    logger.rpc.response('getHeight', height);
    return BigInt(height);
  } catch (error) {
    logger.rpc.error('getHeight', error instanceof Error ? error : String(error));
    // FIX: Throw instead of returning 0n to prevent false "expired" calculations
    // Returning 0n would make all wills appear expired during network issues
    throw new Error(`Failed to fetch block height: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get will status from chain
 * @param willId - will_id (field) for testnet
 */
export async function getWillStatus(willId: string): Promise<number | null> {
  const data = await getMappingValue(PROGRAM_ID, 'will_status', willId);
  return parseU8(data);
}

/**
 * Get last check-in block for a will
 * @param willId - will_id (field) for testnet
 */
export async function getLastCheckIn(willId: string): Promise<bigint | null> {
  const data = await getMappingValue(PROGRAM_ID, 'last_checkin', willId);
  return parseU32(data);
}

/**
 * Get total locked credits for a will
 * @param willId - will_id (field) for testnet
 */
export async function getTotalLocked(willId: string): Promise<bigint | null> {
  const data = await getMappingValue(PROGRAM_ID, 'total_locked', willId);
  return parseU64(data);
}

/**
 * Get total claimed credits for a will
 * @param willId - will_id (field) for testnet
 */
export async function getTotalClaimed(willId: string): Promise<bigint | null> {
  const data = await getMappingValue(PROGRAM_ID, 'total_claimed', willId);
  return parseU64(data);
}

/**
 * Get check-in period for a will
 * @param willId - will_id (field) for testnet
 */
export async function getCheckInPeriod(willId: string): Promise<bigint | null> {
  const data = await getMappingValue(PROGRAM_ID, 'checkin_periods', willId);
  return parseU32(data);
}

/**
 * Get grace period for a will
 * @param willId - will_id (field) for testnet
 */
export async function getGracePeriod(willId: string): Promise<bigint | null> {
  const data = await getMappingValue(PROGRAM_ID, 'grace_periods', willId);
  return parseU32(data);
}

/**
 * Get owner hash for a will (for backup check-in verification)
 * @param willId - will_id (field) for testnet
 */
export async function getOwnerHash(willId: string): Promise<string | null> {
  return getMappingValue(PROGRAM_ID, 'owner_hash', willId);
}

/**
 * Check if a beneficiary has already claimed
 * @param claimKey - hashed key for beneficiary claim lookup
 */
export async function hasBeneficiaryClaimed(claimKey: string): Promise<boolean> {
  const data = await getMappingValue(PROGRAM_ID, 'beneficiary_claimed', claimKey);
  return data === 'true';
}

/**
 * Get beneficiary allocation from mapping
 * @param allocationKey - hashed key for allocation lookup
 */
export async function getBeneficiaryAllocation(allocationKey: string): Promise<number | null> {
  const data = await getMappingValue(PROGRAM_ID, 'beneficiary_allocations', allocationKey);
  if (!data) return null;
  const match = data.match(/(\d+)u16/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Get comprehensive will info from chain
 * @param willId - will_id (field) for testnet
 */
export async function getWillInfo(willId: string): Promise<WillInfo | null> {
  logger.rpc.request('getWillInfo', { willId });
  try {
    const [status, lastCheckIn, totalLocked, totalClaimed, checkInPeriod, gracePeriod] = await Promise.all([
      getWillStatus(willId),
      getLastCheckIn(willId),
      getTotalLocked(willId),
      getTotalClaimed(willId),
      getCheckInPeriod(willId),
      getGracePeriod(willId),
    ]);

    if (status === null) {
      logger.rpc.response('getWillInfo', null);
      return null;
    }

    const result = {
      status,
      lastCheckIn: lastCheckIn ?? 0n,
      totalLocked: totalLocked ?? 0n,
      totalClaimed: totalClaimed ?? 0n,
      checkInPeriod: checkInPeriod ?? 0n,
      gracePeriod: gracePeriod ?? 0n,
    };
    logger.rpc.response('getWillInfo', { status: result.status, totalLocked: String(result.totalLocked) });
    return result;
  } catch (error) {
    logger.rpc.error('getWillInfo', error instanceof Error ? error : String(error));
    return null;
  }
}

/**
 * Get extended will status info with calculated deadline fields
 * @param willId - will_id (field) for testnet
 * @throws Error if block height cannot be fetched (network error)
 */
export async function getWillStatusInfo(willId: string): Promise<WillStatusInfo | null> {
  const info = await getWillInfo(willId);
  if (!info) return null;

  // FIX: Let getLatestBlockHeight error propagate so React Query can handle retries
  // This is intentional - we don't want to return stale/incorrect deadline info
  const currentHeight = await getLatestBlockHeight();
  // Cap at u32 max to match Leo contract's safe_deadline calculation
  const rawDeadline = info.lastCheckIn + info.checkInPeriod + info.gracePeriod;
  const deadline = rawDeadline > 4294967295n ? 4294967295n : rawDeadline;
  const blocksUntilDeadline = deadline > currentHeight ? deadline - currentHeight : 0n;
  const isOverdue = currentHeight >= deadline;

  return {
    ...info,
    blocksUntilDeadline,
    isOverdue,
    deadline,
    lastCheckin: info.lastCheckIn,
    checkinPeriod: info.checkInPeriod,
  };
}

/**
 * Check if program is deployed
 */
export async function isProgramDeployed(): Promise<boolean> {
  logger.rpc.request('isProgramDeployed', { programId: PROGRAM_ID });
  const result = await aleoRPC.programExists(PROGRAM_ID);
  logger.rpc.response('isProgramDeployed', result);
  return result;
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(txId: string): Promise<AleoTransaction | null> {
  logger.rpc.request('getTransactionStatus', { txId });
  try {
    const status = await aleoRPC.getTransactionStatus(txId);
    const tx = await aleoRPC.getTransaction(txId);

    const statusMap: Record<TransactionChainStatus, 'pending' | 'confirmed' | 'failed'> = {
      'Queued': 'pending',
      'Processing': 'pending',
      'Finalized': 'confirmed',
      'Rejected': 'failed',
      'Failed': 'failed',
      'Unknown': 'pending',
    };

    const result = {
      id: txId,
      status: statusMap[status],
      blockHeight: tx?.block_height as number | undefined,
    };
    logger.rpc.response('getTransactionStatus', { status: result.status, blockHeight: result.blockHeight });
    return result;
  } catch (error) {
    logger.rpc.error('getTransactionStatus', error instanceof Error ? error : String(error));
    return null;
  }
}

/**
 * Poll for transaction confirmation with exponential backoff
 */
export async function waitForTransaction(
  txId: string,
  maxAttempts: number = 60,
  initialInterval: number = 2000
): Promise<'confirmed' | 'failed' | 'timeout'> {
  let interval = initialInterval;
  const maxInterval = 10000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, interval));

    const tx = await getTransactionStatus(txId);

    if (tx?.status === 'confirmed') {
      return 'confirmed';
    }

    if (tx?.status === 'failed') {
      return 'failed';
    }

    // Exponential backoff with cap
    interval = Math.min(interval * 1.5, maxInterval);
  }

  return 'timeout';
}

/**
 * Build transaction for Leo Wallet to sign and broadcast
 */
export function buildTransaction(
  transition: string,
  inputs: string[],
  fee: number = DEFAULT_TRANSACTION_FEE
): {
  programId: string;
  functionName: string;
  inputs: string[];
  fee: number;
} {
  return {
    programId: PROGRAM_ID,
    functionName: transition,
    inputs,
    fee,
  };
}

/**
 * Calculate dynamic fee based on transition complexity
 */
export function calculateDynamicFee(transitionName: string): number {
  // More complex transitions require higher fees
  const feeMultipliers: Record<string, number> = {
    'create_will': 2.0,
    'add_beneficiary': 1.5,
    'deposit': 1.5,
    'deposit_public': 1.2,
    'withdraw': 1.5,
    'check_in': 1.0,
    'check_in_backup': 1.0,
    'trigger_will': 2.0,
    'claim_inheritance': 2.0,
    'claim_inheritance_v2': 2.0,
    'emergency_recovery': 2.0,
    'deactivate_will': 1.0,
    'reactivate_will': 1.2,
    'revoke_beneficiary': 1.5,
    'store_secret': 1.5,
  };

  const multiplier = feeMultipliers[transitionName] || 1.0;
  return Math.floor(DEFAULT_TRANSACTION_FEE * multiplier);
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(txId: string): string {
  return `${EXPLORER_URL}/transaction/${txId}`;
}

/**
 * Get explorer URL for a program
 */
export function getProgramExplorerUrl(programId: string = PROGRAM_ID): string {
  return `${EXPLORER_URL}/program/${programId}`;
}

/**
 * Enable verbose mode for debugging
 */
export function setVerboseMode(enabled: boolean): void {
  aleoRPC.setVerbose(enabled);
}

/**
 * Clear the RPC cache
 */
export function clearCache(): void {
  aleoRPC.clearCache();
}

/**
 * Create a custom RPC client (for advanced use cases)
 */
export function createCustomClient(
  baseUrl: string,
  network: string = 'testnet'
): AleoRPCClient {
  return new AleoRPCClient(baseUrl, network);
}

export const aleoService = {
  getMappingValue,
  getLatestBlockHeight,
  getWillStatus,
  getWillStatusInfo,
  getLastCheckIn,
  getTotalLocked,
  getTotalClaimed,
  getCheckInPeriod,
  getGracePeriod,
  getOwnerHash,
  hasBeneficiaryClaimed,
  getBeneficiaryAllocation,
  getWillInfo,
  isProgramDeployed,
  getTransactionStatus,
  waitForTransaction,
  buildTransaction,
  calculateDynamicFee,
  getExplorerUrl,
  getProgramExplorerUrl,
  setVerboseMode,
  clearCache,
  createCustomClient,
  PROGRAM_ID,
  ALEO_RPC,
  DEFAULT_FEE: DEFAULT_TRANSACTION_FEE,
};
