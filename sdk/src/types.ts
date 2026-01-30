/**
 * TypeScript type definitions matching Leo smart contract records and structures
 */

/**
 * Aleo address type (string representation)
 */
export type AleoAddress = string;

/**
 * Aleo field element type (string representation)
 */
export type AleoField = string;

/**
 * Main will configuration record
 * Owned by the will creator
 */
export interface WillConfig {
  owner: AleoAddress;
  willId: AleoField;
  /** Check-in period in blocks (u32 in Leo contract, max 4294967295) */
  checkInPeriod: number;
  /** Grace period in blocks (u32 in Leo contract, max 4294967295) */
  gracePeriod: number;
  totalSharesBps: number;
  numBeneficiaries: number;
  isActive: boolean;
  nonce: AleoField;
}

/**
 * Beneficiary designation record
 * Owned by the beneficiary
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
 * Beneficiary allocation record
 * Owned by the will owner (for visibility and control)
 * This is what the contract returns from add_beneficiary
 */
export interface BenAllocation {
  owner: AleoAddress;
  beneficiaryAddr: AleoAddress;
  willId: AleoField;
  shareBps: number;
  priority: number;
  isActive: boolean;
}

/**
 * Locked credits record representing actual value in the will
 */
export interface LockedCredits {
  owner: AleoAddress;
  willId: AleoField;
  amount: bigint;
  depositor: AleoAddress;
}

/**
 * Claimable share created when will is triggered
 */
export interface ClaimableShare {
  owner: AleoAddress;
  willId: AleoField;
  amount: bigint;
  originalOwner: AleoAddress;
}

/**
 * Secret message record with encrypted data
 */
export interface SecretMessage {
  owner: AleoAddress;
  willId: AleoField;
  recipient: AleoAddress;
  data0: AleoField;
  data1: AleoField;
  data2: AleoField;
  data3: AleoField;
}

/**
 * Proof of inheritance claim
 */
export interface InheritanceClaim {
  owner: AleoAddress;
  willId: AleoField;
  originalOwner: AleoAddress;
  amountClaimed: bigint;
}

/**
 * Trigger bounty reward record
 */
export interface TriggerBounty {
  owner: AleoAddress;
  willId: AleoField;
  bountyAmount: bigint;
}

/**
 * Time-locked action authorization record
 * Used for two-phase trigger mechanism
 */
export interface TimeLock {
  owner: AleoAddress;
  willId: AleoField;
  actionType: number;  // 1=claim, 2=trigger, 3=recovery
  unlockBlock: number;
  authorizedAmount: bigint;
}

/**
 * Private beneficiary proof record
 * Used for Merkle-based beneficiary verification
 */
export interface PrivateBeneficiaryProof {
  owner: AleoAddress;
  willId: AleoField;
  beneficiaryHash: AleoField;
  merklePath: [AleoField, AleoField, AleoField, AleoField];
  pathIndices: number;
}

/**
 * Will status information derived from on-chain mappings
 */
export interface WillStatusInfo {
  willId: AleoField;
  status: number;
  /** Last check-in block height (u32) */
  lastCheckin: number;
  /** Check-in period in blocks (u32) */
  checkinPeriod: number;
  /** Grace period in blocks (u32) */
  gracePeriod: number;
  totalLocked: bigint;
  totalClaimed: bigint;
  beneficiaryCommitment: AleoField;
  ownerHash: AleoField;
  /** Calculated deadline block height (u32) */
  deadline: number;
  /** Blocks until deadline (can be negative if passed) */
  blocksUntilDeadline: number;
  isOverdue: boolean;
}

/**
 * Beneficiary information for adding to will
 */
export interface BeneficiaryInfo {
  beneficiary: AleoAddress;
  shareBps: number;
  priority: number;
}

// ============================================
// Transition Parameter Types
// ============================================

/**
 * Parameters for creating a new will
 */
export interface CreateWillParams {
  nonce: AleoField;
  /** Check-in period in blocks (u32 in Leo contract, max 4294967295) */
  checkInPeriod: number;
  /** Grace period in blocks (u32 in Leo contract, max 4294967295) */
  gracePeriod: number;
}

/**
 * Parameters for checking in
 */
export interface CheckInParams {
  config: WillConfig;
}

/**
 * Parameters for backup check-in
 */
export interface CheckInBackupParams {
  willId: AleoField;
}

/**
 * Parameters for adding a beneficiary
 */
export interface AddBeneficiaryParams {
  config: WillConfig;
  beneficiaryAddress: AleoAddress;
  shareBps: number;
  priority: number;
}

/**
 * Parameters for revoking a beneficiary
 */
export interface RevokeBeneficiaryParams {
  config: WillConfig;
  beneficiaryRecord: Beneficiary;
}


/**
 * Parameters for depositing credits
 */
export interface DepositParams {
  config: WillConfig;
  amount: bigint;
}

/**
 * Parameters for withdrawing credits
 */
export interface WithdrawParams {
  config: WillConfig;
  lockedCredits: LockedCredits;
}

/**
 * Parameters for storing a secret message
 */
export interface StoreSecretParams {
  config: WillConfig;
  recipient: AleoAddress;
  data0: AleoField;
  data1: AleoField;
  data2: AleoField;
  data3: AleoField;
}

/**
 * Parameters for triggering a will
 */
export interface TriggerWillParams {
  willId: AleoField;
}

/**
 * Parameters for claiming inheritance
 */
export interface ClaimInheritanceParams {
  beneficiaryRecord: Beneficiary;
  /** Locked credits record to claim from */
  lockedCredits: LockedCredits;
  /** Optional: explicit amount to claim (if not provided, claims full share) */
  amountToClaim?: bigint;
}

/**
 * Parameters for emergency recovery
 */
export interface EmergencyRecoveryParams {
  config: WillConfig;
  lockedCredits: LockedCredits;
}

/**
 * Parameters for deactivating a will
 */
export interface DeactivateWillParams {
  config: WillConfig;
}

/**
 * Parameters for reactivating a will
 */
export interface ReactivateWillParams {
  config: WillConfig;
}

// ============================================
// Response Types
// ============================================

/**
 * Response from creating a will
 */
export interface CreateWillResponse {
  config: WillConfig;
  transactionId?: string;
}

/**
 * Response from check-in operation
 */
export interface CheckInResponse {
  config: WillConfig;
  transactionId?: string;
}

/**
 * Response from adding a beneficiary
 */
export interface AddBeneficiaryResponse {
  config: WillConfig;
  beneficiary: Beneficiary;
  /** Allocation record owned by will owner for visibility */
  allocation?: BenAllocation;
  transactionId?: string;
}

/**
 * Response from revoking a beneficiary
 */
export interface RevokeBeneficiaryResponse {
  config: WillConfig;
  revokedBeneficiary: Beneficiary;
  transactionId?: string;
}

/**
 * Response from deposit operation
 */
export interface DepositResponse {
  config: WillConfig;
  lockedCredits: LockedCredits;
  transactionId?: string;
}

/**
 * Response from storing a secret
 */
export interface StoreSecretResponse {
  config: WillConfig;
  secret: SecretMessage;
  transactionId?: string;
}

/**
 * Response from triggering a will
 */
export interface TriggerWillResponse {
  bounty: TriggerBounty;
  transactionId?: string;
}

/**
 * Response from claiming inheritance
 */
export interface ClaimInheritanceResponse {
  claimableShare: ClaimableShare;
  claim: InheritanceClaim;
  transactionId?: string;
}

/**
 * Response from emergency recovery
 */
export interface EmergencyRecoveryResponse {
  config: WillConfig;
  recoveredCredits: LockedCredits;
  transactionId?: string;
}


/**
 * Response from withdraw operation
 */
export interface WithdrawResponse {
  config: WillConfig;
  transactionId?: string;
}

/**
 * Response from deactivate/reactivate operations
 */
export interface WillStateChangeResponse {
  config: WillConfig;
  transactionId?: string;
}
