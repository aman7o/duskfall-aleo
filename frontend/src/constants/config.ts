/**
 * Duskfall - Configuration Constants
 * Single source of truth for all configuration values
 * Based on ZKescrow patterns for proper Aleo integration
 */

// ==============================================
// Network Configuration (ZKescrow Pattern)
// ==============================================

export enum AleoNetwork {
  Mainnet = 'mainnet',
  Testnet = 'testnetbeta',
  Localnet = 'localnet',
}

export interface NetworkConfig {
  name: string;
  chainId: string;
  rpcUrl: string;
  explorerUrl: string;
}

export const NETWORK_CONFIGS: Record<AleoNetwork, NetworkConfig> = {
  [AleoNetwork.Mainnet]: {
    name: 'Aleo Mainnet',
    chainId: 'mainnet',
    rpcUrl: 'https://api.explorer.aleo.org/v1',
    explorerUrl: 'https://explorer.provable.com',
  },
  [AleoNetwork.Testnet]: {
    name: 'Aleo Testnet Beta',
    chainId: 'testnetbeta',
    rpcUrl: 'https://api.explorer.provable.com/v1',
    explorerUrl: 'https://explorer.provable.com',
  },
  [AleoNetwork.Localnet]: {
    name: 'Aleo Localnet',
    chainId: 'localnet',
    rpcUrl: 'http://localhost:3030',
    explorerUrl: 'http://localhost:3030',
  },
};

// ==============================================
// Current Network Selection
// ==============================================

/**
 * Current network for the application
 * Change this to switch between networks
 */
export const CURRENT_NETWORK = AleoNetwork.Testnet;

/**
 * Get current network configuration
 */
export const getCurrentNetworkConfig = (): NetworkConfig => {
  return NETWORK_CONFIGS[CURRENT_NETWORK];
};

// ==============================================
// Program Configuration
// ==============================================

/**
 * Deployed program ID on Aleo
 * Update this when deploying a new version
 */
export const PROGRAM_ID = 'digital_will_v7.aleo';

/**
 * Aleo RPC endpoint (derived from current network)
 */
export const RPC_URL = getCurrentNetworkConfig().rpcUrl;

/**
 * Network identifier for wallet transactions
 */
export const NETWORK = getCurrentNetworkConfig().chainId;

/**
 * Explorer URL for viewing transactions
 */
export const EXPLORER_URL = getCurrentNetworkConfig().explorerUrl;

// ==============================================
// Transaction Configuration (ZKescrow Pattern)
// ==============================================

/**
 * Default base transaction fee in microcredits (0.1 ALEO)
 * Complex operations use dynamic multipliers (see calculateDynamicFee in aleo.ts)
 */
export const TRANSACTION_FEE = 200_000;

/**
 * API request timeout in milliseconds
 */
export const API_TIMEOUT = 15_000;

/**
 * Maximum retries for transaction confirmation polling
 */
export const MAX_TX_POLL_RETRIES = 12;

/**
 * Delay between transaction poll attempts (ms)
 */
export const TX_POLL_INTERVAL = 5_000;

// ==============================================
// Time Constants
// ==============================================

/**
 * Approximate blocks per day on Aleo (~20 second block time)
 * 86400 seconds / 20 seconds = 4320 blocks
 */
export const BLOCKS_PER_DAY = 4320;

/**
 * Block time in seconds (approximate)
 */
export const BLOCK_TIME_SECONDS = 20;

/**
 * Minimum check-in period in blocks (~1 day)
 */
export const MIN_CHECKIN_PERIOD = 4320;

/**
 * Maximum check-in period in blocks (~1 year)
 */
export const MAX_CHECKIN_PERIOD = 1_576_800;

// ==============================================
// Will Configuration Limits
// ==============================================

/**
 * Maximum number of beneficiaries per will
 */
export const MAX_BENEFICIARIES = 10;

/**
 * Maximum basis points (100%)
 */
export const MAX_BPS = 10_000;

/**
 * Trigger bounty percentage in basis points (0.1%)
 */
export const TRIGGER_BOUNTY_BPS = 10;

// ==============================================
// Credit Constants
// ==============================================

/**
 * Microcredits per ALEO token
 */
export const MICROCREDITS_PER_ALEO = 1_000_000n;

/**
 * Minimum deposit amount in microcredits (0.01 ALEO)
 */
export const MIN_DEPOSIT = 10_000n;

// ==============================================
// Transaction Polling (ZKescrow Pattern)
// ==============================================

/**
 * Interval between transaction status polls (ms)
 * ZKescrow uses 5000ms
 */
export const TRANSACTION_POLL_INTERVAL = 5_000;

/**
 * Maximum wait time for transaction confirmation (ms)
 * 30 attempts * 5 seconds = 2.5 minutes
 */
export const MAX_TRANSACTION_WAIT = 150_000;

// ==============================================
// Input Formatting Helpers (ZKescrow Pattern)
// ==============================================

/**
 * Format a number as Leo u8 type
 */
export const formatU8 = (value: number): string => `${value}u8`;

/**
 * Format a number as Leo u16 type
 */
export const formatU16 = (value: number): string => `${value}u16`;

/**
 * Format a number/bigint as Leo u32 type
 */
export const formatU32 = (value: number | bigint): string => `${value}u32`;

/**
 * Format a number/bigint as Leo u64 type
 */
export const formatU64 = (value: number | bigint): string => `${value}u64`;

/**
 * Format a string as Leo field type
 */
export const formatField = (value: string | number | bigint): string => {
  const str = value.toString().replace(/field$/, '');
  return `${str}field`;
};

/**
 * Format boolean for Leo
 */
export const formatBool = (value: boolean): string => value ? 'true' : 'false';
