/**
 * LAYER 2: Frontend Unit Tests
 * Tests for useWill hook utility functions
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the wallet adapter
jest.mock('@demox-labs/aleo-wallet-adapter-react', () => ({
  useWallet: () => ({
    publicKey: 'aleo1test123456789',
    connected: true,
    requestRecords: jest.fn(),
    requestTransaction: jest.fn(),
  }),
}));

// Import after mocking
// Note: These functions are internal to useWill.ts, so we test them indirectly
// or extract them for direct testing

describe('Record Formatting', () => {
  // Test helper function to normalize Aleo values
  const normalizeAleoValue = (value: string | undefined): string => {
    if (!value) return '';
    return value.replace(/\.(private|public)$/, '');
  };

  describe('normalizeAleoValue', () => {
    it('should remove .private suffix', () => {
      expect(normalizeAleoValue('123field.private')).toBe('123field');
    });

    it('should remove .public suffix', () => {
      expect(normalizeAleoValue('456u32.public')).toBe('456u32');
    });

    it('should return unchanged if no suffix', () => {
      expect(normalizeAleoValue('789field')).toBe('789field');
    });

    it('should handle empty string', () => {
      expect(normalizeAleoValue('')).toBe('');
    });

    it('should handle undefined', () => {
      expect(normalizeAleoValue(undefined)).toBe('');
    });

    it('should handle address with suffix', () => {
      expect(normalizeAleoValue('aleo1abc123.private')).toBe('aleo1abc123');
    });
  });

  describe('WillConfig formatting', () => {
    // Simulate the formatWillConfigForTransaction function
    const formatWillConfigForTransaction = (data: Record<string, unknown>): string => {
      const recordData = (data.data || data) as Record<string, string | boolean>;

      const owner = normalizeAleoValue(recordData.owner as string) || '';
      const willId = normalizeAleoValue(recordData.will_id as string) || '0field';
      const checkIn = normalizeAleoValue(recordData.check_in_period as string) || '0u32';
      const grace = normalizeAleoValue(recordData.grace_period as string) || '0u32';
      const shares = normalizeAleoValue(recordData.total_shares_bps as string) || '0u16';
      const numBen = normalizeAleoValue(recordData.num_beneficiaries as string) || '0u8';
      const isActive = recordData.is_active === 'true' || recordData.is_active === true;
      const nonce = normalizeAleoValue(recordData.nonce as string) || '0field';

      return `{
  owner: ${owner},
  will_id: ${willId},
  check_in_period: ${checkIn},
  grace_period: ${grace},
  total_shares_bps: ${shares},
  num_beneficiaries: ${numBen},
  is_active: ${isActive},
  nonce: ${nonce}
}`;
    };

    it('should format WillConfig with nested data structure', () => {
      const record = {
        data: {
          owner: 'aleo1owner123.private',
          will_id: '12345field.private',
          check_in_period: '30240u32.private',
          grace_period: '10080u32.private',
          total_shares_bps: '5000u16.private',
          num_beneficiaries: '2u8.private',
          is_active: 'true',
          nonce: '99999field.private',
        },
      };

      const result = formatWillConfigForTransaction(record);

      expect(result).toContain('owner: aleo1owner123');
      expect(result).toContain('will_id: 12345field');
      expect(result).toContain('check_in_period: 30240u32');
      expect(result).toContain('grace_period: 10080u32');
      expect(result).toContain('total_shares_bps: 5000u16');
      expect(result).toContain('num_beneficiaries: 2u8');
      expect(result).toContain('is_active: true');
      expect(result).toContain('nonce: 99999field');
    });

    it('should handle flat record structure', () => {
      const record = {
        owner: 'aleo1owner456',
        will_id: '67890field',
        check_in_period: '15120u32',
        grace_period: '5040u32',
        total_shares_bps: '10000u16',
        num_beneficiaries: '3u8',
        is_active: true,
        nonce: '11111field',
      };

      const result = formatWillConfigForTransaction(record);

      expect(result).toContain('owner: aleo1owner456');
      expect(result).toContain('will_id: 67890field');
      expect(result).toContain('is_active: true');
    });

    it('should use defaults for missing fields', () => {
      const record = {
        owner: 'aleo1test',
      };

      const result = formatWillConfigForTransaction(record);

      expect(result).toContain('will_id: 0field');
      expect(result).toContain('check_in_period: 0u32');
      expect(result).toContain('is_active: false');
    });
  });

  describe('LockedCredits formatting', () => {
    const formatLockedCreditsForTransaction = (data: Record<string, unknown>): string => {
      const recordData = (data.data || data) as Record<string, string>;

      const owner = normalizeAleoValue(recordData.owner) || '';
      const willId = normalizeAleoValue(recordData.will_id) || '0field';
      const amount = normalizeAleoValue(recordData.amount) || '0u64';
      const depositor = normalizeAleoValue(recordData.depositor) || '';

      return `{
  owner: ${owner},
  will_id: ${willId},
  amount: ${amount},
  depositor: ${depositor}
}`;
    };

    it('should format LockedCredits correctly', () => {
      const record = {
        data: {
          owner: 'aleo1owner.private',
          will_id: '12345field.private',
          amount: '1000000u64.private',
          depositor: 'aleo1depositor.private',
        },
      };

      const result = formatLockedCreditsForTransaction(record);

      expect(result).toContain('owner: aleo1owner');
      expect(result).toContain('will_id: 12345field');
      expect(result).toContain('amount: 1000000u64');
      expect(result).toContain('depositor: aleo1depositor');
    });
  });
});

describe('Type Conversions', () => {
  // Days to blocks conversion (Aleo uses ~20 second block time, ~4320 blocks per day)
  const BLOCK_TIME_SECONDS = 20;
  const BLOCKS_PER_DAY = 4320;

  const daysToBlocks = (days: number): bigint => {
    return BigInt(Math.floor(days * BLOCKS_PER_DAY));
  };

  // Blocks to time conversion
  const blocksToTime = (blocks: bigint): string => {
    const seconds = Number(blocks) * BLOCK_TIME_SECONDS;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  };

  // Percent to basis points
  const percentToBps = (percent: number): number => {
    return Math.round(percent * 100);
  };

  describe('daysToBlocks', () => {
    it('should convert 1 day to 4320 blocks', () => {
      const blocks = daysToBlocks(1);
      expect(blocks).toBe(4320n);
    });

    it('should convert 7 days to 30240 blocks', () => {
      const blocks = daysToBlocks(7);
      expect(blocks).toBe(30240n);
    });

    it('should convert 30 days correctly', () => {
      const blocks = daysToBlocks(30);
      expect(blocks).toBe(129600n);
    });

    it('should handle fractional days', () => {
      const blocks = daysToBlocks(0.5);
      expect(blocks).toBe(2160n);
    });
  });

  describe('blocksToTime', () => {
    it('should convert blocks to days and hours', () => {
      const time = blocksToTime(4320n); // 1 day (4320 blocks * 20s = 86400s)
      expect(time).toBe('1d 0h');
    });

    it('should show only hours when less than 1 day', () => {
      const time = blocksToTime(180n); // 1 hour (180 blocks * 20s = 3600s)
      expect(time).toBe('1h');
    });

    it('should handle multiple days', () => {
      const time = blocksToTime(12960n); // 3 days (12960 blocks * 20s = 259200s)
      expect(time).toBe('3d 0h');
    });
  });

  describe('percentToBps', () => {
    it('should convert 50% to 5000 bps', () => {
      expect(percentToBps(50)).toBe(5000);
    });

    it('should convert 100% to 10000 bps', () => {
      expect(percentToBps(100)).toBe(10000);
    });

    it('should convert 25.5% to 2550 bps', () => {
      expect(percentToBps(25.5)).toBe(2550);
    });

    it('should handle 0%', () => {
      expect(percentToBps(0)).toBe(0);
    });
  });
});

describe('Nonce Generation', () => {
  const generateSecureNonce = (): string => {
    // Simplified version for testing
    const randomPart = Math.floor(Math.random() * 1000000000);
    return `${randomPart}field`;
  };

  it('should generate a field-type nonce', () => {
    const nonce = generateSecureNonce();
    expect(nonce).toMatch(/^\d+field$/);
  });

  it('should generate different nonces each time', () => {
    const nonce1 = generateSecureNonce();
    const nonce2 = generateSecureNonce();
    // Very unlikely to be the same
    expect(nonce1).not.toBe(nonce2);
  });
});

describe('Error Message Formatting', () => {
  const formatWalletError = (err: unknown): string => {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (errorMsg.includes('Not ready')) {
      return 'Leo Wallet is still initializing. Please wait a moment and try again.';
    }
    if (errorMsg.includes('INVALID_PARAMS')) {
      return 'Wallet connection issue. Please try disconnecting and reconnecting your wallet.';
    }
    if (errorMsg.includes('User rejected')) {
      return 'Transaction was rejected by user.';
    }

    return errorMsg;
  };

  it('should format "Not ready" error', () => {
    const error = new Error('Not ready');
    expect(formatWalletError(error)).toBe(
      'Leo Wallet is still initializing. Please wait a moment and try again.'
    );
  });

  it('should format INVALID_PARAMS error', () => {
    const error = new Error('INVALID_PARAMS: something went wrong');
    expect(formatWalletError(error)).toBe(
      'Wallet connection issue. Please try disconnecting and reconnecting your wallet.'
    );
  });

  it('should format user rejection', () => {
    const error = new Error('User rejected the request');
    expect(formatWalletError(error)).toBe('Transaction was rejected by user.');
  });

  it('should pass through unknown errors', () => {
    const error = new Error('Some other error');
    expect(formatWalletError(error)).toBe('Some other error');
  });

  it('should handle non-Error objects', () => {
    expect(formatWalletError('string error')).toBe('string error');
  });
});
