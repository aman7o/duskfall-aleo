'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/useToast';
import ClaimCard from '@/components/beneficiary/ClaimCard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { formatAddress, UIWill, WillStatus, blocksToTime } from '@/types';
import { aleoService } from '@/services/aleo';

export default function ClaimPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  // Changed to willId input since the contract uses will_id (field) not owner address
  const [willIdInput, setWillIdInput] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Use local state for the searched will to avoid polluting the global store
  // This prevents confusion when users navigate between claim and dashboard
  const [searchedWill, setSearchedWill] = useState<UIWill | null>(null);
  // Ref to track mounted state and prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Ref to prevent double-click submission
  const isSearchingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isConnected) {
      router.push('/');
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [isConnected, router]);

  // Fetch will status directly without affecting global state
  // Now using will_id (field) instead of owner address
  const fetchWillForClaim = useCallback(async (willId: string) => {
    if (!isMountedRef.current) return;
    setIsLoading(true);
    try {
      // Query the will mappings using the will_id directly
      const willInfo = await aleoService.getWillInfo(willId);

      if (!isMountedRef.current) return;

      if (!willInfo || willInfo.status === null) {
        setSearchedWill(null);
        return;
      }

      const currentBlock = await aleoService.getLatestBlockHeight();

      if (!isMountedRef.current) return;

      // Cap at u32 max to match Leo contract's safe_deadline calculation
      const rawDeadline = willInfo.lastCheckIn + willInfo.checkInPeriod + willInfo.gracePeriod;
      const deadline = rawDeadline > 4294967295n ? 4294967295n : rawDeadline;
      const blocksRemaining = deadline > currentBlock ? deadline - currentBlock : 0n;

      // Build a minimal UIWill for the ClaimCard
      // NOTE: beneficiaries array is empty because we can't fetch private beneficiary data
      // The ClaimCard will need to verify beneficiary status via the claim transaction itself
      const uiWill: UIWill = {
        owner: '', // Owner address is private - not available from chain
        willId: willId, // Use the actual will_id
        checkInPeriod: willInfo.checkInPeriod,
        gracePeriod: willInfo.gracePeriod,
        totalSharesBps: 0,
        numBeneficiaries: 0,
        isActive: willInfo.status === WillStatus.ACTIVE,
        nonce: '0field',
        status: willInfo.status as WillStatus,
        lastCheckIn: willInfo.lastCheckIn,
        deadline,
        blocksRemaining,
        timeRemaining: blocksToTime(blocksRemaining),
        totalLocked: willInfo.totalLocked,
        totalClaimed: willInfo.totalClaimed,
        allocatedPercent: 0,
        unallocatedPercent: 100,
        beneficiaries: [], // Cannot query private beneficiary data from chain
      };

      setSearchedWill(uiWill);
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to fetch will for claim:', error);
      setSearchedWill(null);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleSearch = async () => {
    // Prevent double-click submission
    if (isSearchingRef.current || isLoading) {
      return;
    }
    isSearchingRef.current = true;

    try {
      // Validate will_id format: should end with 'field' and contain only digits before that
      const willIdTrimmed = willIdInput.trim();
      if (!willIdTrimmed) {
        toast.error('Invalid Will ID', 'Please enter a will ID');
        return;
      }
      // Will ID should be a field type (e.g., "12345field")
      if (!willIdTrimmed.endsWith('field')) {
        toast.error('Invalid Will ID Format', 'Will ID must be in field format (e.g., 12345field)');
        return;
      }
      const numericPart = willIdTrimmed.replace('field', '');
      if (!/^\d+$/.test(numericPart)) {
        toast.error('Invalid Will ID Format', 'Will ID must contain only digits before "field"');
        return;
      }

      setHasSearched(true);
      await fetchWillForClaim(willIdTrimmed);
    } finally {
      isSearchingRef.current = false;
    }
  };

  // Alias for ClaimCard compatibility
  const will = searchedWill;

  if (!isConnected) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Claim Your Inheritance
          </h1>
          <p className="text-text-secondary">
            Enter the Will ID to check the will status and claim your share
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter Will ID (e.g., 12345678901234567890field)"
                value={willIdInput}
                onChange={(e) => setWillIdInput(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                isLoading={isLoading}
                className="gap-2"
              >
                <Search className="w-4 h-4" />
                Search
              </Button>
            </div>

            <p className="text-sm text-text-tertiary mt-3">
              Your connected wallet: <span className="font-mono">{address ? formatAddress(address) : 'Not connected'}</span>
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              Ask the will owner for their Will ID (shown in their dashboard)
            </p>
          </CardContent>
        </Card>

        {/* Results */}
        {hasSearched && !isLoading && (
          <>
            {will && address ? (
              <ClaimCard will={will} beneficiaryAddress={address} allowManualEntry />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <svg
                    className="w-12 h-12 text-text-tertiary mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-text-primary font-medium mb-2">
                    No Will Found
                  </p>
                  <p className="text-sm text-text-tertiary">
                    No active will found for this address, or it may not exist yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Info Section */}
        {!hasSearched && (
          <div className="mt-8 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  How to Claim
                </h3>
                <ol className="space-y-2 text-sm text-text-tertiary">
                  <li className="flex gap-2">
                    <span className="text-primary font-medium">1.</span>
                    <span>Connect your Leo Wallet that&apos;s listed as a beneficiary</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-medium">2.</span>
                    <span>Enter the Will ID (ask the will owner for this)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-medium">3.</span>
                    <span>Enter your share percentage as assigned by the will owner</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-medium">4.</span>
                    <span>If the will is triggered and your allocation is valid, you can claim</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  Important Notes
                </h3>
                <ul className="space-y-2 text-sm text-text-tertiary">
                  <li className="flex gap-2">
                    <span className="text-accent-yellow">•</span>
                    <span>You can only claim if the will owner has missed their check-in deadline</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent-yellow">•</span>
                    <span>The Will ID is a number followed by &quot;field&quot; (e.g., 123456789field)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent-yellow">•</span>
                    <span>Your share percentage is verified on-chain - incorrect values will fail</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent-yellow">•</span>
                    <span>Transaction fees apply for the claim transaction on Aleo network</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
