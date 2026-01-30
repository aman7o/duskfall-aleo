/**
 * Record Parsing Utilities
 * Based on art-factory patterns for reliable Aleo record handling
 */

/**
 * Aleo type identifiers
 */
export type AleoType =
  | 'field'
  | 'scalar'
  | 'group'
  | 'address'
  | 'boolean'
  | 'u8'
  | 'u16'
  | 'u32'
  | 'u64'
  | 'u128'
  | 'i8'
  | 'i16'
  | 'i32'
  | 'i64'
  | 'i128';

/**
 * Parse a string to bigint, handling various Aleo formats
 */
export function stringToBigInt(str: string): bigint {
  // Remove type suffixes like u64, u32, field, etc.
  const cleaned = str.replace(/(u8|u16|u32|u64|u128|i8|i16|i32|i64|i128|field|scalar|group)$/i, '');
  return BigInt(cleaned);
}

/**
 * Split a string into chunks and convert each to bigint
 * Useful for encoding strings into multiple field elements
 */
export function splitStringToBigInts(str: string, chunkSize: number = 31): bigint[] {
  const result: bigint[] = [];
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    let value = 0n;
    for (let j = 0; j < chunk.length; j++) {
      value = (value << 8n) | BigInt(chunk[j]);
    }
    result.push(value);
  }

  return result;
}

/**
 * Convert bigints back to string
 */
export function bigIntsToString(values: bigint[]): string {
  const bytes: number[] = [];

  for (const value of values) {
    if (value === 0n) continue;

    const valueBytes: number[] = [];
    let remaining = value;

    while (remaining > 0n) {
      valueBytes.unshift(Number(remaining & 0xFFn));
      remaining = remaining >> 8n;
    }

    bytes.push(...valueBytes);
  }

  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(bytes));
}

/**
 * Pad an array to a specific length
 */
export function padArray<T>(arr: T[], length: number, fill: T): T[] {
  const result = [...arr];
  while (result.length < length) {
    result.push(fill);
  }
  return result.slice(0, length);
}

/**
 * Parse an Aleo record string into a typed object
 */
export function parseAleoRecord<T extends Record<string, unknown>>(recordString: string): T | null {
  try {
    // Handle JSON format from wallet
    if (recordString.startsWith('{')) {
      const parsed = JSON.parse(recordString);
      if (parsed.data) {
        return parseRecordData(parsed.data) as T;
      }
      return parsed as T;
    }

    // Handle Aleo record format
    const result: Record<string, unknown> = {};

    // Match field patterns: fieldName: value
    const fieldPattern = /(\w+):\s*([^,}\n]+)/g;
    let match;

    while ((match = fieldPattern.exec(recordString)) !== null) {
      const [, key, rawValue] = match;
      result[key] = parseValue(rawValue.trim());
    }

    return result as T;
  } catch (error) {
    console.error('Failed to parse Aleo record:', error);
    return null;
  }
}

/**
 * Parse a single value from record string
 */
function parseValue(value: string): unknown {
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Address
  if (value.startsWith('aleo1')) return value;

  // Field types
  if (value.endsWith('field')) {
    return value; // Keep as string with suffix
  }

  // Integer types
  const intMatch = value.match(/^(-?\d+)(u8|u16|u32|u64|u128|i8|i16|i32|i64|i128)$/);
  if (intMatch) {
    const num = BigInt(intMatch[1]);
    // Return as number for small types, bigint for large
    if (['u8', 'u16', 'u32', 'i8', 'i16', 'i32'].includes(intMatch[2])) {
      return Number(num);
    }
    return num;
  }

  // Scalar/Group
  if (value.endsWith('scalar') || value.endsWith('group')) {
    return value;
  }

  // Default: return as-is
  return value;
}

/**
 * Parse record data object (from wallet response)
 */
function parseRecordData(data: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = parseValue(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Format a value for transaction input
 */
export function formatInputForTransaction(value: unknown, type: AleoType): string {
  switch (type) {
    case 'field':
      if (typeof value === 'bigint') return `${value}field`;
      if (typeof value === 'number') return `${value}field`;
      if (typeof value === 'string') {
        if (value.endsWith('field')) return value;
        return `${value}field`;
      }
      throw new Error(`Invalid field value: ${value}`);

    case 'address':
      if (typeof value === 'string' && value.startsWith('aleo1')) {
        return value;
      }
      throw new Error(`Invalid address: ${value}`);

    case 'boolean':
      return value ? 'true' : 'false';

    case 'u8':
    case 'u16':
    case 'u32':
    case 'u64':
    case 'u128':
    case 'i8':
    case 'i16':
    case 'i32':
    case 'i64':
    case 'i128':
      if (typeof value === 'bigint') return `${value}${type}`;
      if (typeof value === 'number') return `${value}${type}`;
      if (typeof value === 'string') {
        // Remove any existing suffix
        const cleaned = value.replace(/[a-z]+$/i, '');
        return `${cleaned}${type}`;
      }
      throw new Error(`Invalid ${type} value: ${value}`);

    default:
      return String(value);
  }
}

/**
 * Extract will settings from a packed number
 * Used for compact settings storage in contract
 */
export function getSettingsFromNumber(num: number): {
  frozen: boolean;
  active: boolean;
  whiteList: boolean;
  initialized: boolean;
} {
  return {
    frozen: (num & 0b0001) !== 0,
    active: (num & 0b0010) !== 0,
    whiteList: (num & 0b0100) !== 0,
    initialized: (num & 0b1000) !== 0,
  };
}

/**
 * Pack settings into a number
 */
export function settingsToNumber(settings: {
  frozen?: boolean;
  active?: boolean;
  whiteList?: boolean;
  initialized?: boolean;
}): number {
  let num = 0;
  if (settings.frozen) num |= 0b0001;
  if (settings.active) num |= 0b0010;
  if (settings.whiteList) num |= 0b0100;
  if (settings.initialized) num |= 0b1000;
  return num;
}

/**
 * Parse WillConfig from record string
 */
export interface ParsedWillConfig {
  owner: string;
  willId: string;
  checkInPeriod: bigint;
  gracePeriod: bigint;
  totalSharesBps: number;
  numBeneficiaries: number;
  isActive: boolean;
  nonce: string;
}

export function parseWillConfig(recordString: string): ParsedWillConfig | null {
  try {
    // Try JSON format first (from wallet)
    if (recordString.startsWith('{')) {
      const parsed = JSON.parse(recordString);
      const data = parsed.data || parsed;

      return {
        owner: data.owner || '',
        willId: extractField(data.will_id),
        checkInPeriod: extractBigInt(data.check_in_period, 'u32'),
        gracePeriod: extractBigInt(data.grace_period, 'u32'),
        totalSharesBps: extractNumber(data.total_shares_bps, 'u16'),
        numBeneficiaries: extractNumber(data.num_beneficiaries, 'u8'),
        isActive: data.is_active === true || data.is_active === 'true',
        nonce: extractField(data.nonce),
      };
    }

    // Parse Aleo record format
    const record = parseAleoRecord<Record<string, unknown>>(recordString);
    if (!record) return null;

    return {
      owner: (record.owner as string) || '',
      willId: extractField(record.will_id),
      checkInPeriod: extractBigInt(record.check_in_period, 'u32'),
      gracePeriod: extractBigInt(record.grace_period, 'u32'),
      totalSharesBps: extractNumber(record.total_shares_bps, 'u16'),
      numBeneficiaries: extractNumber(record.num_beneficiaries, 'u8'),
      isActive: record.is_active === true || record.is_active === 'true',
      nonce: extractField(record.nonce),
    };
  } catch (error) {
    console.error('Failed to parse WillConfig:', error);
    return null;
  }
}

/**
 * Parse BenAllocation from record string
 */
export interface ParsedBenAllocation {
  owner: string;
  beneficiaryAddr: string;
  willId: string;
  shareBps: number;
  priority: number;
  isActive: boolean;
}

export function parseBenAllocation(recordString: string): ParsedBenAllocation | null {
  try {
    if (recordString.startsWith('{')) {
      const parsed = JSON.parse(recordString);
      const data = parsed.data || parsed;

      return {
        owner: data.owner || '',
        beneficiaryAddr: data.beneficiary_addr || '',
        willId: extractField(data.will_id),
        shareBps: extractNumber(data.share_bps, 'u16'),
        priority: extractNumber(data.priority, 'u8'),
        isActive: data.is_active === true || data.is_active === 'true',
      };
    }

    const record = parseAleoRecord<Record<string, unknown>>(recordString);
    if (!record) return null;

    return {
      owner: (record.owner as string) || '',
      beneficiaryAddr: (record.beneficiary_addr as string) || '',
      willId: extractField(record.will_id),
      shareBps: extractNumber(record.share_bps, 'u16'),
      priority: extractNumber(record.priority, 'u8'),
      isActive: record.is_active === true || record.is_active === 'true',
    };
  } catch (error) {
    console.error('Failed to parse BenAllocation:', error);
    return null;
  }
}

/**
 * Parse LockedCredits from record string
 */
export interface ParsedLockedCredits {
  owner: string;
  willId: string;
  amount: bigint;
  depositor: string;
}

export function parseLockedCredits(recordString: string): ParsedLockedCredits | null {
  try {
    if (recordString.startsWith('{')) {
      const parsed = JSON.parse(recordString);
      const data = parsed.data || parsed;

      return {
        owner: data.owner || '',
        willId: extractField(data.will_id),
        amount: extractBigInt(data.amount, 'u64'),
        depositor: data.depositor || '',
      };
    }

    const record = parseAleoRecord<Record<string, unknown>>(recordString);
    if (!record) return null;

    return {
      owner: (record.owner as string) || '',
      willId: extractField(record.will_id),
      amount: extractBigInt(record.amount, 'u64'),
      depositor: (record.depositor as string) || '',
    };
  } catch (error) {
    console.error('Failed to parse LockedCredits:', error);
    return null;
  }
}

// Helper functions for extraction
function extractField(value: unknown): string {
  if (!value) return '0field';
  const str = String(value);
  if (str.endsWith('field')) return str;
  return `${str}field`;
}

function extractBigInt(value: unknown, _type: string): bigint {
  if (!value) return 0n;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  const str = String(value);
  const cleaned = str.replace(/[a-z]+$/i, '');
  return BigInt(cleaned);
}

function extractNumber(value: unknown, _type: string): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  const str = String(value);
  const cleaned = str.replace(/[a-z]+$/i, '');
  return parseInt(cleaned, 10);
}

/**
 * Generate a hash for beneficiary verification
 * Simulates BHP256 hash behavior for client-side estimation
 */
export function hashBeneficiaryAllocation(
  willId: string,
  beneficiaryAddress: string,
  shareBps: number
): string {
  // This is a placeholder - actual hashing happens on-chain
  // Used for UI display and verification
  const combined = `${willId}:${beneficiaryAddress}:${shareBps}`;
  let hash = 0n;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31n + BigInt(combined.charCodeAt(i))) % (2n ** 253n);
  }
  return `${hash}field`;
}

/**
 * Format record for transaction input
 * Handles both JSON and ciphertext formats
 */
export function formatRecordForTransaction(record: string): string {
  try {
    const parsed = JSON.parse(record);
    // Prefer ciphertext if available (for privacy)
    if (parsed.ciphertext) return parsed.ciphertext;
    if (parsed.plaintext) return parsed.plaintext;
    // If it's just data, return the original
    return record;
  } catch {
    // Already in the right format
    return record;
  }
}
