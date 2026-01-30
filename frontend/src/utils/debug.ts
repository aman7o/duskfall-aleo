/**
 * Debug Logger Utility
 * Comprehensive console logging for debugging runtime errors, async failures,
 * wallet events, transactions, RPC calls, and state changes.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory =
  | 'Wallet'
  | 'TX'
  | 'RPC'
  | 'Will'
  | 'UI'
  | 'Error'
  | 'State';

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: unknown;
}

// Store recent logs for debugging
const LOG_HISTORY_SIZE = 100;
const logHistory: LogEntry[] = [];

// Check if we're in development or debug mode
const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    process.env.NODE_ENV === 'development' ||
    window.localStorage.getItem('debug') === 'true'
  );
};

// Color scheme for different categories
const categoryColors: Record<LogCategory, string> = {
  Wallet: '#10B981', // green
  TX: '#8B5CF6',     // purple
  RPC: '#3B82F6',    // blue
  Will: '#F59E0B',   // amber
  UI: '#EC4899',     // pink
  Error: '#EF4444',  // red
  State: '#6366F1',  // indigo
};

// Level colors
const levelStyles: Record<LogLevel, string> = {
  debug: 'color: #6B7280',
  info: 'color: #3B82F6',
  warn: 'color: #F59E0B',
  error: 'color: #EF4444; font-weight: bold',
};

/**
 * Format log output with styling
 */
function formatLog(
  level: LogLevel,
  category: LogCategory,
  message: string,
  data?: unknown
): void {
  if (!isDebugEnabled() && level === 'debug') return;

  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  const categoryColor = categoryColors[category];
  const prefix = `[${category}]`;

  // Store in history
  const entry: LogEntry = {
    timestamp: new Date(),
    level,
    category,
    message,
    data,
  };
  logHistory.push(entry);
  if (logHistory.length > LOG_HISTORY_SIZE) {
    logHistory.shift();
  }

  // Console output with styling
  const styles = [
    `color: ${categoryColor}; font-weight: bold`,
    levelStyles[level],
  ];

  if (data !== undefined) {
    console[level](
      `%c${prefix}%c ${message}`,
      styles[0],
      styles[1],
      data
    );
  } else {
    console[level](
      `%c${prefix}%c ${message}`,
      styles[0],
      styles[1]
    );
  }
}

/**
 * Main logger object with category-specific methods
 */
export const logger = {
  // Generic log methods
  debug: (category: LogCategory, message: string, data?: unknown) => {
    formatLog('debug', category, message, data);
  },

  info: (category: LogCategory, message: string, data?: unknown) => {
    formatLog('info', category, message, data);
  },

  warn: (category: LogCategory, message: string, data?: unknown) => {
    formatLog('warn', category, message, data);
  },

  error: (category: LogCategory, message: string, data?: unknown) => {
    formatLog('error', category, message, data);
  },

  // Category-specific convenience methods
  wallet: {
    connected: (address: string) => {
      formatLog('info', 'Wallet', 'Connected', { address: truncateAddress(address) });
    },
    disconnected: () => {
      formatLog('info', 'Wallet', 'Disconnected');
    },
    connecting: () => {
      formatLog('debug', 'Wallet', 'Connecting...');
    },
    accountChanged: (address: string) => {
      formatLog('info', 'Wallet', 'Account changed', { address: truncateAddress(address) });
    },
    balanceFetched: (balance: bigint | string) => {
      formatLog('debug', 'Wallet', 'Balance fetched', { balance: String(balance) });
    },
    error: (error: string | Error) => {
      formatLog('error', 'Wallet', 'Error', { error: errorToString(error) });
    },
  },

  tx: {
    creating: (method: string, inputs?: unknown) => {
      formatLog('info', 'TX', `Creating transaction: ${method}`, inputs ? { inputs } : undefined);
    },
    signing: () => {
      formatLog('info', 'TX', 'Signing...');
    },
    broadcasting: (txId: string) => {
      formatLog('info', 'TX', 'Broadcasting', { txId: truncateTxId(txId) });
    },
    confirming: (txId: string) => {
      formatLog('debug', 'TX', 'Confirming', { txId: truncateTxId(txId) });
    },
    confirmed: (txId: string, blockHeight?: number) => {
      formatLog('info', 'TX', 'Confirmed', { txId: truncateTxId(txId), blockHeight });
    },
    failed: (txId: string, reason?: string) => {
      formatLog('error', 'TX', 'Failed', { txId: truncateTxId(txId), reason });
    },
    rejected: (reason?: string) => {
      formatLog('warn', 'TX', 'Rejected by user', reason ? { reason } : undefined);
    },
    timeout: (txId: string) => {
      formatLog('warn', 'TX', 'Timeout - check explorer', { txId: truncateTxId(txId) });
    },
  },

  rpc: {
    request: (method: string, params?: unknown) => {
      formatLog('debug', 'RPC', `Request: ${method}`, params ? { params } : undefined);
    },
    response: (method: string, result?: unknown) => {
      formatLog('debug', 'RPC', `Response: ${method}`, result !== undefined ? { result } : undefined);
    },
    error: (method: string, error: string | Error) => {
      formatLog('error', 'RPC', `Error: ${method}`, { error: errorToString(error) });
    },
    retry: (method: string, attempt: number) => {
      formatLog('warn', 'RPC', `Retry ${attempt}: ${method}`);
    },
    cached: (method: string) => {
      formatLog('debug', 'RPC', `Cache hit: ${method}`);
    },
  },

  will: {
    fetching: (owner: string) => {
      formatLog('info', 'Will', 'Fetching will', { owner: truncateAddress(owner) });
    },
    loaded: (willId: string, status?: string) => {
      formatLog('info', 'Will', 'Will loaded', { willId: truncateField(willId), status });
    },
    notFound: (owner: string) => {
      formatLog('info', 'Will', 'No will found', { owner: truncateAddress(owner) });
    },
    created: (willId: string) => {
      formatLog('info', 'Will', 'Will created', { willId: truncateField(willId) });
    },
    beneficiaryAdded: (address: string, shareBps: number) => {
      formatLog('info', 'Will', 'Beneficiary added', {
        address: truncateAddress(address),
        share: `${shareBps / 100}%`
      });
    },
    deposited: (amount: string) => {
      formatLog('info', 'Will', 'Deposited', { amount });
    },
    withdrawn: (amount: string) => {
      formatLog('info', 'Will', 'Withdrawn', { amount });
    },
    checkedIn: () => {
      formatLog('info', 'Will', 'Checked in');
    },
    triggered: (willId: string) => {
      formatLog('warn', 'Will', 'Will triggered', { willId: truncateField(willId) });
    },
    claimed: (amount: string) => {
      formatLog('info', 'Will', 'Inheritance claimed', { amount });
    },
    error: (action: string, error: string | Error) => {
      formatLog('error', 'Will', `Error: ${action}`, { error: errorToString(error) });
    },
  },

  state: {
    changed: (key: string, value?: unknown) => {
      formatLog('debug', 'State', `${key} changed`, value !== undefined ? { value } : undefined);
    },
    reset: (key: string) => {
      formatLog('debug', 'State', `${key} reset`);
    },
  },

  ui: {
    pageView: (page: string) => {
      formatLog('debug', 'UI', `Page: ${page}`);
    },
    action: (action: string, data?: unknown) => {
      formatLog('debug', 'UI', action, data);
    },
    error: (component: string, error: string | Error) => {
      formatLog('error', 'UI', `Component error: ${component}`, { error: errorToString(error) });
    },
  },

  // Global error logging
  globalError: (error: Error | string, context?: string) => {
    formatLog('error', 'Error', context || 'Unhandled error', {
      error: errorToString(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  },

  unhandledRejection: (reason: unknown) => {
    formatLog('error', 'Error', 'Unhandled promise rejection', {
      reason: reason instanceof Error ? errorToString(reason) : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  },
};

// Helper functions
function truncateAddress(address: string): string {
  if (!address || address.length < 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function truncateTxId(txId: string): string {
  if (!txId || txId.length < 20) return txId;
  return `${txId.slice(0, 8)}...${txId.slice(-6)}`;
}

function truncateField(field: string): string {
  if (!field || field.length < 20) return field;
  // Remove 'field' suffix for display
  const cleanField = field.replace(/field$/, '');
  if (cleanField.length < 20) return field;
  return `${cleanField.slice(0, 8)}...${cleanField.slice(-6)}field`;
}

function errorToString(error: Error | string): string {
  if (typeof error === 'string') return error;
  return error.message || String(error);
}

/**
 * Get log history for debugging
 */
export function getLogHistory(): LogEntry[] {
  return [...logHistory];
}

/**
 * Clear log history
 */
export function clearLogHistory(): void {
  logHistory.length = 0;
}

/**
 * Export logs as JSON string for bug reports
 */
export function exportLogs(): string {
  return JSON.stringify(logHistory, null, 2);
}

/**
 * Enable/disable debug mode
 */
export function setDebugMode(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    if (enabled) {
      window.localStorage.setItem('debug', 'true');
      logger.info('UI', 'Debug mode enabled');
    } else {
      window.localStorage.removeItem('debug');
      console.log('[UI] Debug mode disabled');
    }
  }
}

// Make logger available globally in development
if (typeof window !== 'undefined') {
  (window as unknown as { __digitalWillDebug: typeof logger }).__digitalWillDebug = logger;
  (window as unknown as { __exportLogs: typeof exportLogs }).__exportLogs = exportLogs;
}

export default logger;
