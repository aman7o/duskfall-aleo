/**
 * Aleo JSON-RPC Client
 * Based on art-factory and ProvableHQ/sdk patterns for reliable blockchain communication
 */

export interface RPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface RPCResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: RPCError;
}

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export type TransactionChainStatus = 'Queued' | 'Processing' | 'Finalized' | 'Rejected' | 'Failed' | 'Unknown';

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 2,  // Reduced from 3 to prevent retry storms
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// Resource exhaustion backoff duration (5 seconds)
const RESOURCE_EXHAUSTION_BACKOFF_MS = 5000;

// Minimum delay before first retry to prevent instant retry storms
const MIN_FIRST_RETRY_DELAY_MS = 1000;

// SDK version header for tracking
const SDK_VERSION = '1.0.0';

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * AleoRPCClient - Robust RPC client for Aleo blockchain
 * Features:
 * - Automatic retry with exponential backoff
 * - Request ID tracking
 * - Response caching with TTL
 * - Verbose error mode for debugging
 * - Custom headers support
 * - Concurrent request limiting to prevent browser resource exhaustion
 * - Resource exhaustion detection with extended backoff
 */
export class AleoRPCClient {
  private readonly baseUrl: string;
  private readonly network: string;
  private requestId: number = 0;
  private readonly retryOptions: RetryOptions;
  private readonly cache: Map<string, CacheEntry<unknown>> = new Map();
  private verbose: boolean = false;

  // Concurrent request limiting
  private static activeRequests: number = 0;
  private static readonly MAX_CONCURRENT_REQUESTS = 6;
  private static requestQueue: Array<() => void> = [];

  // Resource exhaustion tracking
  private static resourceExhaustedUntil: number = 0;

  constructor(
    baseUrl: string = 'https://api.explorer.provable.com/v1',
    network: string = 'testnet',
    retryOptions: Partial<RetryOptions> = {}
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.network = network;
    this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  }

  /**
   * Enable/disable verbose logging
   */
  setVerbose(enabled: boolean): void {
    this.verbose = enabled;
  }

  /**
   * Get next request ID
   */
  private getNextId(): number {
    return ++this.requestId;
  }

  /**
   * Calculate delay for retry attempt
   * Includes random jitter to prevent thundering herd during outage recovery
   */
  private calculateDelay(attempt: number): number {
    const baseDelay = this.retryOptions.baseDelay * Math.pow(this.retryOptions.backoffMultiplier, attempt);
    const cappedDelay = Math.min(baseDelay, this.retryOptions.maxDelay);
    // FIX: Add jitter (±25%) to prevent synchronized retries from multiple clients
    const jitter = cappedDelay * (0.75 + Math.random() * 0.5);
    return Math.floor(jitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error indicates browser resource exhaustion
   * These errors happen when too many concurrent requests exhaust browser sockets
   */
  private isResourceExhaustionError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('err_insufficient_resources') ||
      message.includes('failed to fetch') ||
      message.includes('network error') ||
      message.includes('load failed') ||
      message.includes('networkerror')
    );
  }

  /**
   * Wait for a slot in the concurrent request pool
   * Prevents browser socket exhaustion
   */
  private async acquireRequestSlot(): Promise<void> {
    // Check for global resource exhaustion backoff
    const now = Date.now();
    if (AleoRPCClient.resourceExhaustedUntil > now) {
      const waitTime = AleoRPCClient.resourceExhaustedUntil - now;
      if (this.verbose) {
        console.log(`[RPC] Resource exhaustion backoff: waiting ${waitTime}ms`);
      }
      await this.sleep(waitTime);
    }

    // Wait for available slot if at max concurrent requests
    if (AleoRPCClient.activeRequests >= AleoRPCClient.MAX_CONCURRENT_REQUESTS) {
      await new Promise<void>(resolve => {
        AleoRPCClient.requestQueue.push(resolve);
      });
    }
    AleoRPCClient.activeRequests++;
  }

  /**
   * Release a slot in the concurrent request pool
   */
  private releaseRequestSlot(): void {
    AleoRPCClient.activeRequests--;
    const next = AleoRPCClient.requestQueue.shift();
    if (next) {
      next();
    }
  }

  /**
   * Trigger global resource exhaustion backoff
   */
  private triggerResourceExhaustionBackoff(): void {
    AleoRPCClient.resourceExhaustedUntil = Date.now() + RESOURCE_EXHAUSTION_BACKOFF_MS;
    if (this.verbose) {
      console.warn(`[RPC] Resource exhaustion detected, backing off for ${RESOURCE_EXHAUSTION_BACKOFF_MS}ms`);
    }
  }

  /**
   * Check if cached value is still valid
   * Returns undefined if not cached, allows null values to be cached
   */
  private getCached<T>(key: string): { value: T; hit: true } | { hit: false } {
    const entry = this.cache.get(key);
    if (!entry) return { hit: false };
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return { hit: false };
    }
    return { value: entry.value as T, hit: true };
  }

  /**
   * Set cached value with TTL (in milliseconds)
   */
  private setCache<T>(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Make HTTP request with retry logic
   * Includes concurrency limiting and resource exhaustion detection
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        // Add delay before retries (including minimum delay on first retry)
        if (attempt > 0) {
          const calculatedDelay = this.calculateDelay(attempt - 1);
          // Ensure minimum delay on first retry to prevent instant retry storms
          const delay = Math.max(calculatedDelay, MIN_FIRST_RETRY_DELAY_MS);
          if (this.verbose) {
            console.log(`[RPC] Retry attempt ${attempt} after ${delay}ms delay`);
          }
          await this.sleep(delay);
        }

        // Wait for available request slot (concurrency limiting)
        await this.acquireRequestSlot();

        try {
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'X-Aleo-SDK-Version': SDK_VERSION,
            ...options.headers,
          };

          const response = await fetch(url, {
            ...options,
            headers,
          });

          // Don't retry on client errors (4xx), only on server errors (5xx) and network issues
          if (response.status >= 400 && response.status < 500) {
            return response;
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return response;
        } finally {
          this.releaseRequestSlot();
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check for resource exhaustion errors and trigger global backoff
        if (this.isResourceExhaustionError(lastError)) {
          this.triggerResourceExhaustionBackoff();
          // Don't log every resource exhaustion error to avoid console spam
          if (attempt === 0 && this.verbose) {
            console.warn(`[RPC] Resource exhaustion on ${url}`);
          }
        } else if (this.verbose) {
          console.error(`[RPC] Request failed (attempt ${attempt + 1}):`, lastError.message);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Get the latest block height
   * Cached for 5 seconds
   */
  async getHeight(): Promise<number> {
    const cacheKey = 'height';
    const cached = this.getCached<number>(cacheKey);
    if (cached.hit) {
      return cached.value;
    }

    const url = `${this.baseUrl}/${this.network}/latest/height`;
    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      throw new Error(`Failed to get block height: ${response.status}`);
    }

    const height = parseInt(await response.text(), 10);
    this.setCache(cacheKey, height, 5000); // 5 second TTL
    return height;
  }

  /**
   * Get program source code
   */
  async getProgram(programId: string): Promise<string> {
    const cacheKey = `program:${programId}`;
    const cached = this.getCached<string>(cacheKey);
    if (cached.hit) {
      return cached.value;
    }

    const url = `${this.baseUrl}/${this.network}/program/${programId}`;
    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Program not found: ${programId}`);
      }
      throw new Error(`Failed to get program: ${response.status}`);
    }

    const program = await response.text();
    this.setCache(cacheKey, program, 60000); // 1 minute TTL for program source
    return program;
  }

  /**
   * Get mapping value
   */
  async getMappingValue(
    programId: string,
    mappingName: string,
    key: string
  ): Promise<string | null> {
    const cacheKey = `mapping:${programId}:${mappingName}:${key}`;
    const cached = this.getCached<string | null>(cacheKey);
    if (cached.hit) {
      return cached.value;
    }

    const url = `${this.baseUrl}/${this.network}/program/${programId}/mapping/${mappingName}/${key}`;

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        if (response.status === 404) {
          // Cache null for non-existent mappings to avoid repeated requests
          this.setCache(cacheKey, null, 10000); // 10 second TTL
          return null;
        }
        throw new Error(`Failed to get mapping value: ${response.status}`);
      }

      const value = await response.text();
      // Short TTL for mapping values as they can change
      this.setCache(cacheKey, value, 10000); // 10 second TTL
      return value;
    } catch (error) {
      if (this.verbose) {
        console.error(`[RPC] getMappingValue error:`, error);
      }
      // FIX: Propagate network errors instead of returning null
      // This allows callers to distinguish between "key not found" and "network error"
      // Network errors should be retried or shown to user, not silently ignored
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(txId: string): Promise<Record<string, unknown> | null> {
    const url = `${this.baseUrl}/${this.network}/transaction/${txId}`;

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get transaction: ${response.status}`);
      }

      // Parse JSON safely - API might return non-JSON on error
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (parseError) {
        if (this.verbose) {
          console.error(`[RPC] getTransaction JSON parse error:`, parseError, 'Response:', text.substring(0, 200));
        }
        return null;
      }
    } catch (error) {
      if (this.verbose) {
        console.error(`[RPC] getTransaction error:`, error);
      }
      return null;
    }
  }

  /**
   * Get transaction status
   * Returns: 'Queued' | 'Processing' | 'Finalized' | 'Rejected' | 'Failed' | 'Unknown'
   */
  async getTransactionStatus(txId: string): Promise<TransactionChainStatus> {
    try {
      const tx = await this.getTransaction(txId);

      if (!tx) {
        return 'Unknown';
      }

      // Check transaction type and status
      const type = tx.type as string;

      if (type === 'accepted' || tx.status === 'accepted') {
        return 'Finalized';
      }

      if (type === 'rejected' || tx.status === 'rejected') {
        return 'Rejected';
      }

      // Check if transaction has a block height (confirmed)
      if (tx.block_height || tx.blockHeight) {
        return 'Finalized';
      }

      // If transaction exists but not confirmed, it's processing
      return 'Processing';
    } catch (error) {
      if (this.verbose) {
        console.error(`[RPC] getTransactionStatus error:`, error);
      }
      return 'Unknown';
    }
  }

  /**
   * Check if program exists
   */
  async programExists(programId: string): Promise<boolean> {
    const url = `${this.baseUrl}/${this.network}/program/${programId}`;

    try {
      const response = await this.fetchWithRetry(url);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get multiple mapping values in parallel
   */
  async getMappingValues(
    programId: string,
    mappingName: string,
    keys: string[]
  ): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();

    const promises = keys.map(async (key) => {
      const value = await this.getMappingValue(programId, mappingName, key);
      results.set(key, value);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get block by height
   */
  async getBlock(height: number): Promise<Record<string, unknown> | null> {
    const url = `${this.baseUrl}/${this.network}/block/${height}`;

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get block: ${response.status}`);
      }

      // Parse JSON safely - API might return non-JSON on error
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (parseError) {
        if (this.verbose) {
          console.error(`[RPC] getBlock JSON parse error:`, parseError, 'Response:', text.substring(0, 200));
        }
        return null;
      }
    } catch (error) {
      if (this.verbose) {
        console.error(`[RPC] getBlock error:`, error);
      }
      return null;
    }
  }

  /**
   * Get the base URL being used
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the network being used
   */
  getNetwork(): string {
    return this.network;
  }
}

// Default singleton instance for testnet - uses config URL
import { RPC_URL } from '@/constants/config';
export const aleoRPC = new AleoRPCClient(RPC_URL, 'testnet');

// Export factory function for custom configurations
export function createRPCClient(
  baseUrl?: string,
  network?: string,
  retryOptions?: Partial<RetryOptions>
): AleoRPCClient {
  return new AleoRPCClient(baseUrl, network, retryOptions);
}
