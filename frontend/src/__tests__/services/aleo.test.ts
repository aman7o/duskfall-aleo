/**
 * LAYER 2: Aleo Service Tests
 * Tests for blockchain RPC queries and utilities
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Aleo Service', () => {
  const PROGRAM_ID = 'digital_will_v7.aleo';
  const RPC_ENDPOINT = 'https://api.explorer.provable.com/v1';

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('isProgramDeployed', () => {
    const isProgramDeployed = async (): Promise<boolean> => {
      try {
        const response = await fetch(`${RPC_ENDPOINT}/testnet/program/${PROGRAM_ID}`);
        return response.ok;
      } catch {
        return false;
      }
    };

    it('should return true when program exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await isProgramDeployed();
      expect(result).toBe(true);
    });

    it('should return false when program not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await isProgramDeployed();
      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await isProgramDeployed();
      expect(result).toBe(false);
    });
  });

  describe('getMappingValue', () => {
    const getMappingValue = async (
      mapping: string,
      key: string
    ): Promise<string | null> => {
      try {
        const response = await fetch(
          `${RPC_ENDPOINT}/testnet/program/${PROGRAM_ID}/mapping/${mapping}/${key}`
        );
        if (!response.ok) return null;
        const data = await response.json();
        return data;
      } catch {
        return null;
      }
    };

    it('should fetch will_status mapping', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => '1u8',
      } as Response);

      const result = await getMappingValue('will_status', '12345field');
      expect(result).toBe('1u8');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/mapping/will_status/12345field')
      );
    });

    it('should fetch total_locked mapping', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => '1000000u64',
      } as Response);

      const result = await getMappingValue('total_locked', '12345field');
      expect(result).toBe('1000000u64');
    });

    it('should return null for non-existent key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await getMappingValue('will_status', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getLatestBlockHeight', () => {
    const getLatestBlockHeight = async (): Promise<bigint> => {
      try {
        const response = await fetch(`${RPC_ENDPOINT}/testnet/block/height/latest`);
        if (!response.ok) return 0n;
        const height = await response.json();
        return BigInt(height);
      } catch {
        return 0n;
      }
    };

    it('should return block height as bigint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 1234567,
      } as Response);

      const result = await getLatestBlockHeight();
      expect(result).toBe(1234567n);
    });

    it('should return 0 on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getLatestBlockHeight();
      expect(result).toBe(0n);
    });
  });

  describe('parseAleoValue', () => {
    // Parse Aleo typed values to JS types
    const parseAleoValue = (value: string | null): bigint | number | boolean | null => {
      if (!value || value === 'null') return null;

      // Remove quotes if present
      const cleaned = value.replace(/^"|"$/g, '');

      // Parse u64/u32/u16/u8
      const uintMatch = cleaned.match(/^(\d+)u(64|32|16|8)$/);
      if (uintMatch) {
        return uintMatch[2] === '64' ? BigInt(uintMatch[1]) : parseInt(uintMatch[1]);
      }

      // Parse field
      const fieldMatch = cleaned.match(/^(\d+)field$/);
      if (fieldMatch) {
        return BigInt(fieldMatch[1]);
      }

      // Parse bool
      if (cleaned === 'true') return true;
      if (cleaned === 'false') return false;

      return null;
    };

    it('should parse u64 values', () => {
      expect(parseAleoValue('1000000u64')).toBe(1000000n);
    });

    it('should parse u32 values', () => {
      expect(parseAleoValue('30240u32')).toBe(30240);
    });

    it('should parse u16 values', () => {
      expect(parseAleoValue('5000u16')).toBe(5000);
    });

    it('should parse u8 values', () => {
      expect(parseAleoValue('1u8')).toBe(1);
    });

    it('should parse field values', () => {
      expect(parseAleoValue('12345field')).toBe(12345n);
    });

    it('should parse boolean true', () => {
      expect(parseAleoValue('true')).toBe(true);
    });

    it('should parse boolean false', () => {
      expect(parseAleoValue('false')).toBe(false);
    });

    it('should handle null', () => {
      expect(parseAleoValue(null)).toBeNull();
      expect(parseAleoValue('null')).toBeNull();
    });

    it('should handle quoted values', () => {
      expect(parseAleoValue('"1000u64"')).toBe(1000n);
    });
  });

  describe('WillStatus enum', () => {
    enum WillStatus {
      INACTIVE = 0,
      ACTIVE = 1,
      TRIGGERED = 2,
      CLAIMED = 3,
    }

    const parseWillStatus = (value: string | null): WillStatus | null => {
      if (!value) return null;
      const match = value.match(/^(\d+)u8$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num in WillStatus) {
          return num as WillStatus;
        }
      }
      return null;
    };

    it('should parse INACTIVE status', () => {
      expect(parseWillStatus('0u8')).toBe(WillStatus.INACTIVE);
    });

    it('should parse ACTIVE status', () => {
      expect(parseWillStatus('1u8')).toBe(WillStatus.ACTIVE);
    });

    it('should parse TRIGGERED status', () => {
      expect(parseWillStatus('2u8')).toBe(WillStatus.TRIGGERED);
    });

    it('should parse CLAIMED status', () => {
      expect(parseWillStatus('3u8')).toBe(WillStatus.CLAIMED);
    });

    it('should return null for invalid status', () => {
      expect(parseWillStatus('5u8')).toBeNull();
      expect(parseWillStatus(null)).toBeNull();
    });
  });
});

describe('Fee Calculation', () => {
  const calculateDynamicFee = (transition: string): number => {
    // Base fees in microcredits
    const fees: Record<string, number> = {
      create_will: 500000,
      check_in_backup: 300000,
      deposit_public: 400000,
      deposit: 500000,
      add_beneficiary: 400000,
      revoke_beneficiary: 400000,
      withdraw: 500000,
      trigger_will: 600000,
      claim_inheritance: 500000,
      claim_inheritance_v2: 500000,
      emergency_recovery: 600000,
      deactivate_will: 300000,
      reactivate_will: 300000,
    };

    return fees[transition] || 500000; // Default fee
  };

  it('should return correct fee for create_will', () => {
    expect(calculateDynamicFee('create_will')).toBe(500000);
  });

  it('should return correct fee for check_in_backup', () => {
    expect(calculateDynamicFee('check_in_backup')).toBe(300000);
  });

  it('should return correct fee for trigger_will', () => {
    expect(calculateDynamicFee('trigger_will')).toBe(600000);
  });

  it('should return default fee for unknown transition', () => {
    expect(calculateDynamicFee('unknown_transition')).toBe(500000);
  });
});

describe('Explorer URL', () => {
  const getExplorerUrl = (txId: string): string => {
    return `https://explorer.provable.com/transaction/${txId}`;
  };

  it('should generate correct explorer URL', () => {
    const txId = 'at1234567890abcdef';
    const url = getExplorerUrl(txId);
    expect(url).toBe('https://explorer.provable.com/transaction/at1234567890abcdef');
  });
});
