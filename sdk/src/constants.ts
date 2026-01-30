/**
 * Constants for the Digital Will Leo Program
 */

/**
 * Program identifier on Aleo blockchain
 */
export const PROGRAM_NAME = 'digital_will_v7.aleo';

/**
 * Aleo block time in seconds (approximately)
 */
export const BLOCK_TIME_SECONDS = 20;

/**
 * Blocks per day (assuming 20s block time)
 * 24h * 60m * 60s / 20s = 4320 blocks
 */
export const BLOCKS_PER_DAY = 4320;

/**
 * Blocks per year (approximately)
 */
export const BLOCKS_PER_YEAR = 1576800;

/**
 * Minimum check-in period in blocks (1 day)
 */
export const MIN_CHECKIN_PERIOD = 4320;

/**
 * Maximum check-in period in blocks (1 year)
 */
export const MAX_CHECKIN_PERIOD = 1576800;

/**
 * Maximum number of beneficiaries per will
 */
export const MAX_BENEFICIARIES = 10;

/**
 * Trigger bounty in basis points (0.1% = 10 basis points)
 */
export const TRIGGER_BOUNTY_BPS = 10;

/**
 * Basis points representing 100% (10000 basis points = 100%)
 */
export const MAX_BASIS_POINTS = 10000;

/**
 * Will status codes matching Leo contract
 */
export enum WillStatus {
  INACTIVE = 0,
  ACTIVE = 1,
  TRIGGERED = 2,
  CLAIMED = 3,
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
 * Microcredits per Aleo credit (1 ALEO = 1,000,000 microcredits)
 */
export const MICROCREDITS_PER_ALEO = 1_000_000;

/**
 * Default claim deadline after trigger (1 year in blocks)
 */
export const DEFAULT_CLAIM_DEADLINE_BLOCKS = BLOCKS_PER_YEAR;
