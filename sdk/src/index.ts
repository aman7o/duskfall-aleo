/**
 * Digital Will SDK
 * TypeScript SDK for interacting with the Digital Will Leo smart contract on Aleo
 *
 * @packageDocumentation
 */

// Export main client
export { DigitalWillClient } from './client';
export type { DigitalWillClientConfig } from './client';

// Export account management
export { Account, generateRandomAccount, isValidPrivateKey, isValidViewKey } from './account';
export type { AccountParams, PrivateKeyCiphertext } from './account';

// Export record provider
export {
  RecordProvider,
  MockRecordProvider,
  createRecordProvider,
} from './recordProvider';
export type {
  RecordProviderInterface,
  RecordProviderOptions,
  FoundRecord,
  CreditsRecord,
  RecordFilter,
} from './recordProvider';

// Export transaction builder
export { TransactionBuilder, createTransactionBuilder } from './transactionBuilder';
export type {
  TransactionPayload,
  TransactionBuilderConfig,
  BuildCreateWillParams,
  BuildAddBeneficiaryParams,
  BuildAddBeneficiaryWithDecoysParams,
  BuildDepositParams,
  BuildClaimWithMerkleProofParams,
  BuildInitiateTriggerParams,
  BuildExecuteTriggerParams,
} from './transactionBuilder';

// Export Merkle tree utilities
export {
  MerkleTree,
  verifyMerkleProof,
  formatProofForContract,
  createEmptyTree,
} from './merkle';
export type { MerkleLeaf, MerkleProof } from './merkle';

// Export error handling
export {
  DigitalWillError,
  ErrorCode,
  isDigitalWillError,
  assertCondition,
  withErrorHandling,
} from './errors';

// Export all types
export type {
  // Core types
  AleoAddress,
  AleoField,
  WillConfig,
  Beneficiary,
  BenAllocation,
  LockedCredits,
  ClaimableShare,
  SecretMessage,
  InheritanceClaim,
  TriggerBounty,
  WillStatusInfo,
  BeneficiaryInfo,
  TimeLock,
  PrivateBeneficiaryProof,

  // Parameter types
  CreateWillParams,
  CheckInParams,
  CheckInBackupParams,
  AddBeneficiaryParams,
  RevokeBeneficiaryParams,
  DepositParams,
  WithdrawParams,
  StoreSecretParams,
  TriggerWillParams,
  ClaimInheritanceParams,
  EmergencyRecoveryParams,
  DeactivateWillParams,
  ReactivateWillParams,

  // Response types
  CreateWillResponse,
  CheckInResponse,
  AddBeneficiaryResponse,
  RevokeBeneficiaryResponse,
  DepositResponse,
  StoreSecretResponse,
  TriggerWillResponse,
  ClaimInheritanceResponse,
  EmergencyRecoveryResponse,
  WithdrawResponse,
  WillStateChangeResponse,
} from './types';

// Export constants
export {
  PROGRAM_NAME,
  BLOCK_TIME_SECONDS,
  BLOCKS_PER_DAY,
  BLOCKS_PER_YEAR,
  MIN_CHECKIN_PERIOD,
  MAX_CHECKIN_PERIOD,
  MAX_BENEFICIARIES,
  TRIGGER_BOUNTY_BPS,
  MAX_BASIS_POINTS,
  MICROCREDITS_PER_ALEO,
  DEFAULT_CLAIM_DEADLINE_BLOCKS,
  WillStatus,
  STATUS_LABELS,
} from './constants';

// Export utility functions
export {
  daysToBlocks,
  blocksToDays,
  formatTimeRemaining,
  generateNonce,
  hashAddress,
  aleoToMicrocredits,
  microcreditsToAleo,
  formatAleo,
  calculateShare,
  bpsToPercent,
  percentToBps,
  isValidAleoAddress,
  isValidField,
  calculateTriggerBounty,
  isDeadlinePassed,
  blocksUntilDeadline,
  validateSharesTotal,
  sleep,
  retry,
} from './utils';
