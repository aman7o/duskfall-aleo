'use client';

/**
 * Jotai atoms for Duskfall global state management
 *
 * Provides reactive, atomic state management for UI state
 * that needs to be shared across components.
 */

import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// ============================================
// UI State Atoms
// ============================================

/**
 * Currently open modal
 */
export type ModalType =
  | 'create-will'
  | 'add-beneficiary'
  | 'deposit'
  | 'withdraw'
  | 'check-in'
  | 'trigger'
  | 'claim'
  | 'settings'
  | 'wallet'
  | 'transaction-details'
  | null;

export const modalOpenAtom = atom<ModalType>(null);

/**
 * Modal context data (for passing data to modals)
 */
export const modalContextAtom = atom<Record<string, unknown>>({});

// ============================================
// Transaction Queue
// ============================================

/**
 * Transaction info for queue
 */
export interface QueuedTransaction {
  id: string;
  type: string;
  status: 'pending' | 'signing' | 'broadcasting' | 'confirming' | 'confirmed' | 'failed';
  txId?: string;
  willId?: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export const transactionQueueAtom = atom<QueuedTransaction[]>([]);

/**
 * Add transaction to queue
 */
export const addTransactionAtom = atom(
  null,
  (get, set, transaction: Omit<QueuedTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const queue = get(transactionQueueAtom);
    const newTx: QueuedTransaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set(transactionQueueAtom, [...queue, newTx]);
    return newTx.id;
  }
);

/**
 * Update transaction in queue
 */
export const updateTransactionAtom = atom(
  null,
  (get, set, update: { id: string } & Partial<QueuedTransaction>) => {
    const queue = get(transactionQueueAtom);
    set(
      transactionQueueAtom,
      queue.map((tx) =>
        tx.id === update.id
          ? { ...tx, ...update, updatedAt: Date.now() }
          : tx
      )
    );
  }
);

/**
 * Remove transaction from queue
 */
export const removeTransactionAtom = atom(
  null,
  (get, set, id: string) => {
    const queue = get(transactionQueueAtom);
    set(
      transactionQueueAtom,
      queue.filter((tx) => tx.id !== id)
    );
  }
);

/**
 * Clear completed/failed transactions
 */
export const clearCompletedTransactionsAtom = atom(
  null,
  (get, set) => {
    const queue = get(transactionQueueAtom);
    set(
      transactionQueueAtom,
      queue.filter((tx) => tx.status !== 'confirmed' && tx.status !== 'failed')
    );
  }
);

// ============================================
// Privacy Mode
// ============================================

/**
 * Privacy mode setting
 * - 'standard': Normal privacy (default Aleo privacy)
 * - 'enhanced': Additional privacy features (decoys, delayed reveals)
 */
export type PrivacyMode = 'standard' | 'enhanced';

// SSR-safe storage configuration to prevent hydration mismatch
// During SSR, returns undefined so Jotai uses the default value
// After hydration, reads from localStorage
const createSSRSafeStorage = <T>(): Parameters<typeof atomWithStorage<T>>[2] => ({
  getItem: (key, initialValue) => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return initialValue;
    }
    try {
      return JSON.parse(stored) as T;
    } catch {
      return initialValue;
    }
  },
  setItem: (key, value) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
});

export const privacyModeAtom = atomWithStorage<PrivacyMode>(
  'digitalwill:privacyMode',
  'standard',
  createSSRSafeStorage<PrivacyMode>()
);

// ============================================
// User Preferences
// ============================================

/**
 * User preferences stored in localStorage
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  showBalances: boolean;
  enableNotifications: boolean;
  checkInReminders: boolean;
  reminderDaysBefore: number;
  compactMode: boolean;
  hideEmptyWills: boolean;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  showBalances: true,
  enableNotifications: true,
  checkInReminders: true,
  reminderDaysBefore: 3,
  compactMode: false,
  hideEmptyWills: false,
};

export const userPreferencesAtom = atomWithStorage<UserPreferences>(
  'digitalwill:preferences',
  defaultPreferences,
  createSSRSafeStorage<UserPreferences>()
);

// ============================================
// Notification State
// ============================================

/**
 * Notification item
 */
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  dismissible: boolean;
  duration?: number; // Auto-dismiss after ms (0 = persistent)
  createdAt: number;
}

export const notificationsAtom = atom<Notification[]>([]);

// FIX: Track notification timers to prevent memory leaks when notifications are manually dismissed
const notificationTimers = new Map<string, NodeJS.Timeout>();

/**
 * Add notification
 */
export const addNotificationAtom = atom(
  null,
  (get, set, notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const notifications = get(notificationsAtom);
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: Date.now(),
    };
    set(notificationsAtom, [...notifications, newNotification]);

    // Auto-dismiss after duration with cleanup tracking
    if (notification.duration && notification.duration > 0) {
      const timerId = setTimeout(() => {
        // Clean up timer reference before removing notification
        notificationTimers.delete(newNotification.id);
        set(notificationsAtom, (prev) =>
          prev.filter((n) => n.id !== newNotification.id)
        );
      }, notification.duration);
      notificationTimers.set(newNotification.id, timerId);
    }

    return newNotification.id;
  }
);

/**
 * Remove notification
 */
export const removeNotificationAtom = atom(
  null,
  (get, set, id: string) => {
    // FIX: Clear timer if notification is manually removed before auto-dismiss
    const timerId = notificationTimers.get(id);
    if (timerId) {
      clearTimeout(timerId);
      notificationTimers.delete(id);
    }
    set(notificationsAtom, (prev) => prev.filter((n) => n.id !== id));
  }
);

// ============================================
// Active Will Context
// ============================================

/**
 * Currently selected/active will
 */
export const activeWillIdAtom = atom<string | null>(null);

/**
 * Will being viewed in detail
 */
export const viewingWillIdAtom = atom<string | null>(null);

// ============================================
// Search & Filter State
// ============================================

/**
 * Search query for wills/beneficiaries
 */
export const searchQueryAtom = atom<string>('');

/**
 * Filter options for will list
 */
export interface WillFilters {
  status: 'all' | 'active' | 'triggered' | 'inactive';
  sortBy: 'created' | 'deadline' | 'amount';
  sortOrder: 'asc' | 'desc';
}

export const willFiltersAtom = atom<WillFilters>({
  status: 'all',
  sortBy: 'deadline',
  sortOrder: 'asc',
});

// ============================================
// Network State
// ============================================

/**
 * Network connection status
 */
export type NetworkStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export const networkStatusAtom = atom<NetworkStatus>('connecting');

/**
 * Last known block height (for offline detection)
 */
export const lastBlockHeightAtom = atom<{
  height: number;
  timestamp: number;
} | null>(null);

// ============================================
// Derived Atoms
// ============================================

/**
 * Count of pending transactions
 */
export const pendingTransactionCountAtom = atom((get) => {
  const queue = get(transactionQueueAtom);
  return queue.filter(
    (tx) =>
      tx.status === 'pending' ||
      tx.status === 'signing' ||
      tx.status === 'broadcasting' ||
      tx.status === 'confirming'
  ).length;
});

/**
 * Check if there are any active modals
 */
export const hasActiveModalAtom = atom((get) => get(modalOpenAtom) !== null);

/**
 * Check if there are unread notifications
 */
export const hasUnreadNotificationsAtom = atom((get) => {
  const notifications = get(notificationsAtom);
  return notifications.length > 0;
});

// ============================================
// Convenience Hooks
// ============================================

/**
 * Hook to manage modal state
 */
export function useModal() {
  const [modalType, setModalType] = useAtom(modalOpenAtom);
  const [context, setContext] = useAtom(modalContextAtom);

  return {
    isOpen: modalType !== null,
    modalType,
    context,
    open: (type: ModalType, ctx?: Record<string, unknown>) => {
      setContext(ctx || {});
      setModalType(type);
    },
    close: () => {
      setModalType(null);
      setContext({});
    },
  };
}

/**
 * Hook to manage transaction queue
 */
export function useTransactionQueue() {
  const queue = useAtomValue(transactionQueueAtom);
  const addTransaction = useSetAtom(addTransactionAtom);
  const updateTransaction = useSetAtom(updateTransactionAtom);
  const removeTransaction = useSetAtom(removeTransactionAtom);
  const clearCompleted = useSetAtom(clearCompletedTransactionsAtom);
  const pendingCount = useAtomValue(pendingTransactionCountAtom);

  return {
    queue,
    pendingCount,
    hasPending: pendingCount > 0,
    add: addTransaction,
    update: updateTransaction,
    remove: removeTransaction,
    clearCompleted,
  };
}

/**
 * Hook to manage notifications
 */
export function useNotifications() {
  const notifications = useAtomValue(notificationsAtom);
  const addNotification = useSetAtom(addNotificationAtom);
  const removeNotification = useSetAtom(removeNotificationAtom);
  const hasUnread = useAtomValue(hasUnreadNotificationsAtom);

  return {
    notifications,
    hasUnread,
    add: (notification: Omit<Notification, 'id' | 'createdAt'>) =>
      addNotification(notification),
    remove: removeNotification,
    success: (title: string, message?: string) =>
      addNotification({
        type: 'success',
        title,
        message,
        dismissible: true,
        duration: 5000,
      }),
    error: (title: string, message?: string) =>
      addNotification({
        type: 'error',
        title,
        message,
        dismissible: true,
        duration: 0,
      }),
    info: (title: string, message?: string) =>
      addNotification({
        type: 'info',
        title,
        message,
        dismissible: true,
        duration: 5000,
      }),
    warning: (title: string, message?: string) =>
      addNotification({
        type: 'warning',
        title,
        message,
        dismissible: true,
        duration: 8000,
      }),
  };
}

/**
 * Hook for privacy mode
 */
export function usePrivacyMode() {
  const [mode, setMode] = useAtom(privacyModeAtom);
  return {
    mode,
    isEnhanced: mode === 'enhanced',
    setStandard: () => setMode('standard'),
    setEnhanced: () => setMode('enhanced'),
    toggle: () => setMode(mode === 'standard' ? 'enhanced' : 'standard'),
  };
}
