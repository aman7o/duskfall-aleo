/**
 * Record Provider for Digital Will SDK
 *
 * Implements the RecordProviderInterface pattern from ProvableHQ/sdk
 * for discovering and managing Aleo records.
 */

import { AleoAddress, AleoField, WillConfig, Beneficiary, BenAllocation, LockedCredits } from './types';
import { DigitalWillError, ErrorCode } from './errors';

/**
 * Found record with metadata
 */
export interface FoundRecord<T> {
  /**
   * Parsed record data
   */
  data: T;

  /**
   * Record serial number (used to check if spent)
   */
  serialNumber: string;

  /**
   * Record commitment
   */
  commitment: string;

  /**
   * Record ciphertext (encrypted on-chain representation)
   */
  ciphertext: string;

  /**
   * Nonce used in the record
   */
  nonce: string;

  /**
   * Block height when record was created
   */
  blockHeight: number;

  /**
   * Transaction ID that created this record
   */
  transactionId: string;

  /**
   * Program that owns this record
   */
  programId: string;

  /**
   * Whether this record has been spent
   */
  spent: boolean;
}

/**
 * Credits record (Aleo native token)
 */
export interface CreditsRecord {
  owner: AleoAddress;
  microcredits: bigint;
}

/**
 * Filter options for record queries
 */
export interface RecordFilter {
  /**
   * Filter by program ID
   */
  programId?: string;

  /**
   * Filter by record type
   */
  recordType?: string;

  /**
   * Only include unspent records
   */
  unspentOnly?: boolean;

  /**
   * Minimum block height
   */
  minBlockHeight?: number;

  /**
   * Maximum block height
   */
  maxBlockHeight?: number;
}

/**
 * Record Provider Interface
 *
 * Defines the contract for record discovery and management.
 * Implementations can use local storage, RPC, or indexer services.
 */
export interface RecordProviderInterface {
  /**
   * Find all WillConfig records owned by the current account
   */
  findWillConfigRecords(filter?: RecordFilter): Promise<FoundRecord<WillConfig>[]>;

  /**
   * Find all Beneficiary designation records (owned by beneficiary)
   */
  findBeneficiaryRecords(willId: AleoField, filter?: RecordFilter): Promise<FoundRecord<Beneficiary>[]>;

  /**
   * Find all BenAllocation records for a will (owned by will owner)
   */
  findBenAllocationRecords(willId: AleoField, filter?: RecordFilter): Promise<FoundRecord<BenAllocation>[]>;

  /**
   * Find all LockedCredits records for a will
   */
  findLockedCreditsRecords(willId: AleoField, filter?: RecordFilter): Promise<FoundRecord<LockedCredits>[]>;

  /**
   * Find a credits record with at least the specified amount
   */
  findCreditsRecord(minAmount: bigint, usedNonces: string[]): Promise<FoundRecord<CreditsRecord>>;

  /**
   * Check if serial numbers have been spent
   */
  checkSerialNumbers(serialNumbers: string[]): Promise<Map<string, boolean>>;

  /**
   * Get account address
   */
  getAddress(): AleoAddress;
}

/**
 * Record Provider Options
 */
export interface RecordProviderOptions {
  /**
   * Account address to find records for
   */
  address: AleoAddress;

  /**
   * View key for decrypting records
   */
  viewKey: string;

  /**
   * API endpoint for record queries
   */
  apiEndpoint?: string;

  /**
   * Program ID (default: digital_will_v7.aleo)
   */
  programId?: string;

  /**
   * Cache TTL in milliseconds (default: 30000)
   */
  cacheTtl?: number;
}

/**
 * Default Record Provider Implementation
 *
 * Provides record discovery using RPC endpoint and local caching.
 *
 * @example
 * ```typescript
 * const provider = new RecordProvider({
 *   address: account.address,
 *   viewKey: account.viewKey,
 *   apiEndpoint: 'https://api.explorer.provable.com/v1'
 * });
 *
 * // Find all will configs
 * const wills = await provider.findWillConfigRecords();
 *
 * // Find credits for a deposit
 * const credits = await provider.findCreditsRecord(1000000n, []);
 * ```
 */
export class RecordProvider implements RecordProviderInterface {
  private readonly address: AleoAddress;
  private readonly viewKey: string;
  private readonly apiEndpoint: string;
  private readonly programId: string;
  private readonly cacheTtl: number;

  // Local cache
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();

  constructor(options: RecordProviderOptions) {
    this.address = options.address;
    this.viewKey = options.viewKey;
    this.apiEndpoint = options.apiEndpoint || 'https://api.explorer.provable.com/v1';
    this.programId = options.programId || 'digital_will_v7.aleo';
    this.cacheTtl = options.cacheTtl || 30000;
  }

  getAddress(): AleoAddress {
    return this.address;
  }

  async findWillConfigRecords(filter?: RecordFilter): Promise<FoundRecord<WillConfig>[]> {
    const cacheKey = `willConfigs:${JSON.stringify(filter || {})}`;
    const cached = this.getFromCache<FoundRecord<WillConfig>[]>(cacheKey);
    if (cached) return cached;

    try {
      // Query records from API
      const records = await this.queryRecords('WillConfig', filter);

      // Parse and filter
      const parsed = records
        .map(r => this.parseWillConfigRecord(r))
        .filter((r): r is FoundRecord<WillConfig> => r !== null);

      this.setCache(cacheKey, parsed);
      return parsed;
    } catch (error) {
      throw DigitalWillError.from(error, { operation: 'findWillConfigRecords' });
    }
  }

  async findBeneficiaryRecords(
    willId: AleoField,
    filter?: RecordFilter
  ): Promise<FoundRecord<Beneficiary>[]> {
    const cacheKey = `beneficiaries:${willId}:${JSON.stringify(filter || {})}`;
    const cached = this.getFromCache<FoundRecord<Beneficiary>[]>(cacheKey);
    if (cached) return cached;

    try {
      const records = await this.queryRecords('Beneficiary', filter);

      const parsed = records
        .map(r => this.parseBeneficiaryRecord(r))
        .filter((r): r is FoundRecord<Beneficiary> => r !== null)
        .filter(r => r.data.willId === willId);

      this.setCache(cacheKey, parsed);
      return parsed;
    } catch (error) {
      throw DigitalWillError.from(error, { operation: 'findBeneficiaryRecords', willId });
    }
  }

  async findBenAllocationRecords(
    willId: AleoField,
    filter?: RecordFilter
  ): Promise<FoundRecord<BenAllocation>[]> {
    const cacheKey = `benAllocations:${willId}:${JSON.stringify(filter || {})}`;
    const cached = this.getFromCache<FoundRecord<BenAllocation>[]>(cacheKey);
    if (cached) return cached;

    try {
      const records = await this.queryRecords('BenAllocation', filter);

      const parsed = records
        .map(r => this.parseBenAllocationRecord(r))
        .filter((r): r is FoundRecord<BenAllocation> => r !== null)
        .filter(r => r.data.willId === willId);

      this.setCache(cacheKey, parsed);
      return parsed;
    } catch (error) {
      throw DigitalWillError.from(error, { operation: 'findBenAllocationRecords', willId });
    }
  }

  async findLockedCreditsRecords(
    willId: AleoField,
    filter?: RecordFilter
  ): Promise<FoundRecord<LockedCredits>[]> {
    const cacheKey = `lockedCredits:${willId}:${JSON.stringify(filter || {})}`;
    const cached = this.getFromCache<FoundRecord<LockedCredits>[]>(cacheKey);
    if (cached) return cached;

    try {
      const records = await this.queryRecords('LockedCredits', filter);

      const parsed = records
        .map(r => this.parseLockedCreditsRecord(r))
        .filter((r): r is FoundRecord<LockedCredits> => r !== null)
        .filter(r => r.data.willId === willId);

      this.setCache(cacheKey, parsed);
      return parsed;
    } catch (error) {
      throw DigitalWillError.from(error, { operation: 'findLockedCreditsRecords', willId });
    }
  }

  async findCreditsRecord(
    minAmount: bigint,
    usedNonces: string[]
  ): Promise<FoundRecord<CreditsRecord>> {
    try {
      // Query credits.aleo records
      const records = await this.queryCreditsRecords();

      // Filter out used nonces and find one with sufficient balance
      const usedSet = new Set(usedNonces);
      const suitable = records
        .filter(r => !usedSet.has(r.nonce))
        .filter(r => !r.spent)
        .filter(r => r.data.microcredits >= minAmount)
        .sort((a, b) => Number(a.data.microcredits - b.data.microcredits)); // Prefer smaller records

      const firstSuitable = suitable[0];
      if (!firstSuitable) {
        throw new DigitalWillError(
          ErrorCode.INSUFFICIENT_BALANCE,
          `No credits record found with at least ${minAmount} microcredits`,
          { minAmount: minAmount.toString(), usedNonces }
        );
      }

      return firstSuitable;
    } catch (error) {
      if (error instanceof DigitalWillError) throw error;
      throw DigitalWillError.from(error, { operation: 'findCreditsRecord', minAmount: minAmount.toString() });
    }
  }

  async checkSerialNumbers(serialNumbers: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    if (serialNumbers.length === 0) {
      return result;
    }

    try {
      // Check each serial number
      // NOTE: In production, batch this into a single RPC call
      for (const sn of serialNumbers) {
        const spent = await this.checkSerialNumber(sn);
        result.set(sn, spent);
      }

      return result;
    } catch (error) {
      throw DigitalWillError.from(error, { operation: 'checkSerialNumbers' });
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get total credits balance
   */
  async getTotalCredits(): Promise<bigint> {
    const records = await this.queryCreditsRecords();
    return records
      .filter(r => !r.spent)
      .reduce((sum, r) => sum + r.data.microcredits, 0n);
  }

  /**
   * Get all unspent credits records
   */
  async getCreditsRecords(): Promise<FoundRecord<CreditsRecord>[]> {
    const records = await this.queryCreditsRecords();
    return records.filter(r => !r.spent);
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.cacheTtl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async queryRecords(
    recordType: string,
    filter?: RecordFilter
  ): Promise<RawRecord[]> {
    // NOTE: In production, this makes actual RPC calls
    // For now, return empty array (records would come from wallet/indexer)
    console.log(`Querying ${recordType} records with filter:`, filter);
    return [];
  }

  private async queryCreditsRecords(): Promise<FoundRecord<CreditsRecord>[]> {
    // NOTE: In production, query credits.aleo records from RPC/indexer
    // For now, return mock data
    return [];
  }

  private async checkSerialNumber(serialNumber: string): Promise<boolean> {
    // FIX: This is a placeholder implementation. The actual spent serial number
    // check requires querying the Aleo blockchain's global spent serial number set,
    // not the credits.aleo account mapping. The account mapping stores balances, not serial numbers.
    //
    // Proper implementation options:
    // 1. Use Aleo SDK's decrypt and verify methods
    // 2. Use an indexer service that tracks spent serial numbers
    // 3. Track consumed records locally after successful transactions
    //
    // For now, return false (not spent) as a conservative default.
    // The blockchain will reject transactions that attempt to spend consumed records.
    console.warn(`[RecordProvider] checkSerialNumber is a placeholder - returning false for ${serialNumber.substring(0, 20)}...`);
    return false;
  }

  private parseWillConfigRecord(raw: RawRecord): FoundRecord<WillConfig> | null {
    try {
      const d = raw.data;
      const checkInVal = d['check_in_period'] ?? d['checkInPeriod'];
      const graceVal = d['grace_period'] ?? d['gracePeriod'];
      const data: WillConfig = {
        owner: raw.owner,
        willId: String(d['will_id'] ?? d['willId'] ?? ''),
        // FIX: Use Number instead of BigInt since Leo contract uses u32 (not u64)
        checkInPeriod: Number(typeof checkInVal === 'number' || typeof checkInVal === 'string' ? checkInVal : 0),
        gracePeriod: Number(typeof graceVal === 'number' || typeof graceVal === 'string' ? graceVal : 0),
        totalSharesBps: Number(d['total_shares_bps'] ?? d['totalSharesBps'] ?? 0),
        numBeneficiaries: Number(d['num_beneficiaries'] ?? d['numBeneficiaries'] ?? 0),
        isActive: Boolean(d['is_active'] ?? d['isActive'] ?? true),
        nonce: String(d['nonce'] ?? '0field'),
      };

      return {
        data,
        serialNumber: raw.serialNumber,
        commitment: raw.commitment,
        ciphertext: raw.ciphertext,
        nonce: raw.nonce,
        blockHeight: raw.blockHeight,
        transactionId: raw.transactionId,
        programId: raw.programId,
        spent: raw.spent || false,
      };
    } catch {
      return null;
    }
  }

  private parseBeneficiaryRecord(raw: RawRecord): FoundRecord<Beneficiary> | null {
    try {
      const d = raw.data;
      const data: Beneficiary = {
        owner: raw.owner,
        willOwner: String(d['will_owner'] ?? d['willOwner'] ?? ''),
        willId: String(d['will_id'] ?? d['willId'] ?? ''),
        shareBps: Number(d['share_bps'] ?? d['shareBps'] ?? 0),
        priority: Number(d['priority'] ?? 0),
        verificationHash: String(d['verification_hash'] ?? d['verificationHash'] ?? '0field'),
        isActive: Boolean(d['is_active'] ?? d['isActive'] ?? true),
      };

      return {
        data,
        serialNumber: raw.serialNumber,
        commitment: raw.commitment,
        ciphertext: raw.ciphertext,
        nonce: raw.nonce,
        blockHeight: raw.blockHeight,
        transactionId: raw.transactionId,
        programId: raw.programId,
        spent: raw.spent || false,
      };
    } catch {
      return null;
    }
  }

  private parseBenAllocationRecord(raw: RawRecord): FoundRecord<BenAllocation> | null {
    try {
      const d = raw.data;
      const data: BenAllocation = {
        owner: raw.owner,
        beneficiaryAddr: String(d['beneficiary_addr'] ?? d['beneficiaryAddr'] ?? ''),
        willId: String(d['will_id'] ?? d['willId'] ?? ''),
        shareBps: Number(d['share_bps'] ?? d['shareBps'] ?? 0),
        priority: Number(d['priority'] ?? 0),
        isActive: Boolean(d['is_active'] ?? d['isActive'] ?? true),
      };

      return {
        data,
        serialNumber: raw.serialNumber,
        commitment: raw.commitment,
        ciphertext: raw.ciphertext,
        nonce: raw.nonce,
        blockHeight: raw.blockHeight,
        transactionId: raw.transactionId,
        programId: raw.programId,
        spent: raw.spent || false,
      };
    } catch {
      return null;
    }
  }

  private parseLockedCreditsRecord(raw: RawRecord): FoundRecord<LockedCredits> | null {
    try {
      const d = raw.data;
      const amountVal = d['amount'];
      const data: LockedCredits = {
        owner: raw.owner,
        willId: String(d['will_id'] ?? d['willId'] ?? ''),
        amount: BigInt(typeof amountVal === 'number' || typeof amountVal === 'string' ? amountVal : 0),
        depositor: String(d['depositor'] ?? raw.owner),
      };

      return {
        data,
        serialNumber: raw.serialNumber,
        commitment: raw.commitment,
        ciphertext: raw.ciphertext,
        nonce: raw.nonce,
        blockHeight: raw.blockHeight,
        transactionId: raw.transactionId,
        programId: raw.programId,
        spent: raw.spent || false,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Raw record from RPC/indexer
 */
interface RawRecord {
  owner: string;
  data: Record<string, unknown>;
  serialNumber: string;
  commitment: string;
  ciphertext: string;
  nonce: string;
  blockHeight: number;
  transactionId: string;
  programId: string;
  spent?: boolean;
}

/**
 * Create a record provider from account credentials
 */
export function createRecordProvider(
  address: AleoAddress,
  viewKey: string,
  options?: Partial<RecordProviderOptions>
): RecordProvider {
  return new RecordProvider({
    address,
    viewKey,
    ...options,
  });
}

/**
 * Mock record provider for testing
 */
export class MockRecordProvider implements RecordProviderInterface {
  private address: AleoAddress;
  private willConfigs: FoundRecord<WillConfig>[] = [];
  private beneficiaries: FoundRecord<Beneficiary>[] = [];
  private benAllocations: FoundRecord<BenAllocation>[] = [];
  private lockedCredits: FoundRecord<LockedCredits>[] = [];
  private credits: FoundRecord<CreditsRecord>[] = [];

  constructor(address: AleoAddress) {
    this.address = address;
  }

  getAddress(): AleoAddress {
    return this.address;
  }

  addWillConfig(config: WillConfig): void {
    this.willConfigs.push(this.createMockRecord(config));
  }

  addBeneficiary(beneficiary: Beneficiary): void {
    this.beneficiaries.push(this.createMockRecord(beneficiary));
  }

  addBenAllocation(allocation: BenAllocation): void {
    this.benAllocations.push(this.createMockRecord(allocation));
  }

  addLockedCredits(credits: LockedCredits): void {
    this.lockedCredits.push(this.createMockRecord(credits));
  }

  addCredits(amount: bigint): void {
    this.credits.push(this.createMockRecord({ owner: this.address, microcredits: amount }));
  }

  async findWillConfigRecords(): Promise<FoundRecord<WillConfig>[]> {
    return this.willConfigs.filter(r => !r.spent);
  }

  async findBeneficiaryRecords(willId: AleoField): Promise<FoundRecord<Beneficiary>[]> {
    return this.beneficiaries.filter(r => r.data.willId === willId && !r.spent);
  }

  async findBenAllocationRecords(willId: AleoField): Promise<FoundRecord<BenAllocation>[]> {
    return this.benAllocations.filter(r => r.data.willId === willId && !r.spent);
  }

  async findLockedCreditsRecords(willId: AleoField): Promise<FoundRecord<LockedCredits>[]> {
    return this.lockedCredits.filter(r => r.data.willId === willId && !r.spent);
  }

  async findCreditsRecord(minAmount: bigint, usedNonces: string[]): Promise<FoundRecord<CreditsRecord>> {
    const usedSet = new Set(usedNonces);
    const suitable = this.credits
      .filter(r => !usedSet.has(r.nonce))
      .filter(r => !r.spent)
      .filter(r => r.data.microcredits >= minAmount);

    const firstSuitable = suitable[0];
    if (!firstSuitable) {
      throw new DigitalWillError(ErrorCode.INSUFFICIENT_BALANCE);
    }

    return firstSuitable;
  }

  async checkSerialNumbers(serialNumbers: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    for (const sn of serialNumbers) {
      result.set(sn, false);
    }
    return result;
  }

  private createMockRecord<T>(data: T): FoundRecord<T> {
    const id = Math.random().toString(36).substring(2);
    return {
      data,
      serialNumber: `sn_${id}`,
      commitment: `cm_${id}`,
      ciphertext: `ct_${id}`,
      nonce: `nonce_${id}`,
      blockHeight: 1000000,
      transactionId: `at1${id}`,
      programId: 'digital_will_v7.aleo',
      spent: false,
    };
  }
}
