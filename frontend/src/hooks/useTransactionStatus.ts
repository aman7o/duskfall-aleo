'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { aleoService, getExplorerUrl } from '@/services/aleo';

export type TransactionPhase =
  | 'idle'
  | 'signing'
  | 'broadcasting'
  | 'queued'
  | 'processing'
  | 'finalized'
  | 'rejected'
  | 'failed'
  | 'timeout';

export interface TransactionStatusInfo {
  phase: TransactionPhase;
  txId: string | null;
  explorerUrl: string | null;
  blockHeight: number | null;
  error: string | null;
  startTime: number | null;
  elapsedTime: number;
  estimatedTimeRemaining: number | null;
  attempts: number;
}

interface UseTransactionStatusOptions {
  maxAttempts?: number;
  initialInterval?: number;
  maxInterval?: number;
  onStatusChange?: (status: TransactionStatusInfo) => void;
  onFinalized?: (txId: string) => void;
  onError?: (error: string) => void;
}

const DEFAULT_OPTIONS: Required<Omit<UseTransactionStatusOptions, 'onStatusChange' | 'onFinalized' | 'onError'>> = {
  maxAttempts: 90, // 3 minutes with 2-second intervals
  initialInterval: 2000,
  maxInterval: 10000,
};

// Average block time in milliseconds
const AVG_BLOCK_TIME_MS = 20000;

// Estimated phases duration (in milliseconds)
const PHASE_ESTIMATES = {
  signing: 5000,
  broadcasting: 3000,
  queued: 10000,
  processing: 30000,
};

/**
 * Hook for robust transaction status polling
 * Based on art-factory + zkescrow patterns with exponential backoff
 */
export function useTransactionStatus(options: UseTransactionStatusOptions = {}) {
  const {
    maxAttempts = DEFAULT_OPTIONS.maxAttempts,
    initialInterval = DEFAULT_OPTIONS.initialInterval,
    maxInterval = DEFAULT_OPTIONS.maxInterval,
    onStatusChange,
    onFinalized,
    onError,
  } = options;

  const [status, setStatus] = useState<TransactionStatusInfo>({
    phase: 'idle',
    txId: null,
    explorerUrl: null,
    blockHeight: null,
    error: null,
    startTime: null,
    elapsedTime: 0,
    estimatedTimeRemaining: null,
    attempts: 0,
  });

  // FIX: Use refs for callbacks to prevent stale closures in polling and avoid
  // unnecessary re-renders when callback references change
  const onStatusChangeRef = useRef(onStatusChange);
  const onFinalizedRef = useRef(onFinalized);
  const onErrorRef = useRef(onError);

  // Keep refs up to date with latest callback references
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
    onFinalizedRef.current = onFinalized;
    onErrorRef.current = onError;
  }, [onStatusChange, onFinalized, onError]);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef(0);
  const intervalRef = useRef(initialInterval);
  const startTimeRef = useRef<number | null>(null);

  // Update elapsed time
  useEffect(() => {
    if (status.phase === 'idle' || status.phase === 'finalized' || status.phase === 'rejected' || status.phase === 'failed' || status.phase === 'timeout') {
      return;
    }

    const timer = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        setStatus(prev => ({
          ...prev,
          elapsedTime: elapsed,
          estimatedTimeRemaining: calculateEstimatedRemaining(prev.phase, elapsed),
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status.phase]);

  // Notify on status change using ref to prevent stale closures
  useEffect(() => {
    onStatusChangeRef.current?.(status);
  }, [status]);

  const calculateEstimatedRemaining = (phase: TransactionPhase, elapsed: number): number | null => {
    switch (phase) {
      case 'signing':
        return Math.max(0, PHASE_ESTIMATES.signing - elapsed);
      case 'broadcasting':
        return Math.max(0, PHASE_ESTIMATES.broadcasting);
      case 'queued':
        return Math.max(0, PHASE_ESTIMATES.queued + PHASE_ESTIMATES.processing - elapsed);
      case 'processing':
        return Math.max(0, PHASE_ESTIMATES.processing - elapsed);
      default:
        return null;
    }
  };

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    attemptsRef.current = 0;
    intervalRef.current = initialInterval;
    startTimeRef.current = null;
    setStatus({
      phase: 'idle',
      txId: null,
      explorerUrl: null,
      blockHeight: null,
      error: null,
      startTime: null,
      elapsedTime: 0,
      estimatedTimeRemaining: null,
      attempts: 0,
    });
  }, [initialInterval, stopPolling]);

  const startSigning = useCallback(() => {
    reset();
    startTimeRef.current = Date.now();
    setStatus({
      phase: 'signing',
      txId: null,
      explorerUrl: null,
      blockHeight: null,
      error: null,
      startTime: startTimeRef.current,
      elapsedTime: 0,
      estimatedTimeRemaining: PHASE_ESTIMATES.signing,
      attempts: 0,
    });
  }, [reset]);

  const startPolling = useCallback(async (txId: string) => {
    stopPolling();
    attemptsRef.current = 0;
    intervalRef.current = initialInterval;

    const explorerUrl = getExplorerUrl(txId);

    setStatus(prev => ({
      ...prev,
      phase: 'broadcasting',
      txId,
      explorerUrl,
      estimatedTimeRemaining: PHASE_ESTIMATES.broadcasting + PHASE_ESTIMATES.queued + PHASE_ESTIMATES.processing,
    }));

    const poll = async () => {
      attemptsRef.current++;

      try {
        const txStatus = await aleoService.getTransactionStatus(txId);

        if (!txStatus) {
          // Transaction not found yet, continue polling
          setStatus(prev => ({
            ...prev,
            phase: 'broadcasting',
            attempts: attemptsRef.current,
          }));
        } else {
          switch (txStatus.status) {
            case 'pending':
              // Could be queued or processing
              setStatus(prev => ({
                ...prev,
                phase: prev.phase === 'broadcasting' ? 'queued' : 'processing',
                attempts: attemptsRef.current,
              }));
              break;

            case 'confirmed':
              setStatus(prev => ({
                ...prev,
                phase: 'finalized',
                blockHeight: txStatus.blockHeight ?? null,
                attempts: attemptsRef.current,
                estimatedTimeRemaining: null,
              }));
              // FIX: Use ref to avoid stale closure
              onFinalizedRef.current?.(txId);
              return; // Stop polling

            case 'failed':
              setStatus(prev => ({
                ...prev,
                phase: 'failed',
                error: 'Transaction failed on chain',
                attempts: attemptsRef.current,
                estimatedTimeRemaining: null,
              }));
              // FIX: Use ref to avoid stale closure
              onErrorRef.current?.('Transaction failed on chain');
              return; // Stop polling
          }
        }

        // Check if max attempts reached
        if (attemptsRef.current >= maxAttempts) {
          setStatus(prev => ({
            ...prev,
            phase: 'timeout',
            error: 'Transaction polling timeout - check explorer for status',
            attempts: attemptsRef.current,
            estimatedTimeRemaining: null,
          }));
          // FIX: Use ref to avoid stale closure
          onErrorRef.current?.('Transaction polling timeout');
          return; // Stop polling
        }

        // Exponential backoff
        intervalRef.current = Math.min(intervalRef.current * 1.2, maxInterval);
        pollingRef.current = setTimeout(poll, intervalRef.current);
      } catch (error) {
        console.error('Error polling transaction:', error);

        // Continue polling on error, but increase interval
        intervalRef.current = Math.min(intervalRef.current * 1.5, maxInterval);

        if (attemptsRef.current < maxAttempts) {
          pollingRef.current = setTimeout(poll, intervalRef.current);
        } else {
          setStatus(prev => ({
            ...prev,
            phase: 'timeout',
            error: 'Transaction polling failed',
            attempts: attemptsRef.current,
            estimatedTimeRemaining: null,
          }));
          // FIX: Use ref to avoid stale closure
          onErrorRef.current?.('Transaction polling failed');
        }
      }
    };

    // Start polling after initial delay
    pollingRef.current = setTimeout(poll, initialInterval);
    // FIX: Removed onError and onFinalized from deps since we use refs now
  }, [initialInterval, maxAttempts, maxInterval, stopPolling]);

  const setRejected = useCallback((errorMessage: string) => {
    stopPolling();
    setStatus(prev => ({
      ...prev,
      phase: 'rejected',
      error: errorMessage,
      estimatedTimeRemaining: null,
    }));
    // FIX: Use ref to avoid stale closure
    onErrorRef.current?.(errorMessage);
  }, [stopPolling]);

  const setFailed = useCallback((errorMessage: string) => {
    stopPolling();
    setStatus(prev => ({
      ...prev,
      phase: 'failed',
      error: errorMessage,
      estimatedTimeRemaining: null,
    }));
    // FIX: Use ref to avoid stale closure
    onErrorRef.current?.(errorMessage);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    ...status,
    startSigning,
    startPolling,
    setRejected,
    setFailed,
    reset,
    isActive: !['idle', 'finalized', 'rejected', 'failed', 'timeout'].includes(status.phase),
    isSuccess: status.phase === 'finalized',
    isError: ['rejected', 'failed', 'timeout'].includes(status.phase),
  };
}

/**
 * Format elapsed time as human-readable string
 */
export function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Get progress percentage based on phase
 */
export function getProgressPercentage(phase: TransactionPhase): number {
  switch (phase) {
    case 'idle':
      return 0;
    case 'signing':
      return 10;
    case 'broadcasting':
      return 25;
    case 'queued':
      return 40;
    case 'processing':
      return 70;
    case 'finalized':
      return 100;
    case 'rejected':
    case 'failed':
    case 'timeout':
      return 100;
    default:
      return 0;
  }
}
