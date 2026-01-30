/**
 * Enhanced error handling for Digital Will SDK
 *
 * Provides typed error codes and detailed error messages for all SDK operations.
 * Follows patterns from ProvableHQ/sdk for consistent error handling.
 */

/**
 * Error codes for Digital Will SDK operations
 */
export enum ErrorCode {
  // Will errors
  WILL_NOT_FOUND = 'WILL_NOT_FOUND',
  WILL_NOT_ACTIVE = 'WILL_NOT_ACTIVE',
  WILL_ALREADY_TRIGGERED = 'WILL_ALREADY_TRIGGERED',
  WILL_NOT_TRIGGERED = 'WILL_NOT_TRIGGERED',
  WILL_ALREADY_EXISTS = 'WILL_ALREADY_EXISTS',
  WILL_OWNER_MISMATCH = 'WILL_OWNER_MISMATCH',
  WILL_DEADLINE_NOT_PASSED = 'WILL_DEADLINE_NOT_PASSED',
  WILL_RECOVERY_THRESHOLD_EXCEEDED = 'WILL_RECOVERY_THRESHOLD_EXCEEDED',

  // Beneficiary errors
  BENEFICIARY_NOT_FOUND = 'BENEFICIARY_NOT_FOUND',
  BENEFICIARY_ALREADY_CLAIMED = 'BENEFICIARY_ALREADY_CLAIMED',
  BENEFICIARY_REVOKED = 'BENEFICIARY_REVOKED',
  BENEFICIARY_LIMIT_EXCEEDED = 'BENEFICIARY_LIMIT_EXCEEDED',
  BENEFICIARY_SHARE_INVALID = 'BENEFICIARY_SHARE_INVALID',
  BENEFICIARY_SHARES_EXCEED_TOTAL = 'BENEFICIARY_SHARES_EXCEED_TOTAL',

  // Record errors
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  RECORD_ALREADY_SPENT = 'RECORD_ALREADY_SPENT',
  RECORD_DECRYPTION_FAILED = 'RECORD_DECRYPTION_FAILED',
  RECORD_PARSE_ERROR = 'RECORD_PARSE_ERROR',

  // Balance errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_FEE = 'INSUFFICIENT_FEE',
  AMOUNT_TOO_SMALL = 'AMOUNT_TOO_SMALL',
  AMOUNT_EXCEEDS_LOCKED = 'AMOUNT_EXCEEDS_LOCKED',

  // Transaction errors
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  TRANSACTION_PENDING = 'TRANSACTION_PENDING',

  // Merkle/proof errors
  INVALID_MERKLE_PROOF = 'INVALID_MERKLE_PROOF',
  MERKLE_ROOT_MISMATCH = 'MERKLE_ROOT_MISMATCH',
  PROOF_VERIFICATION_FAILED = 'PROOF_VERIFICATION_FAILED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',

  // Validation errors
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_FIELD = 'INVALID_FIELD',
  INVALID_PRIVATE_KEY = 'INVALID_PRIVATE_KEY',
  INVALID_VIEW_KEY = 'INVALID_VIEW_KEY',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_PARAMETER = 'INVALID_PARAMETER',

  // Auth errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_CONNECTION_FAILED = 'WALLET_CONNECTION_FAILED',
  SIGNATURE_REJECTED = 'SIGNATURE_REJECTED',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

/**
 * Human-readable error messages for each error code
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.WILL_NOT_FOUND]: 'Will not found. The specified will ID does not exist on-chain.',
  [ErrorCode.WILL_NOT_ACTIVE]: 'Will is not active. The will has been deactivated or triggered.',
  [ErrorCode.WILL_ALREADY_TRIGGERED]: 'Will has already been triggered. Claims can now be made by beneficiaries.',
  [ErrorCode.WILL_NOT_TRIGGERED]: 'Will has not been triggered yet. Wait for the deadline to pass.',
  [ErrorCode.WILL_ALREADY_EXISTS]: 'A will with this ID already exists.',
  [ErrorCode.WILL_OWNER_MISMATCH]: 'You are not the owner of this will.',
  [ErrorCode.WILL_DEADLINE_NOT_PASSED]: 'The will deadline has not passed yet. Check-in still valid.',
  [ErrorCode.WILL_RECOVERY_THRESHOLD_EXCEEDED]: 'Cannot recover. More than 50% of funds have been claimed.',

  [ErrorCode.BENEFICIARY_NOT_FOUND]: 'Beneficiary not found in this will.',
  [ErrorCode.BENEFICIARY_ALREADY_CLAIMED]: 'This beneficiary has already claimed their inheritance.',
  [ErrorCode.BENEFICIARY_REVOKED]: 'This beneficiary designation has been revoked.',
  [ErrorCode.BENEFICIARY_LIMIT_EXCEEDED]: 'Maximum number of beneficiaries (16) reached.',
  [ErrorCode.BENEFICIARY_SHARE_INVALID]: 'Share percentage must be between 0.01% and 100%.',
  [ErrorCode.BENEFICIARY_SHARES_EXCEED_TOTAL]: 'Total beneficiary shares cannot exceed 100%.',

  [ErrorCode.RECORD_NOT_FOUND]: 'Required record not found. You may need to sync your wallet.',
  [ErrorCode.RECORD_ALREADY_SPENT]: 'This record has already been spent in another transaction.',
  [ErrorCode.RECORD_DECRYPTION_FAILED]: 'Failed to decrypt record. Invalid view key or corrupted data.',
  [ErrorCode.RECORD_PARSE_ERROR]: 'Failed to parse record data. Unexpected format.',

  [ErrorCode.INSUFFICIENT_BALANCE]: 'Insufficient balance to complete this operation.',
  [ErrorCode.INSUFFICIENT_FEE]: 'Insufficient balance to pay transaction fees.',
  [ErrorCode.AMOUNT_TOO_SMALL]: 'Amount is too small. Minimum amount not met.',
  [ErrorCode.AMOUNT_EXCEEDS_LOCKED]: 'Amount exceeds locked funds in the will.',

  [ErrorCode.TRANSACTION_REJECTED]: 'Transaction was rejected by the network.',
  [ErrorCode.TRANSACTION_FAILED]: 'Transaction execution failed.',
  [ErrorCode.TRANSACTION_TIMEOUT]: 'Transaction timed out waiting for confirmation.',
  [ErrorCode.TRANSACTION_NOT_FOUND]: 'Transaction not found on-chain.',
  [ErrorCode.TRANSACTION_PENDING]: 'Transaction is still pending.',

  [ErrorCode.INVALID_MERKLE_PROOF]: 'Invalid Merkle proof. Cannot verify beneficiary.',
  [ErrorCode.MERKLE_ROOT_MISMATCH]: 'Merkle root does not match on-chain commitment.',
  [ErrorCode.PROOF_VERIFICATION_FAILED]: 'Zero-knowledge proof verification failed.',

  [ErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection.',
  [ErrorCode.RPC_ERROR]: 'RPC server error. The node may be unavailable.',
  [ErrorCode.TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait and try again.',

  [ErrorCode.INVALID_ADDRESS]: 'Invalid Aleo address format.',
  [ErrorCode.INVALID_FIELD]: 'Invalid field element format.',
  [ErrorCode.INVALID_PRIVATE_KEY]: 'Invalid private key format.',
  [ErrorCode.INVALID_VIEW_KEY]: 'Invalid view key format.',
  [ErrorCode.INVALID_SIGNATURE]: 'Invalid signature.',
  [ErrorCode.INVALID_PARAMETER]: 'Invalid parameter provided.',

  [ErrorCode.WALLET_NOT_CONNECTED]: 'Wallet not connected. Please connect your wallet first.',
  [ErrorCode.WALLET_CONNECTION_FAILED]: 'Failed to connect to wallet.',
  [ErrorCode.SIGNATURE_REJECTED]: 'Signature request was rejected by the user.',
  [ErrorCode.UNAUTHORIZED]: 'Not authorized to perform this action.',

  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred.',
  [ErrorCode.OPERATION_CANCELLED]: 'Operation was cancelled.',
  [ErrorCode.NOT_IMPLEMENTED]: 'This feature is not yet implemented.',
};

/**
 * Contract error message patterns and their corresponding error codes
 */
const CONTRACT_ERROR_PATTERNS: Array<{ pattern: RegExp; code: ErrorCode }> = [
  { pattern: /will.*not.*found/i, code: ErrorCode.WILL_NOT_FOUND },
  { pattern: /will.*not.*active/i, code: ErrorCode.WILL_NOT_ACTIVE },
  { pattern: /will.*already.*triggered/i, code: ErrorCode.WILL_ALREADY_TRIGGERED },
  { pattern: /not.*owner/i, code: ErrorCode.WILL_OWNER_MISMATCH },
  { pattern: /deadline.*not.*passed/i, code: ErrorCode.WILL_DEADLINE_NOT_PASSED },
  { pattern: /beneficiary.*not.*found/i, code: ErrorCode.BENEFICIARY_NOT_FOUND },
  { pattern: /already.*claimed/i, code: ErrorCode.BENEFICIARY_ALREADY_CLAIMED },
  { pattern: /beneficiary.*revoked/i, code: ErrorCode.BENEFICIARY_REVOKED },
  { pattern: /max.*beneficiar/i, code: ErrorCode.BENEFICIARY_LIMIT_EXCEEDED },
  { pattern: /shares.*exceed/i, code: ErrorCode.BENEFICIARY_SHARES_EXCEED_TOTAL },
  { pattern: /insufficient.*balance/i, code: ErrorCode.INSUFFICIENT_BALANCE },
  { pattern: /insufficient.*fee/i, code: ErrorCode.INSUFFICIENT_FEE },
  { pattern: /record.*not.*found/i, code: ErrorCode.RECORD_NOT_FOUND },
  { pattern: /record.*spent/i, code: ErrorCode.RECORD_ALREADY_SPENT },
  { pattern: /merkle.*invalid/i, code: ErrorCode.INVALID_MERKLE_PROOF },
  { pattern: /proof.*failed/i, code: ErrorCode.PROOF_VERIFICATION_FAILED },
  { pattern: /recovery.*threshold/i, code: ErrorCode.WILL_RECOVERY_THRESHOLD_EXCEEDED },
];

/**
 * Digital Will SDK Error
 *
 * Extended Error class with error codes, detailed messages, and context.
 *
 * @example
 * ```typescript
 * try {
 *   await client.claimInheritance(params);
 * } catch (error) {
 *   if (error instanceof DigitalWillError) {
 *     if (error.code === ErrorCode.BENEFICIARY_ALREADY_CLAIMED) {
 *       console.log('You have already claimed your inheritance');
 *     }
 *   }
 * }
 * ```
 */
export class DigitalWillError extends Error {
  /**
   * Error code for programmatic handling
   */
  readonly code: ErrorCode;

  /**
   * Additional context about the error
   */
  readonly context?: Record<string, unknown>;

  /**
   * Original error if this wraps another error
   */
  override readonly cause?: Error;

  /**
   * Timestamp when the error occurred
   */
  readonly timestamp: Date;

  /**
   * Create a new DigitalWillError
   *
   * @param code - Error code
   * @param message - Optional custom message (defaults to standard message for code)
   * @param context - Optional additional context
   * @param cause - Optional original error
   */
  constructor(
    code: ErrorCode,
    message?: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    const errorMessage = message || ERROR_MESSAGES[code];
    super(errorMessage);

    this.name = 'DigitalWillError';
    this.code = code;
    this.context = context;
    this.cause = cause;
    this.timestamp = new Date();

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DigitalWillError);
    }
  }

  /**
   * Create a DigitalWillError from a contract error message
   *
   * Parses contract error messages to determine the appropriate error code.
   *
   * @param message - Contract error message
   * @param context - Optional additional context
   * @returns DigitalWillError with appropriate code
   */
  static fromContractError(
    message: string,
    context?: Record<string, unknown>
  ): DigitalWillError {
    for (const { pattern, code } of CONTRACT_ERROR_PATTERNS) {
      if (pattern.test(message)) {
        return new DigitalWillError(code, message, context);
      }
    }
    return new DigitalWillError(ErrorCode.UNKNOWN_ERROR, message, context);
  }

  /**
   * Create a DigitalWillError from any error
   *
   * @param error - Any error or unknown value
   * @param context - Optional additional context
   * @returns DigitalWillError
   */
  static from(
    error: unknown,
    context?: Record<string, unknown>
  ): DigitalWillError {
    if (error instanceof DigitalWillError) {
      return error;
    }

    if (error instanceof Error) {
      // Check if it's a contract error
      const contractError = DigitalWillError.fromContractError(error.message, context);
      if (contractError.code !== ErrorCode.UNKNOWN_ERROR) {
        return new DigitalWillError(contractError.code, contractError.message, context, error);
      }

      // Check for network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return new DigitalWillError(ErrorCode.NETWORK_ERROR, error.message, context, error);
      }

      // Check for timeout
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        return new DigitalWillError(ErrorCode.TIMEOUT, error.message, context, error);
      }

      return new DigitalWillError(ErrorCode.UNKNOWN_ERROR, error.message, context, error);
    }

    return new DigitalWillError(
      ErrorCode.UNKNOWN_ERROR,
      String(error),
      context
    );
  }

  /**
   * Create a network error
   */
  static networkError(message: string, context?: Record<string, unknown>): DigitalWillError {
    return new DigitalWillError(ErrorCode.NETWORK_ERROR, message, context);
  }

  /**
   * Create an RPC error
   */
  static rpcError(message: string, context?: Record<string, unknown>): DigitalWillError {
    return new DigitalWillError(ErrorCode.RPC_ERROR, message, context);
  }

  /**
   * Create a validation error
   */
  static validationError(code: ErrorCode, context?: Record<string, unknown>): DigitalWillError {
    return new DigitalWillError(code, undefined, context);
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.RPC_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.RATE_LIMITED,
      ErrorCode.TRANSACTION_TIMEOUT,
    ].includes(this.code);
  }

  /**
   * Check if this error indicates insufficient funds
   */
  isInsufficientFunds(): boolean {
    return [
      ErrorCode.INSUFFICIENT_BALANCE,
      ErrorCode.INSUFFICIENT_FEE,
    ].includes(this.code);
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      cause: this.cause?.message,
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return ERROR_MESSAGES[this.code];
  }
}

/**
 * Type guard to check if an error is a DigitalWillError
 */
export function isDigitalWillError(error: unknown): error is DigitalWillError {
  return error instanceof DigitalWillError;
}

/**
 * Assert that a condition is true, throwing a DigitalWillError if not
 */
export function assertCondition(
  condition: boolean,
  code: ErrorCode,
  context?: Record<string, unknown>
): asserts condition {
  if (!condition) {
    throw new DigitalWillError(code, undefined, context);
  }
}

/**
 * Wrap a function to catch and convert errors to DigitalWillError
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Record<string, unknown>
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw DigitalWillError.from(error, context);
    }
  }) as T;
}
