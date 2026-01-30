/**
 * Digital Will Client - Main SDK class for interacting with the Leo smart contract
 */

import {
  AleoAddress,
  AleoField,
  WillConfig,
  Beneficiary,
  LockedCredits,
  WillStatusInfo,
  CreateWillParams,
  CreateWillResponse,
  CheckInParams,
  CheckInResponse,
  CheckInBackupParams,
  AddBeneficiaryParams,
  AddBeneficiaryResponse,
  RevokeBeneficiaryParams,
  RevokeBeneficiaryResponse,
  DepositParams,
  DepositResponse,
  WithdrawParams,
  WithdrawResponse,
  StoreSecretParams,
  StoreSecretResponse,
  TriggerWillParams,
  TriggerWillResponse,
  ClaimInheritanceParams,
  ClaimInheritanceResponse,
  EmergencyRecoveryParams,
  EmergencyRecoveryResponse,
  DeactivateWillParams,
  ReactivateWillParams,
  WillStateChangeResponse,
} from './types';
import {
  generateNonce,
  hashAddress,
  daysToBlocks,
  blocksToDays,
  blocksUntilDeadline,
  isDeadlinePassed,
} from './utils';
import {
  PROGRAM_NAME,
  MIN_CHECKIN_PERIOD,
  MAX_CHECKIN_PERIOD,
  MAX_BENEFICIARIES,
  WillStatus,
} from './constants';

/**
 * Configuration for the Digital Will Client
 */
export interface DigitalWillClientConfig {
  /**
   * Network to connect to (mainnet, testnet, or custom)
   */
  network?: 'mainnet' | 'testnet' | string;

  /**
   * API endpoint for Aleo network
   */
  apiEndpoint?: string;

  /**
   * Private key for signing transactions (optional)
   */
  privateKey?: string;

  /**
   * Program name override (default: digital_will_v2.aleo)
   */
  programName?: string;
}

/**
 * Digital Will Client
 *
 * Main class for interacting with the Digital Will Leo smart contract.
 * Provides methods for all contract transitions and queries.
 *
 * @example
 * ```typescript
 * const client = new DigitalWillClient({
 *   network: 'testnet',
 *   privateKey: 'your-private-key'
 * });
 *
 * // Create a new will
 * const { config } = await client.createWill({
 *   nonce: generateNonce(),
 *   checkInPeriod: daysToBlocks(30),
 *   gracePeriod: daysToBlocks(7)
 * });
 * ```
 */
export class DigitalWillClient {
  private readonly network: string;
  private readonly apiEndpoint: string;
  private readonly programName: string;
  private privateKey?: string;

  /**
   * Create a new Digital Will Client instance
   * @param config Client configuration
   */
  constructor(config: DigitalWillClientConfig = {}) {
    this.network = config.network || 'testnet';
    this.apiEndpoint = config.apiEndpoint || this.getDefaultEndpoint();
    this.programName = config.programName || PROGRAM_NAME;
    this.privateKey = config.privateKey;
  }

  /**
   * Get default API endpoint based on network
   */
  private getDefaultEndpoint(): string {
    switch (this.network) {
      case 'mainnet':
        return 'https://api.explorer.aleo.org/v1';
      case 'testnet':
        return 'https://api.explorer.provable.com/v1';
      default:
        return this.network;
    }
  }

  /**
   * Set the private key for signing transactions
   * @param privateKey Private key string
   */
  setPrivateKey(privateKey: string): void {
    this.privateKey = privateKey;
  }

  /**
   * Create a new digital will
   *
   * @param params - Parameters for creating the will
   * @returns Will configuration and transaction ID
   *
   * @example
   * ```typescript
   * const response = await client.createWill({
   *   nonce: generateNonce(),
   *   checkInPeriod: daysToBlocks(30),
   *   gracePeriod: daysToBlocks(7)
   * });
   * console.log('Will ID:', response.config.willId);
   * ```
   */
  async createWill(params: CreateWillParams): Promise<CreateWillResponse> {
    this.validateCheckInPeriod(params.checkInPeriod);
    this.validateCheckInPeriod(params.gracePeriod);

    // Placeholder implementation
    // In production: call Aleo SDK to execute transition
    const willId = this.generateWillId(params.nonce);
    const ownerAddress = await this.getCallerAddress();

    const config: WillConfig = {
      owner: ownerAddress,
      willId,
      checkInPeriod: params.checkInPeriod,
      gracePeriod: params.gracePeriod,
      totalSharesBps: 0,
      numBeneficiaries: 0,
      isActive: true,
      nonce: params.nonce,
    };

    return {
      config,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Check in to reset the will deadline
   *
   * @param params - Check-in parameters with will config
   * @returns Updated will configuration
   *
   * @example
   * ```typescript
   * const response = await client.checkIn({ config: myWillConfig });
   * console.log('Checked in successfully');
   * ```
   */
  async checkIn(params: CheckInParams): Promise<CheckInResponse> {
    this.validateWillOwnership(params.config);

    // Return same config (check-in updates on-chain state only)
    return {
      config: params.config,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Backup check-in without WillConfig record
   * Uses public will_id and verifies ownership via hash
   *
   * @param params - Backup check-in parameters
   * @returns Transaction ID
   *
   * @example
   * ```typescript
   * await client.checkInBackup({ willId: '12345field' });
   * ```
   */
  async checkInBackup(params: CheckInBackupParams): Promise<{ transactionId?: string }> {
    // Placeholder implementation
    return {
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Add a beneficiary to the will
   *
   * @param params - Beneficiary parameters
   * @returns Updated config and beneficiary record
   *
   * @example
   * ```typescript
   * const response = await client.addBeneficiary({
   *   config: myWillConfig,
   *   beneficiaryAddress: 'aleo1...',
   *   shareBps: 5000, // 50%
   *   priority: 1
   * });
   * ```
   */
  async addBeneficiary(params: AddBeneficiaryParams): Promise<AddBeneficiaryResponse> {
    this.validateWillOwnership(params.config);
    this.validateShareBps(params.shareBps);

    if (params.config.numBeneficiaries >= MAX_BENEFICIARIES) {
      throw new Error(`Maximum ${MAX_BENEFICIARIES} beneficiaries allowed`);
    }

    const newTotal = params.config.totalSharesBps + params.shareBps;
    if (newTotal > 10000) {
      throw new Error('Total shares cannot exceed 100%');
    }

    const verificationHash = this.generateVerificationHash(
      params.beneficiaryAddress,
      params.config.owner,
      params.config.nonce
    );

    const beneficiary: Beneficiary = {
      owner: params.beneficiaryAddress,
      willOwner: params.config.owner,
      willId: params.config.willId,
      shareBps: params.shareBps,
      priority: params.priority,
      verificationHash,
      isActive: true,
    };

    const updatedConfig: WillConfig = {
      ...params.config,
      totalSharesBps: newTotal,
      numBeneficiaries: params.config.numBeneficiaries + 1,
    };

    return {
      config: updatedConfig,
      beneficiary,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Revoke a beneficiary from the will
   *
   * @param params - Revocation parameters
   * @returns Updated config and revoked beneficiary record
   *
   * @example
   * ```typescript
   * const response = await client.revokeBeneficiary({
   *   config: myWillConfig,
   *   beneficiaryRecord: beneficiaryToRevoke
   * });
   * ```
   */
  async revokeBeneficiary(params: RevokeBeneficiaryParams): Promise<RevokeBeneficiaryResponse> {
    this.validateWillOwnership(params.config);

    if (params.config.willId !== params.beneficiaryRecord.willId) {
      throw new Error('Beneficiary does not belong to this will');
    }

    if (!params.beneficiaryRecord.isActive) {
      throw new Error('Beneficiary is already revoked');
    }

    const revokedBeneficiary: Beneficiary = {
      ...params.beneficiaryRecord,
      shareBps: 0,
      isActive: false,
    };

    const updatedConfig: WillConfig = {
      ...params.config,
      totalSharesBps: params.config.totalSharesBps - params.beneficiaryRecord.shareBps,
      numBeneficiaries: params.config.numBeneficiaries - 1,
    };

    return {
      config: updatedConfig,
      revokedBeneficiary,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Deposit ALEO credits into the will
   *
   * @param params - Deposit parameters
   * @returns Updated config and locked credits record
   *
   * @example
   * ```typescript
   * const response = await client.deposit({
   *   config: myWillConfig,
   *   amount: aleoToMicrocredits(100)
   * });
   * ```
   */
  async deposit(params: DepositParams): Promise<DepositResponse> {
    this.validateWillOwnership(params.config);

    if (params.amount <= 0n) {
      throw new Error('Deposit amount must be positive');
    }

    const ownerAddress = await this.getCallerAddress();

    const lockedCredits: LockedCredits = {
      owner: ownerAddress,
      willId: params.config.willId,
      amount: params.amount,
      depositor: ownerAddress,
    };

    return {
      config: params.config,
      lockedCredits,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Withdraw credits from the will (only when active, not triggered)
   *
   * @param params - Withdrawal parameters
   * @returns Updated config
   *
   * @example
   * ```typescript
   * await client.withdraw({
   *   config: myWillConfig,
   *   lockedCredits: myLockedCredits
   * });
   * ```
   */
  async withdraw(params: WithdrawParams): Promise<WithdrawResponse> {
    this.validateWillOwnership(params.config);

    if (!params.config.isActive) {
      throw new Error('Cannot withdraw from inactive will');
    }

    if (params.config.willId !== params.lockedCredits.willId) {
      throw new Error('Locked credits do not belong to this will');
    }

    return {
      config: params.config,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Store an encrypted secret message in the will
   *
   * @param params - Secret storage parameters
   * @returns Updated config and secret record
   *
   * @example
   * ```typescript
   * const response = await client.storeSecret({
   *   config: myWillConfig,
   *   recipient: 'aleo1...',
   *   data0: '123field',
   *   // ... data1-data7
   *   nonce: generateNonce()
   * });
   * ```
   */
  async storeSecret(params: StoreSecretParams): Promise<StoreSecretResponse> {
    this.validateWillOwnership(params.config);

    if (!params.config.isActive) {
      throw new Error('Cannot store secret in inactive will');
    }

    const secret = {
      owner: params.config.owner,
      willId: params.config.willId,
      recipient: params.recipient,
      data0: params.data0,
      data1: params.data1,
      data2: params.data2,
      data3: params.data3,
    };

    return {
      config: params.config,
      secret,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Trigger the will after deadline has passed
   * Anyone can call this to trigger the will and receive a bounty
   *
   * @param params - Trigger parameters
   * @returns Trigger bounty record
   *
   * @example
   * ```typescript
   * const response = await client.triggerWill({ willId: '12345field' });
   * console.log('Bounty:', response.bounty.bountyAmount);
   * ```
   */
  async triggerWill(params: TriggerWillParams): Promise<TriggerWillResponse> {
    const callerAddress = await this.getCallerAddress();

    // In production, verify deadline has passed via on-chain check
    const bounty = {
      owner: callerAddress,
      willId: params.willId,
      bountyAmount: 0n, // Calculated on-chain
    };

    return {
      bounty,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Claim inheritance as a beneficiary
   *
   * @param params - Claim parameters
   * @returns Claimable share and claim proof
   *
   * @example
   * ```typescript
   * const response = await client.claimInheritance({
   *   beneficiaryRecord: myBeneficiaryRecord,
   *   lockedCredits: willLockedCredits
   * });
   * ```
   */
  async claimInheritance(params: ClaimInheritanceParams): Promise<ClaimInheritanceResponse> {
    const callerAddress = await this.getCallerAddress();

    if (params.beneficiaryRecord.owner !== callerAddress) {
      throw new Error('Caller is not the beneficiary owner');
    }

    if (!params.beneficiaryRecord.isActive) {
      throw new Error('Beneficiary has been revoked');
    }

    if (params.beneficiaryRecord.willId !== params.lockedCredits.willId) {
      throw new Error('Records do not match the same will');
    }

    // Calculate maximum share based on beneficiary's allocation
    const maxShareAmount = (params.lockedCredits.amount * BigInt(params.beneficiaryRecord.shareBps)) / 10000n;
    // Use explicit amount if provided, otherwise claim full share
    const shareAmount = params.amountToClaim !== undefined ? params.amountToClaim : maxShareAmount;

    // Validate claim amount doesn't exceed entitlement
    if (shareAmount > maxShareAmount) {
      throw new Error(`Claim amount ${shareAmount} exceeds entitled share ${maxShareAmount}`);
    }
    if (shareAmount <= 0n) {
      throw new Error('Claim amount must be positive');
    }

    const claimableShare = {
      owner: callerAddress,
      willId: params.beneficiaryRecord.willId,
      amount: shareAmount,
      originalOwner: params.beneficiaryRecord.willOwner,
    };

    const claim = {
      owner: callerAddress,
      willId: params.beneficiaryRecord.willId,
      originalOwner: params.beneficiaryRecord.willOwner,
      amountClaimed: shareAmount,
    };

    return {
      claimableShare,
      claim,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Emergency recovery - owner reclaims assets if still alive
   * Only works if will is triggered but less than 50% claimed
   *
   * @param params - Recovery parameters
   * @returns Recovered config and credits
   *
   * @example
   * ```typescript
   * const response = await client.emergencyRecovery({
   *   config: myWillConfig,
   *   lockedCredits: myLockedCredits
   * });
   * ```
   */
  async emergencyRecovery(params: EmergencyRecoveryParams): Promise<EmergencyRecoveryResponse> {
    this.validateWillOwnership(params.config);

    if (params.config.willId !== params.lockedCredits.willId) {
      throw new Error('Records do not match the same will');
    }

    const reactivatedConfig: WillConfig = {
      ...params.config,
      isActive: true,
    };

    const recoveredCredits: LockedCredits = {
      ...params.lockedCredits,
      owner: params.config.owner,
    };

    return {
      config: reactivatedConfig,
      recoveredCredits,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Deactivate the will
   *
   * @param params - Deactivation parameters
   * @returns Deactivated config
   */
  async deactivateWill(params: DeactivateWillParams): Promise<WillStateChangeResponse> {
    this.validateWillOwnership(params.config);

    if (!params.config.isActive) {
      throw new Error('Will is already inactive');
    }

    const deactivatedConfig: WillConfig = {
      ...params.config,
      isActive: false,
    };

    return {
      config: deactivatedConfig,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Reactivate the will
   *
   * @param params - Reactivation parameters
   * @returns Reactivated config
   */
  async reactivateWill(params: ReactivateWillParams): Promise<WillStateChangeResponse> {
    this.validateWillOwnership(params.config);

    if (params.config.isActive) {
      throw new Error('Will is already active');
    }

    const reactivatedConfig: WillConfig = {
      ...params.config,
      isActive: true,
    };

    return {
      config: reactivatedConfig,
      transactionId: this.mockTransactionId(),
    };
  }

  /**
   * Get will status information from on-chain mappings
   *
   * @param willId - Will identifier
   * @returns Will status information
   *
   * @example
   * ```typescript
   * const status = await client.getWillStatus('12345field');
   * console.log('Status:', status.status);
   * console.log('Is overdue:', status.isOverdue);
   * ```
   */
  async getWillStatus(willId: AleoField): Promise<WillStatusInfo> {
    // Placeholder implementation
    // In production: query on-chain mappings via Aleo API
    const currentBlock = await this.getCurrentBlock();
    const lastCheckin = currentBlock - 100;
    const checkinPeriod = daysToBlocks(30);
    const gracePeriod = daysToBlocks(7);
    const deadline = lastCheckin + checkinPeriod + gracePeriod;

    return {
      willId,
      status: WillStatus.ACTIVE,
      lastCheckin,
      checkinPeriod,
      gracePeriod,
      totalLocked: 0n,
      totalClaimed: 0n,
      beneficiaryCommitment: '0field',
      ownerHash: '0field',
      deadline,
      blocksUntilDeadline: blocksUntilDeadline(currentBlock, lastCheckin, checkinPeriod, gracePeriod),
      isOverdue: isDeadlinePassed(currentBlock, lastCheckin, checkinPeriod, gracePeriod),
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Validate check-in period is within allowed range
   */
  private validateCheckInPeriod(period: number): void {
    if (period < MIN_CHECKIN_PERIOD) {
      throw new Error(`Check-in period must be at least ${blocksToDays(MIN_CHECKIN_PERIOD)} days`);
    }
    if (period > MAX_CHECKIN_PERIOD) {
      throw new Error(`Check-in period cannot exceed ${blocksToDays(MAX_CHECKIN_PERIOD)} days`);
    }
  }

  /**
   * Validate share basis points
   */
  private validateShareBps(shareBps: number): void {
    if (shareBps <= 0 || shareBps > 10000) {
      throw new Error('Share basis points must be between 1 and 10000');
    }
  }

  /**
   * Validate caller owns the will
   */
  private validateWillOwnership(config: WillConfig): void {
    // In production: verify caller matches config.owner
    if (!config.owner) {
      throw new Error('Invalid will configuration');
    }
  }

  /**
   * Generate will ID from nonce
   * Placeholder - should use BHP256 hash in production
   */
  private generateWillId(nonce: AleoField): AleoField {
    return `${BigInt(nonce.replace('field', '')) * 31n}field`;
  }

  /**
   * Generate verification hash for beneficiary
   * Placeholder - should use BHP256 commit in production
   */
  private generateVerificationHash(
    beneficiary: AleoAddress,
    owner: AleoAddress,
    nonce: AleoField
  ): AleoField {
    const hash1 = hashAddress(beneficiary);
    const hash2 = hashAddress(owner);
    return `${BigInt(hash1.replace('field', '')) + BigInt(hash2.replace('field', ''))}field`;
  }

  /**
   * Get caller address
   * Placeholder - should derive from private key in production
   */
  private async getCallerAddress(): Promise<AleoAddress> {
    // Placeholder address
    return 'aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc';
  }

  /**
   * Get current block height
   * Placeholder - should query from network in production
   */
  private async getCurrentBlock(): Promise<number> {
    // Placeholder block height
    return 1000000;
  }

  /**
   * Generate mock transaction ID
   */
  private mockTransactionId(): string {
    return `at1${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }
}
