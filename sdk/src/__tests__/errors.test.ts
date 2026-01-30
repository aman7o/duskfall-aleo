/**
 * Error Handling Tests
 */

import {
  DigitalWillError,
  ErrorCode,
  isDigitalWillError,
  assertCondition,
  withErrorHandling,
} from '../errors';

describe('DigitalWillError', () => {
  describe('constructor', () => {
    it('should create an error with code and message', () => {
      const error = new DigitalWillError(ErrorCode.WILL_NOT_FOUND);

      expect(error.code).toBe(ErrorCode.WILL_NOT_FOUND);
      expect(error.message).toContain('Will not found');
      expect(error.name).toBe('DigitalWillError');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should accept custom message', () => {
      const error = new DigitalWillError(
        ErrorCode.WILL_NOT_FOUND,
        'Custom message'
      );

      expect(error.message).toBe('Custom message');
    });

    it('should accept context', () => {
      const error = new DigitalWillError(
        ErrorCode.WILL_NOT_FOUND,
        undefined,
        { willId: '123field' }
      );

      expect(error.context).toEqual({ willId: '123field' });
    });

    it('should accept cause', () => {
      const cause = new Error('Original error');
      const error = new DigitalWillError(
        ErrorCode.NETWORK_ERROR,
        undefined,
        undefined,
        cause
      );

      expect(error.cause).toBe(cause);
    });
  });

  describe('fromContractError', () => {
    it('should detect will not found errors', () => {
      const error = DigitalWillError.fromContractError('Will not found');
      expect(error.code).toBe(ErrorCode.WILL_NOT_FOUND);
    });

    it('should detect beneficiary errors', () => {
      const error = DigitalWillError.fromContractError(
        'Beneficiary already claimed their share'
      );
      expect(error.code).toBe(ErrorCode.BENEFICIARY_ALREADY_CLAIMED);
    });

    it('should detect insufficient balance', () => {
      const error = DigitalWillError.fromContractError(
        'Insufficient balance for operation'
      );
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_BALANCE);
    });

    it('should return UNKNOWN_ERROR for unrecognized messages', () => {
      const error = DigitalWillError.fromContractError('Something random');
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });
  });

  describe('from', () => {
    it('should return same error if already DigitalWillError', () => {
      const original = new DigitalWillError(ErrorCode.WILL_NOT_FOUND);
      const result = DigitalWillError.from(original);

      expect(result).toBe(original);
    });

    it('should wrap Error instances', () => {
      const original = new Error('Some error');
      const result = DigitalWillError.from(original);

      expect(result).toBeInstanceOf(DigitalWillError);
      expect(result.cause).toBe(original);
    });

    it('should detect network errors', () => {
      const original = new Error('fetch failed: network error');
      const result = DigitalWillError.from(original);

      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it('should detect timeout errors', () => {
      const original = new Error('Request timed out');
      const result = DigitalWillError.from(original);

      expect(result.code).toBe(ErrorCode.TIMEOUT);
    });

    it('should handle non-Error values', () => {
      const result = DigitalWillError.from('string error');

      expect(result).toBeInstanceOf(DigitalWillError);
      expect(result.message).toBe('string error');
    });
  });

  describe('static factory methods', () => {
    it('networkError should create NETWORK_ERROR', () => {
      const error = DigitalWillError.networkError('Connection failed');
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it('rpcError should create RPC_ERROR', () => {
      const error = DigitalWillError.rpcError('RPC call failed');
      expect(error.code).toBe(ErrorCode.RPC_ERROR);
    });

    it('validationError should create specified error code', () => {
      const error = DigitalWillError.validationError(ErrorCode.INVALID_ADDRESS);
      expect(error.code).toBe(ErrorCode.INVALID_ADDRESS);
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      expect(new DigitalWillError(ErrorCode.NETWORK_ERROR).isRetryable()).toBe(true);
      expect(new DigitalWillError(ErrorCode.RPC_ERROR).isRetryable()).toBe(true);
      expect(new DigitalWillError(ErrorCode.TIMEOUT).isRetryable()).toBe(true);
      expect(new DigitalWillError(ErrorCode.RATE_LIMITED).isRetryable()).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(new DigitalWillError(ErrorCode.WILL_NOT_FOUND).isRetryable()).toBe(false);
      expect(new DigitalWillError(ErrorCode.INVALID_ADDRESS).isRetryable()).toBe(false);
    });
  });

  describe('isInsufficientFunds', () => {
    it('should return true for balance errors', () => {
      expect(new DigitalWillError(ErrorCode.INSUFFICIENT_BALANCE).isInsufficientFunds()).toBe(true);
      expect(new DigitalWillError(ErrorCode.INSUFFICIENT_FEE).isInsufficientFunds()).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(new DigitalWillError(ErrorCode.WILL_NOT_FOUND).isInsufficientFunds()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new DigitalWillError(
        ErrorCode.WILL_NOT_FOUND,
        'Custom message',
        { willId: '123' }
      );

      const json = error.toJSON();

      expect(json.name).toBe('DigitalWillError');
      expect(json.code).toBe(ErrorCode.WILL_NOT_FOUND);
      expect(json.message).toBe('Custom message');
      expect(json.context).toEqual({ willId: '123' });
      expect(json.timestamp).toBeTruthy();
    });
  });

  describe('getUserMessage', () => {
    it('should return user-friendly message', () => {
      const error = new DigitalWillError(ErrorCode.WILL_NOT_FOUND);
      const message = error.getUserMessage();

      expect(message).toContain('Will not found');
    });
  });
});

describe('isDigitalWillError', () => {
  it('should return true for DigitalWillError', () => {
    const error = new DigitalWillError(ErrorCode.WILL_NOT_FOUND);
    expect(isDigitalWillError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Regular error');
    expect(isDigitalWillError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isDigitalWillError(null)).toBe(false);
    expect(isDigitalWillError('string')).toBe(false);
    expect(isDigitalWillError({})).toBe(false);
  });
});

describe('assertCondition', () => {
  it('should not throw when condition is true', () => {
    expect(() => assertCondition(true, ErrorCode.INVALID_PARAMETER)).not.toThrow();
  });

  it('should throw when condition is false', () => {
    expect(() => assertCondition(false, ErrorCode.INVALID_PARAMETER)).toThrow(
      DigitalWillError
    );
  });

  it('should throw with correct error code', () => {
    try {
      assertCondition(false, ErrorCode.WILL_NOT_ACTIVE);
    } catch (error) {
      expect(error).toBeInstanceOf(DigitalWillError);
      expect((error as DigitalWillError).code).toBe(ErrorCode.WILL_NOT_ACTIVE);
    }
  });
});

describe('withErrorHandling', () => {
  it('should return result on success', async () => {
    const fn = jest.fn(async () => 'success');
    const wrapped = withErrorHandling(fn);

    const result = await wrapped();
    expect(result).toBe('success');
  });

  it('should wrap errors in DigitalWillError', async () => {
    const fn = jest.fn(async () => {
      throw new Error('Original error');
    });
    const wrapped = withErrorHandling(fn, { operation: 'test' });

    await expect(wrapped()).rejects.toBeInstanceOf(DigitalWillError);
  });

  it('should preserve DigitalWillError', async () => {
    const original = new DigitalWillError(ErrorCode.WILL_NOT_FOUND);
    const fn = jest.fn(async () => {
      throw original;
    });
    const wrapped = withErrorHandling(fn);

    await expect(wrapped()).rejects.toBe(original);
  });
});

describe('ErrorCode enum', () => {
  it('should have all expected error codes', () => {
    expect(ErrorCode.WILL_NOT_FOUND).toBeDefined();
    expect(ErrorCode.BENEFICIARY_NOT_FOUND).toBeDefined();
    expect(ErrorCode.INSUFFICIENT_BALANCE).toBeDefined();
    expect(ErrorCode.TRANSACTION_REJECTED).toBeDefined();
    expect(ErrorCode.INVALID_MERKLE_PROOF).toBeDefined();
    expect(ErrorCode.NETWORK_ERROR).toBeDefined();
    expect(ErrorCode.WALLET_NOT_CONNECTED).toBeDefined();
  });
});
