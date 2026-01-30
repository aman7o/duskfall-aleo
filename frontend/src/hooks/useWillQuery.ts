'use client';

/**
 * React Query hooks for Duskfall data fetching
 *
 * Provides optimized data fetching with caching, background refetching,
 * and automatic revalidation for will-related data.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { aleoService, type WillStatusInfo, type BeneficiaryInfo } from '@/services/aleo';

// ============================================
// Query Keys
// ============================================

export const queryKeys = {
  all: ['digitalWill'] as const,
  blockHeight: () => [...queryKeys.all, 'blockHeight'] as const,
  will: (willId: string) => [...queryKeys.all, 'will', willId] as const,
  willStatus: (willId: string) => [...queryKeys.will(willId), 'status'] as const,
  willBeneficiaries: (willId: string) => [...queryKeys.will(willId), 'beneficiaries'] as const,
  willLocked: (willId: string) => [...queryKeys.will(willId), 'locked'] as const,
  userWills: (address: string) => [...queryKeys.all, 'user', address, 'wills'] as const,
  userBeneficiaryStatus: (address: string) => [...queryKeys.all, 'user', address, 'beneficiary'] as const,
};

// ============================================
// Block Height Query
// ============================================

/**
 * Hook to fetch and cache current block height
 *
 * Automatically refetches every 20 seconds to keep UI updated.
 *
 * @example
 * ```tsx
 * const { data: blockHeight, isLoading } = useBlockHeight();
 * ```
 */
export function useBlockHeight(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: queryKeys.blockHeight(),
    queryFn: async () => {
      const height = await aleoService.getLatestBlockHeight();
      return height;
    },
    staleTime: 15_000, // 15 seconds
    refetchInterval: options?.refetchInterval ?? 20_000, // 20 seconds
    enabled: options?.enabled ?? true,
  });
}

// ============================================
// Will Status Query
// ============================================

/**
 * Hook to fetch will status information
 *
 * @param willId - The will identifier
 * @param options - Query options
 *
 * @example
 * ```tsx
 * const { data: status, isLoading, error } = useWillQuery('123field');
 * if (status) {
 *   console.log('Will status:', status.status);
 *   console.log('Blocks until deadline:', status.blocksUntilDeadline);
 * }
 * ```
 */
export function useWillQuery(
  willId: string | null | undefined,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    // Use a unique placeholder key when willId is missing to prevent cache collisions
    queryKey: queryKeys.willStatus(willId ?? '__NO_WILL_ID__'),
    queryFn: async (): Promise<WillStatusInfo | null> => {
      if (!willId) return null;
      // Let errors propagate to React Query for proper error handling and retries
      // React Query will handle retries based on queryClientOptions.retry settings
      const result = await aleoService.getWillStatusInfo(willId);
      return result;
    },
    staleTime: 30_000, // 30 seconds
    refetchInterval: options?.refetchInterval ?? 60_000, // 1 minute
    enabled: !!willId && (options?.enabled ?? true),
  });
}

/**
 * Hook to fetch multiple will statuses at once
 *
 * @param willIds - Array of will identifiers
 */
export function useWillsQuery(willIds: string[]) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...queryKeys.all, 'wills', willIds],
    queryFn: async (): Promise<Map<string, WillStatusInfo>> => {
      const results = new Map<string, WillStatusInfo>();
      const errors: Error[] = [];

      // Fetch in parallel
      await Promise.all(
        willIds.map(async (willId) => {
          try {
            const status = await aleoService.getWillStatusInfo(willId);
            if (status) {
              results.set(willId, status);
              // Also update individual cache
              queryClient.setQueryData(queryKeys.willStatus(willId), status);
            }
          } catch (error) {
            console.error(`Failed to fetch will ${willId}:`, error);
            errors.push(error instanceof Error ? error : new Error(String(error)));
          }
        })
      );

      // If ALL queries failed, propagate the error to React Query
      if (errors.length === willIds.length && willIds.length > 0) {
        throw new Error(`Failed to fetch all ${willIds.length} wills: ${errors[0].message}`);
      }

      return results;
    },
    staleTime: 30_000,
    enabled: willIds.length > 0,
  });
}

// ============================================
// Will Deadline Query
// ============================================

/**
 * Hook to calculate and track will deadline
 *
 * Combines will status with current block height for accurate deadline tracking.
 */
export function useWillDeadline(willId: string | null | undefined) {
  const { data: status, isLoading: statusLoading } = useWillQuery(willId);
  const { data: blockHeight, isLoading: blockLoading } = useBlockHeight();

  const deadline = status && blockHeight
    ? {
        blocksRemaining: status.blocksUntilDeadline,
        estimatedTime: calculateTimeFromBlocks(status.blocksUntilDeadline),
        isPast: status.isOverdue,
        deadline: status.deadline,
        currentBlock: blockHeight,
      }
    : null;

  return {
    data: deadline,
    isLoading: statusLoading || blockLoading,
  };
}

// ============================================
// Beneficiary Queries
// ============================================

/**
 * Hook to check if an address is a beneficiary of a will
 *
 * @param willId - The will identifier
 * @param address - The address to check
 */
export function useBeneficiaryCheck(
  willId: string | null | undefined,
  address: string | null | undefined
) {
  return useQuery({
    // Use unique placeholders to prevent cache collisions when params are missing
    queryKey: [...queryKeys.willBeneficiaries(willId ?? '__NO_WILL_ID__'), address ?? '__NO_ADDRESS__'],
    queryFn: async (): Promise<{
      isBeneficiary: boolean;
      shareBps?: number;
      hasClaimed?: boolean;
    }> => {
      if (!willId || !address) {
        return { isBeneficiary: false };
      }

      try {
        // Note: The contract uses hash(will_id + hash(beneficiary_address)) as the claim key.
        // Since we can't compute BHP256 hashes in JS without the full Aleo SDK/WASM,
        // we cannot directly query the on-chain claim status from the mapping.
        // The contract will reject double claims anyway (finalize_claim line 629).
        //
        // For accurate claim tracking in production:
        // 1. Use an indexer service that tracks claim events
        // 2. Store claims locally after successful transactions
        // 3. Implement BHP256 hash computation via Aleo WASM SDK
        //
        // For now, we return isBeneficiary: false and let the ClaimCard component
        // rely on the beneficiary list from the will records. Double claims are
        // prevented by the smart contract's on-chain validation.
        return { isBeneficiary: false, hasClaimed: false };
      } catch (error) {
        console.error('Failed to check beneficiary status:', error);
        return { isBeneficiary: false };
      }
    },
    staleTime: 60_000, // 1 minute
    enabled: !!willId && !!address,
  });
}

// ============================================
// Transaction Queries
// ============================================

/**
 * Hook to track transaction status
 *
 * @param txId - Transaction ID to track
 */
export function useTransactionQuery(txId: string | null | undefined) {
  return useQuery({
    queryKey: ['transaction', txId],
    queryFn: async () => {
      if (!txId) return null;
      return await aleoService.getTransactionStatus(txId);
    },
    staleTime: 5_000, // 5 seconds
    refetchInterval: (query) => {
      // Stop refetching once finalized
      const tx = query.state.data;
      if (tx && (tx.status === 'confirmed' || tx.status === 'failed')) {
        return false;
      }
      return 5_000; // Check every 5 seconds while pending
    },
    enabled: !!txId,
  });
}

// ============================================
// Prefetching Helpers
// ============================================

/**
 * Hook to prefetch will data
 */
export function usePrefetchWill() {
  const queryClient = useQueryClient();

  return (willId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.willStatus(willId),
      queryFn: () => aleoService.getWillStatusInfo(willId),
      staleTime: 30_000,
    });
  };
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to invalidate will-related queries after mutations
 */
export function useInvalidateWillQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateWill: (willId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.will(willId) });
    },
    invalidateAllWills: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
    invalidateBlockHeight: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blockHeight() });
    },
  };
}

// ============================================
// Optimistic Update Helpers
// ============================================

/**
 * Hook for optimistic updates on will status changes
 */
export function useOptimisticWillUpdate() {
  const queryClient = useQueryClient();

  return {
    /**
     * Optimistically update check-in status
     * @param willId - The will identifier
     * @param newBlockHeight - The current block height (when check-in was submitted)
     */
    optimisticCheckIn: (willId: string, newBlockHeight: bigint) => {
      queryClient.setQueryData<WillStatusInfo | null>(
        queryKeys.willStatus(willId),
        (old) => {
          if (!old) return null;
          // Use checkInPeriod (canonical) for calculation
          const checkInPeriodValue = old.checkInPeriod ?? old.checkinPeriod;
          // Calculate the new deadline: lastCheckIn + checkInPeriod + gracePeriod
          // Cap at u32 max to match Leo contract's safe_deadline calculation
          const rawDeadline = newBlockHeight + checkInPeriodValue + old.gracePeriod;
          const newDeadline = rawDeadline > 4294967295n ? 4294967295n : rawDeadline;
          // blocksUntilDeadline is the full period since we just checked in
          const blocksUntilDeadline = checkInPeriodValue + old.gracePeriod;
          return {
            ...old,
            // Update both canonical (lastCheckIn) and deprecated (lastCheckin) fields
            // to maintain compatibility with any code using either field name
            lastCheckIn: newBlockHeight,
            lastCheckin: newBlockHeight,
            deadline: newDeadline,
            blocksUntilDeadline,
            isOverdue: false,
          };
        }
      );
    },

    /**
     * Rollback optimistic update on error
     */
    rollback: (willId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.willStatus(willId) });
    },
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate estimated time from block count
 */
function calculateTimeFromBlocks(blocks: bigint): {
  days: number;
  hours: number;
  minutes: number;
  totalSeconds: number;
} {
  const BLOCK_TIME_SECONDS = 20; // Aleo uses ~20 second block time (matches contract)
  const totalSeconds = Number(blocks) * BLOCK_TIME_SECONDS;

  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

  return { days, hours, minutes, totalSeconds };
}

// ============================================
// Query Provider Setup
// ============================================

/**
 * Default query client options for Duskfall
 */
export const queryClientOptions = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
};
