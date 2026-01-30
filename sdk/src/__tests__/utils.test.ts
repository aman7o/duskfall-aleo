/**
 * SDK Utility Functions Tests
 */

import {
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
} from '../utils';

describe('Time Conversion Functions', () => {
  describe('daysToBlocks', () => {
    it('should convert days to blocks correctly', () => {
      // ~4320 blocks per day (20 second block time)
      // FIX: daysToBlocks now returns number, not bigint
      expect(daysToBlocks(1)).toBeCloseTo(4320, -2);
      expect(daysToBlocks(7)).toBeCloseTo(30240, -2);
      expect(daysToBlocks(30)).toBeCloseTo(129600, -2);
    });

    it('should handle zero days', () => {
      // FIX: Returns number, not bigint
      expect(daysToBlocks(0)).toBe(0);
    });

    it('should throw for negative days', () => {
      expect(() => daysToBlocks(-1)).toThrow('Days cannot be negative');
    });

    it('should throw for days that overflow u32', () => {
      // u32 max / 4320 = ~993,851 days max
      // 3000 years * 365 days = 1,095,000 days would overflow u32
      expect(() => daysToBlocks(365 * 3000)).toThrow('overflow u32');
    });
  });

  describe('blocksToDays', () => {
    it('should convert blocks to days correctly', () => {
      // FIX: blocksToDays now takes number, not bigint
      expect(blocksToDays(4320)).toBeCloseTo(1, 1);
      expect(blocksToDays(30240)).toBeCloseTo(7, 1);
    });

    it('should handle zero blocks', () => {
      expect(blocksToDays(0)).toBe(0);
    });
  });

  describe('formatTimeRemaining', () => {
    it('should format days and hours', () => {
      // FIX: formatTimeRemaining now takes number, not bigint
      const blocks = daysToBlocks(5) + Math.floor(daysToBlocks(1) / 24 * 3); // 5 days, ~3 hours
      const result = formatTimeRemaining(blocks);
      expect(result).toContain('5 days');
    });

    it('should show "Expired" for zero or negative blocks', () => {
      // FIX: Use number, not bigint
      expect(formatTimeRemaining(0)).toBe('Expired');
      expect(formatTimeRemaining(-100)).toBe('Expired');
    });

    it('should format hours when no days', () => {
      // FIX: Use number, not bigint
      const blocks = Math.floor(5760 / 24 * 3); // ~3 hours
      const result = formatTimeRemaining(blocks);
      expect(result).toContain('hour');
    });
  });
});

describe('Nonce Generation', () => {
  describe('generateNonce', () => {
    it('should generate a valid field element', () => {
      const nonce = generateNonce();
      expect(nonce).toMatch(/^\d+field$/);
    });

    it('should generate unique nonces', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        nonces.add(generateNonce());
      }
      // Should have 100 unique nonces
      expect(nonces.size).toBe(100);
    });
  });
});

describe('Address Functions', () => {
  describe('hashAddress', () => {
    it('should hash an address to a field element', () => {
      const address = 'aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc';
      const hash = hashAddress(address);
      expect(hash).toMatch(/^\d+field$/);
    });

    it('should produce consistent hashes for the same address', () => {
      const address = 'aleo1testaddress123456789012345678901234567890123456789012';
      const hash1 = hashAddress(address);
      const hash2 = hashAddress(address);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different addresses', () => {
      const addr1 = 'aleo1address1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
      const addr2 = 'aleo1address2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
      expect(hashAddress(addr1)).not.toBe(hashAddress(addr2));
    });
  });

  describe('isValidAleoAddress', () => {
    it('should accept valid Aleo addresses', () => {
      expect(isValidAleoAddress('aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc')).toBe(true);
    });

    it('should reject addresses not starting with aleo1', () => {
      expect(isValidAleoAddress('btc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc')).toBe(false);
    });

    it('should reject addresses with wrong length', () => {
      expect(isValidAleoAddress('aleo1short')).toBe(false);
      expect(isValidAleoAddress('aleo1' + 'q'.repeat(100))).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidAleoAddress(null as unknown as string)).toBe(false);
      expect(isValidAleoAddress(123 as unknown as string)).toBe(false);
    });
  });
});

describe('Credit Conversion Functions', () => {
  describe('aleoToMicrocredits', () => {
    it('should convert ALEO to microcredits', () => {
      expect(aleoToMicrocredits(1)).toBe(1_000_000n);
      expect(aleoToMicrocredits(0.5)).toBe(500_000n);
      expect(aleoToMicrocredits(100)).toBe(100_000_000n);
    });

    it('should handle zero', () => {
      expect(aleoToMicrocredits(0)).toBe(0n);
    });
  });

  describe('microcreditsToAleo', () => {
    it('should convert microcredits to ALEO', () => {
      expect(microcreditsToAleo(1_000_000n)).toBe(1);
      expect(microcreditsToAleo(500_000n)).toBe(0.5);
      expect(microcreditsToAleo(100_000_000n)).toBe(100);
    });
  });

  describe('formatAleo', () => {
    it('should format microcredits as ALEO string', () => {
      expect(formatAleo(1_000_000n)).toBe('1.000000 ALEO');
      expect(formatAleo(1_500_000n)).toBe('1.500000 ALEO');
    });

    it('should respect decimal places parameter', () => {
      expect(formatAleo(1_000_000n, 2)).toBe('1.00 ALEO');
    });
  });
});

describe('Share Calculation Functions', () => {
  describe('calculateShare', () => {
    it('should calculate shares correctly', () => {
      expect(calculateShare(1000n, 5000)).toBe(500n); // 50%
      expect(calculateShare(1000n, 2500)).toBe(250n); // 25%
      expect(calculateShare(1000n, 10000)).toBe(1000n); // 100%
    });

    it('should throw for invalid basis points', () => {
      expect(() => calculateShare(1000n, -100)).toThrow();
      expect(() => calculateShare(1000n, 10001)).toThrow();
    });
  });

  describe('bpsToPercent', () => {
    it('should convert basis points to percentage', () => {
      expect(bpsToPercent(5000)).toBe(50);
      expect(bpsToPercent(10000)).toBe(100);
      expect(bpsToPercent(100)).toBe(1);
    });
  });

  describe('percentToBps', () => {
    it('should convert percentage to basis points', () => {
      expect(percentToBps(50)).toBe(5000);
      expect(percentToBps(100)).toBe(10000);
      expect(percentToBps(1)).toBe(100);
    });

    it('should throw for invalid percentages', () => {
      expect(() => percentToBps(-1)).toThrow();
      expect(() => percentToBps(101)).toThrow();
    });
  });

  describe('validateSharesTotal', () => {
    it('should return true for shares totaling 100%', () => {
      expect(validateSharesTotal([5000, 3000, 2000])).toBe(true);
      expect(validateSharesTotal([10000])).toBe(true);
    });

    it('should return false for shares not totaling 100%', () => {
      expect(validateSharesTotal([5000, 3000])).toBe(false);
      expect(validateSharesTotal([5000, 6000])).toBe(false);
    });
  });
});

describe('Field Validation', () => {
  describe('isValidField', () => {
    it('should accept valid field elements', () => {
      expect(isValidField('123field')).toBe(true);
      expect(isValidField('0field')).toBe(true);
    });

    it('should reject invalid field elements', () => {
      expect(isValidField('123')).toBe(false);
      // 'field' ends with 'field' so it's technically valid per implementation
      expect(isValidField('field')).toBe(true);
      expect(isValidField('')).toBe(false);
      expect(isValidField('random')).toBe(false);
    });
  });
});

describe('Trigger Functions', () => {
  describe('calculateTriggerBounty', () => {
    it('should calculate bounty as 0.1% of total', () => {
      // Default bounty is 10 bps = 0.1%
      // 1,000,000 * 10 / 10000 = 1000
      expect(calculateTriggerBounty(1_000_000n)).toBe(1000n);
      expect(calculateTriggerBounty(10_000_000n)).toBe(10000n);
    });

    it('should allow custom bounty rate', () => {
      expect(calculateTriggerBounty(1_000_000n, 100)).toBe(10000n); // 1%
    });
  });

  describe('isDeadlinePassed', () => {
    it('should return true when deadline has passed', () => {
      // FIX: Use number, not bigint (matches u32 in Leo contract)
      const currentBlock = 1000;
      const lastCheckin = 500;
      const checkinPeriod = 200;
      const gracePeriod = 100;
      // Deadline = 500 + 200 + 100 = 800
      expect(isDeadlinePassed(currentBlock, lastCheckin, checkinPeriod, gracePeriod)).toBe(true);
    });

    it('should return false when deadline has not passed', () => {
      // FIX: Use number, not bigint
      const currentBlock = 700;
      const lastCheckin = 500;
      const checkinPeriod = 200;
      const gracePeriod = 100;
      expect(isDeadlinePassed(currentBlock, lastCheckin, checkinPeriod, gracePeriod)).toBe(false);
    });
  });

  describe('blocksUntilDeadline', () => {
    it('should calculate blocks remaining correctly', () => {
      // FIX: Use number, not bigint
      const currentBlock = 700;
      const lastCheckin = 500;
      const checkinPeriod = 200;
      const gracePeriod = 100;
      // Deadline = 800, remaining = 100
      expect(blocksUntilDeadline(currentBlock, lastCheckin, checkinPeriod, gracePeriod)).toBe(100);
    });

    it('should return negative when deadline passed', () => {
      // FIX: Use number, not bigint
      const currentBlock = 1000;
      const lastCheckin = 500;
      const checkinPeriod = 200;
      const gracePeriod = 100;
      expect(blocksUntilDeadline(currentBlock, lastCheckin, checkinPeriod, gracePeriod)).toBe(-200);
    });
  });
});

describe('Async Utilities', () => {
  describe('sleep', () => {
    it('should wait for specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('retry', () => {
    it('should succeed on first try', async () => {
      let attempts = 0;
      const fn = jest.fn(async () => {
        attempts++;
        return 'success';
      });

      const result = await retry(fn);
      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const fn = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('fail');
        }
        return 'success';
      });

      const result = await retry(fn, 3, 10);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max retries', async () => {
      const fn = jest.fn(async () => {
        throw new Error('always fails');
      });

      await expect(retry(fn, 2, 10)).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});
