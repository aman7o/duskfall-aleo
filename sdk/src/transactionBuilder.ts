/**
 * Transaction Builder for Digital Will SDK
 *
 * Builds transaction payloads for all Digital Will transitions.
 * Handles input formatting, fee estimation, and record selection.
 */

import {
  AleoAddress,
  AleoField,
  WillConfig,
  Beneficiary,
  LockedCredits,
  BeneficiaryInfo,
} from './types';
import { Account } from './account';
import { RecordProviderInterface, FoundRecord, CreditsRecord } from './recordProvider';
import { MerkleTree, MerkleProof, formatProofForContract } from './merkle';
import { DigitalWillError, ErrorCode } from './errors';
import { PROGRAM_NAME, MICROCREDITS_PER_ALEO } from './constants';
import { daysToBlocks, generateNonce } from './utils';

/**
 * Transaction payload ready for broadcast
 */
export interface TransactionPayload {
  /**
   * Program ID to call
   */
  programId: string;

  /**
   * Transition/function name
   */
  transition: string;

  /**
   * Formatted inputs for the transition
   */
  inputs: string[];

  /**
   * Estimated fee in microcredits
   */
  fee: bigint;

  /**
   * Fee record to use (if private fee)
   */
  feeRecord?: FoundRecord<CreditsRecord>;

  /**
   * Additional metadata
   */
  metadata?: {
    description?: string;
    estimatedConfirmation?: number;
  };
}

/**
 * Transaction Builder Configuration
 */
export interface TransactionBuilderConfig {
  /**
   * Account for signing and record ownership
   */
  account: Account;

  /**
   * Record provider for finding records
   */
  recordProvider: RecordProviderInterface;

  /**
   * Program ID (default: digital_will_v7.aleo)
   */
  programId?: string;

  /**
   * Fee mode: 'private' uses record, 'public' uses credits mapping
   */
  feeMode?: 'private' | 'public';

  /**
   * Base fee in microcredits (default: 50000)
   */
  baseFee?: bigint;
}

/**
 * Create Will Parameters
 */
export interface BuildCreateWillParams {
  checkInPeriodDays: number;
  gracePeriodDays: number;
  nonce?: AleoField;
}

/**
 * Add Beneficiary Parameters
 */
export interface BuildAddBeneficiaryParams {
  config: WillConfig | FoundRecord<WillConfig>;
  beneficiaryAddress: AleoAddress;
  shareBps: number;
  priority: number;
}

/**
 * Add Beneficiary with Decoys Parameters
 */
export interface BuildAddBeneficiaryWithDecoysParams extends BuildAddBeneficiaryParams {
  decoyHashes?: [AleoField, AleoField, AleoField];
}

/**
 * Deposit Parameters
 */
export interface BuildDepositParams {
  config: WillConfig | FoundRecord<WillConfig>;
  amountAleo: number;
}

/**
 * Claim with Merkle Proof Parameters
 */
export interface BuildClaimWithMerkleProofParams {
  willId: AleoField;
  merkleProof: MerkleProof;
  shareBps: number;
  amountToClaim: bigint;
}

/**
 * Initiate Trigger Parameters
 */
export interface BuildInitiateTriggerParams {
  willId: AleoField;
}

/**
 * Execute Trigger Parameters
 */
export interface BuildExecuteTriggerParams {
  willId: AleoField;
  timeLockRecord: unknown; // TimeLock record
  expectedAmount: bigint;
}

/**
 * Transaction Builder
 *
 * Builds transaction payloads for Digital Will contract interactions.
 * Handles record selection, input formatting, and fee estimation.
 *
 * @example
 * ```typescript
 * const builder = new TransactionBuilder({
 *   account,
 *   recordProvider
 * });
 *
 * // Build create will transaction
 * const tx = await builder.buildCreateWill({
 *   checkInPeriodDays: 30,
 *   gracePeriodDays: 7
 * });
 *
 * // Broadcast using wallet adapter
 * const txId = await wallet.requestTransaction(tx);
 * ```
 */
export class TransactionBuilder {
  private readonly account: Account;
  private readonly recordProvider: RecordProviderInterface;
  private readonly programId: string;
  private readonly feeMode: 'private' | 'public';
  private readonly baseFee: bigint;

  // Track used nonces to avoid double-spending
  private usedNonces: string[] = [];

  constructor(config: TransactionBuilderConfig) {
    this.account = config.account;
    this.recordProvider = config.recordProvider;
    this.programId = config.programId || PROGRAM_NAME;
    this.feeMode = config.feeMode || 'private';
    this.baseFee = config.baseFee || 50000n;
  }

  /**
   * Build create_will transaction
   */
  async buildCreateWill(params: BuildCreateWillParams): Promise<TransactionPayload> {
    const nonce = params.nonce || generateNonce();
    const checkInPeriod = daysToBlocks(params.checkInPeriodDays);
    const gracePeriod = daysToBlocks(params.gracePeriodDays);

    const inputs = [
      nonce,
      `${checkInPeriod}u32`,
      `${gracePeriod}u32`,
    ];

    const fee = this.estimateFee('create_will');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'create_will',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: `Create will with ${params.checkInPeriodDays} day check-in period`,
      },
    };
  }

  /**
   * Build check_in transaction
   */
  async buildCheckIn(config: WillConfig | FoundRecord<WillConfig>): Promise<TransactionPayload> {
    const configData = 'data' in config ? config.data : config;

    const inputs = [
      this.formatWillConfigInput(configData),
    ];

    const fee = this.estimateFee('check_in');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'check_in',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Check in to reset will deadline',
      },
    };
  }

  /**
   * Build check_in_backup transaction (public will ID)
   */
  async buildCheckInBackup(willId: AleoField): Promise<TransactionPayload> {
    const inputs = [willId];

    const fee = this.estimateFee('check_in_backup');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'check_in_backup',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Backup check-in using public will ID',
      },
    };
  }

  /**
   * Build add_beneficiary transaction
   */
  async buildAddBeneficiary(params: BuildAddBeneficiaryParams): Promise<TransactionPayload> {
    const configData = 'data' in params.config ? params.config.data : params.config;

    const inputs = [
      this.formatWillConfigInput(configData),
      params.beneficiaryAddress,
      `${params.shareBps}u16`,
      `${params.priority}u8`,
    ];

    const fee = this.estimateFee('add_beneficiary');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'add_beneficiary',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: `Add beneficiary with ${params.shareBps / 100}% share`,
      },
    };
  }

  /**
   * Build add_beneficiary_with_decoys transaction (enhanced privacy)
   */
  async buildAddBeneficiaryWithDecoys(
    params: BuildAddBeneficiaryWithDecoysParams
  ): Promise<TransactionPayload> {
    const configData = 'data' in params.config ? params.config.data : params.config;

    // Generate random decoy hashes if not provided
    const decoyHashes = params.decoyHashes || [
      this.generateRandomField(),
      this.generateRandomField(),
      this.generateRandomField(),
    ];

    const inputs = [
      this.formatWillConfigInput(configData),
      params.beneficiaryAddress,
      `${params.shareBps}u16`,
      `${params.priority}u8`,
      decoyHashes[0],  // decoy_hash_0: field
      decoyHashes[1],  // decoy_hash_1: field
      decoyHashes[2],  // decoy_hash_2: field
    ];

    const fee = this.estimateFee('add_beneficiary_with_decoys');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'add_beneficiary_with_decoys',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Add beneficiary with decoy hashes for enhanced privacy',
      },
    };
  }

  /**
   * Build deposit_credits transaction
   */
  async buildDeposit(params: BuildDepositParams): Promise<TransactionPayload> {
    const configData = 'data' in params.config ? params.config.data : params.config;

    // FIX: Validate amount before conversion
    if (params.amountAleo <= 0) {
      throw new DigitalWillError(
        ErrorCode.INVALID_PARAMETER,
        'Deposit amount must be greater than zero'
      );
    }

    const amountMicrocredits = BigInt(Math.floor(params.amountAleo * MICROCREDITS_PER_ALEO));

    // Validate converted amount doesn't exceed u64 max using BigInt comparison
    const MAX_U64 = 18446744073709551615n;
    if (amountMicrocredits > MAX_U64) {
      throw new DigitalWillError(
        ErrorCode.INVALID_PARAMETER,
        `Deposit amount ${params.amountAleo} ALEO exceeds maximum allowed (u64 overflow)`
      );
    }
    if (amountMicrocredits < 10000n) {
      throw new DigitalWillError(
        ErrorCode.INVALID_PARAMETER,
        'Minimum deposit is 0.01 ALEO (10,000 microcredits)'
      );
    }

    // Find a credits record for the deposit
    const creditsRecord = await this.recordProvider.findCreditsRecord(
      amountMicrocredits,
      this.usedNonces
    );
    this.usedNonces.push(creditsRecord.nonce);

    const inputs = [
      this.formatWillConfigInput(configData),
      this.formatCreditsRecordInput(creditsRecord),
      `${amountMicrocredits}u64`,
    ];

    // FIX: Use correct transition name 'deposit' (not 'deposit_credits')
    const fee = this.estimateFee('deposit');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'deposit',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: `Deposit ${params.amountAleo} ALEO`,
      },
    };
  }

  /**
   * Build trigger_will transaction
   *
   * @param willId - The will identifier
   * @param expectedLocked - Expected locked amount (verified on-chain to prevent manipulation)
   */
  async buildTriggerWill(willId: AleoField, expectedLocked: bigint): Promise<TransactionPayload> {
    const inputs = [
      willId,
      `${expectedLocked}u64`,
      this.account.address, // trigger_address must match self.caller
    ];

    const fee = this.estimateFee('trigger_will');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'trigger_will',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Trigger will after deadline passed',
      },
    };
  }

  /**
   * Build initiate_trigger transaction (two-phase trigger)
   */
  async buildInitiateTrigger(params: BuildInitiateTriggerParams): Promise<TransactionPayload> {
    const inputs = [
      params.willId,
      this.account.address, // trigger_address must match self.caller
    ];

    const fee = this.estimateFee('initiate_trigger');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'initiate_trigger',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Initiate two-phase trigger process',
      },
    };
  }

  /**
   * Build claim_inheritance transaction
   *
   * @param beneficiaryRecord - The beneficiary's record proving their allocation
   * @param amountToClaim - Amount to claim in microcredits (must be <= share entitlement)
   */
  async buildClaimInheritance(
    beneficiaryRecord: Beneficiary | FoundRecord<Beneficiary>,
    amountToClaim: bigint
  ): Promise<TransactionPayload> {
    const beneficiary = 'data' in beneficiaryRecord ? beneficiaryRecord.data : beneficiaryRecord;

    const inputs = [
      this.formatBeneficiaryInput(beneficiary),
      `${amountToClaim}u64`,
    ];

    const fee = this.estimateFee('claim_inheritance');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'claim_inheritance',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Claim inheritance as beneficiary',
      },
    };
  }

  /**
   * Build claim_inheritance_v2 transaction (no record required - uses mapping verification)
   *
   * @param willId - The will identifier
   * @param shareBps - Beneficiary's share in basis points
   * @param amountToClaim - Amount to claim in microcredits
   */
  async buildClaimInheritanceV2(
    willId: AleoField,
    shareBps: number,
    amountToClaim: bigint
  ): Promise<TransactionPayload> {
    const inputs = [
      willId,
      this.account.address,
      `${amountToClaim}u64`,
      `${shareBps}u16`,
    ];

    const fee = this.estimateFee('claim_inheritance_v2');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'claim_inheritance_v2',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Claim inheritance using mapping verification (no record required)',
      },
    };
  }

  /**
   * Build claim_with_merkle_proof transaction
   */
  async buildClaimWithMerkleProof(
    params: BuildClaimWithMerkleProofParams
  ): Promise<TransactionPayload> {
    const proofInputs = formatProofForContract(params.merkleProof);

    const inputs = [
      params.willId,
      this.account.address,
      `${params.shareBps}u16`,
      proofInputs.merkle_path_0,
      proofInputs.merkle_path_1,
      proofInputs.merkle_path_2,
      proofInputs.merkle_path_3,
      proofInputs.path_indices,
      `${params.amountToClaim}u64`,
    ];

    const fee = this.estimateFee('claim_with_merkle_proof');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'claim_with_merkle_proof',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Claim inheritance using Merkle proof',
      },
    };
  }

  /**
   * Build set_beneficiary_merkle_root transaction
   */
  async buildSetBeneficiaryMerkleRoot(
    config: WillConfig | FoundRecord<WillConfig>,
    beneficiaries: BeneficiaryInfo[]
  ): Promise<TransactionPayload> {
    const configData = 'data' in config ? config.data : config;

    // Build Merkle tree from beneficiaries
    const tree = MerkleTree.fromBeneficiaries(
      beneficiaries.map(b => ({ address: b.beneficiary, shareBps: b.shareBps })),
      configData.willId
    );

    const inputs = [
      this.formatWillConfigInput(configData),
      tree.root,
    ];

    const fee = this.estimateFee('set_beneficiary_merkle_root');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'set_beneficiary_merkle_root',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Set Merkle root for beneficiary list',
      },
    };
  }

  /**
   * Build emergency_recovery transaction
   */
  async buildEmergencyRecovery(
    config: WillConfig | FoundRecord<WillConfig>,
    lockedCredits: LockedCredits | FoundRecord<LockedCredits>
  ): Promise<TransactionPayload> {
    const configData = 'data' in config ? config.data : config;
    const creditsData = 'data' in lockedCredits ? lockedCredits.data : lockedCredits;

    const inputs = [
      this.formatWillConfigInput(configData),
      this.formatLockedCreditsInput(creditsData),
    ];

    const fee = this.estimateFee('emergency_recovery');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'emergency_recovery',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Emergency recovery of will assets',
      },
    };
  }

  /**
   * Build deactivate_will transaction
   */
  async buildDeactivateWill(
    config: WillConfig | FoundRecord<WillConfig>
  ): Promise<TransactionPayload> {
    const configData = 'data' in config ? config.data : config;

    const inputs = [this.formatWillConfigInput(configData)];

    const fee = this.estimateFee('deactivate_will');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'deactivate_will',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Deactivate will',
      },
    };
  }

  /**
   * Build reactivate_will transaction
   */
  async buildReactivateWill(
    config: WillConfig | FoundRecord<WillConfig>
  ): Promise<TransactionPayload> {
    const configData = 'data' in config ? config.data : config;

    const inputs = [this.formatWillConfigInput(configData)];

    const fee = this.estimateFee('reactivate_will');
    const feeRecord = this.feeMode === 'private'
      ? await this.selectFeeRecord(fee)
      : undefined;

    return {
      programId: this.programId,
      transition: 'reactivate_will',
      inputs,
      fee,
      feeRecord,
      metadata: {
        description: 'Reactivate will',
      },
    };
  }

  /**
   * Clear used nonces (for new transaction batch)
   */
  clearUsedNonces(): void {
    this.usedNonces = [];
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private estimateFee(transition: string): bigint {
    // Fee estimates based on transition complexity
    const feeMultipliers: Record<string, number> = {
      create_will: 2,
      check_in: 1,
      check_in_backup: 1,
      add_beneficiary: 2,
      add_beneficiary_with_decoys: 3,
      deposit: 2,
      deposit_public: 2,
      trigger_will: 2,
      initiate_trigger: 2,
      execute_trigger: 3,
      claim_inheritance: 3,
      claim_inheritance_v2: 3,
      claim_with_merkle_proof: 4,
      set_beneficiary_merkle_root: 2,
      emergency_recovery: 3,
      deactivate_will: 1,
      reactivate_will: 1,
      withdraw: 2,
      revoke_beneficiary: 2,
    };

    const multiplier = feeMultipliers[transition] || 1;
    return this.baseFee * BigInt(multiplier);
  }

  private async selectFeeRecord(fee: bigint): Promise<FoundRecord<CreditsRecord>> {
    try {
      const record = await this.recordProvider.findCreditsRecord(fee, this.usedNonces);
      this.usedNonces.push(record.nonce);
      return record;
    } catch (error) {
      throw new DigitalWillError(
        ErrorCode.INSUFFICIENT_FEE,
        `Cannot find credits record for fee: ${fee} microcredits`,
        { fee: fee.toString() }
      );
    }
  }

  private formatWillConfigInput(config: WillConfig): string {
    // Validate u32 bounds for check_in_period and grace_period
    if (config.checkInPeriod < 0 || config.checkInPeriod > 4294967295) {
      throw new DigitalWillError(
        ErrorCode.INVALID_PARAMETER,
        `check_in_period must be a valid u32 (0-4294967295), got ${config.checkInPeriod}`
      );
    }
    if (config.gracePeriod < 0 || config.gracePeriod > 4294967295) {
      throw new DigitalWillError(
        ErrorCode.INVALID_PARAMETER,
        `grace_period must be a valid u32 (0-4294967295), got ${config.gracePeriod}`
      );
    }
    // Validate u16 bounds for totalSharesBps
    if (config.totalSharesBps < 0 || config.totalSharesBps > 65535) {
      throw new DigitalWillError(
        ErrorCode.INVALID_PARAMETER,
        `total_shares_bps must be a valid u16 (0-65535), got ${config.totalSharesBps}`
      );
    }
    // Validate u8 bounds for numBeneficiaries
    if (config.numBeneficiaries < 0 || config.numBeneficiaries > 255) {
      throw new DigitalWillError(
        ErrorCode.INVALID_PARAMETER,
        `num_beneficiaries must be a valid u8 (0-255), got ${config.numBeneficiaries}`
      );
    }
    return `{
      owner: ${config.owner},
      will_id: ${config.willId},
      check_in_period: ${config.checkInPeriod}u32,
      grace_period: ${config.gracePeriod}u32,
      total_shares_bps: ${config.totalSharesBps}u16,
      num_beneficiaries: ${config.numBeneficiaries}u8,
      is_active: ${config.isActive},
      nonce: ${config.nonce}
    }`;
  }

  private formatBeneficiaryInput(beneficiary: Beneficiary): string {
    return `{
      owner: ${beneficiary.owner},
      will_owner: ${beneficiary.willOwner},
      will_id: ${beneficiary.willId},
      share_bps: ${beneficiary.shareBps}u16,
      priority: ${beneficiary.priority}u8,
      verification_hash: ${beneficiary.verificationHash},
      is_active: ${beneficiary.isActive}
    }`;
  }

  private formatLockedCreditsInput(credits: LockedCredits): string {
    return `{
      owner: ${credits.owner},
      will_id: ${credits.willId},
      amount: ${credits.amount}u64,
      depositor: ${credits.depositor}
    }`;
  }

  private formatCreditsRecordInput(record: FoundRecord<CreditsRecord>): string {
    return `{
      owner: ${record.data.owner},
      microcredits: ${record.data.microcredits}u64
    }`;
  }

  private generateRandomField(): AleoField {
    const randomBytes = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < 32; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }

    let value = 0n;
    for (let i = 0; i < randomBytes.length; i++) {
      const byte = randomBytes[i] ?? 0;
      value = (value << 8n) | BigInt(byte);
    }
    return `${value % (2n ** 253n)}field`;
  }
}

/**
 * Create a transaction builder with default configuration
 */
export function createTransactionBuilder(
  account: Account,
  recordProvider: RecordProviderInterface,
  options?: Partial<TransactionBuilderConfig>
): TransactionBuilder {
  return new TransactionBuilder({
    account,
    recordProvider,
    ...options,
  });
}
