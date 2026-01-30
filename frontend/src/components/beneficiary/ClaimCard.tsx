'use client';

import { useState, useEffect, useRef } from 'react';
import { Gift, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UIWill, formatCredits, bpsToPercent, WillStatus, AleoAddress } from '@/types';
import { useWill } from '@/hooks/useWill';
import { useToast } from '@/hooks/useToast';
import Input from '@/components/ui/Input';

interface ClaimCardProps {
  will: UIWill;
  beneficiaryAddress: AleoAddress;
  /** Optional: Allow manual share entry when beneficiaries array is empty (e.g., from claim page) */
  allowManualEntry?: boolean;
}

/**
 * Get the localStorage key for claim status persistence
 * Normalizes address to lowercase for consistent lookups
 */
function getClaimStorageKey(willId: string, address: string): string {
  return `claimed_${willId}_${address.toLowerCase()}`;
}

export default function ClaimCard({ will, beneficiaryAddress, allowManualEntry = false }: ClaimCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { claimInheritanceV2 } = useWill();
  const { toast } = useToast();
  // Ref to prevent double-click submission
  const isClaimingRef = useRef(false);
  // Ref to track mounted state and prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Manual share entry for when beneficiaries array is empty
  const [manualSharePercent, setManualSharePercent] = useState<number>(0);

  // Persist claim status to localStorage to survive page refreshes
  // Initialize from localStorage on mount (client-side only)
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;

    // Only run on client side
    if (typeof window !== 'undefined' && will?.willId && beneficiaryAddress) {
      const stored = localStorage.getItem(getClaimStorageKey(will.willId, beneficiaryAddress));
      if (stored === 'true') {
        setClaimed(true);
      }
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [will?.willId, beneficiaryAddress]);

  // Check both owner and beneficiaryAddr fields since BenAllocation records
  // store the beneficiary's address in beneficiaryAddr (owner is the will creator)
  const beneficiary = will.beneficiaries.find(
    (b) =>
      b.owner.toLowerCase() === beneficiaryAddress.toLowerCase() ||
      (b.beneficiaryAddr && b.beneficiaryAddr.toLowerCase() === beneficiaryAddress.toLowerCase())
  );

  // If no beneficiary found and manual entry is NOT allowed, show error
  if (!beneficiary && !allowManualEntry) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-accent-red mx-auto mb-3" />
          <p className="text-text-primary font-medium">No Claim Available</p>
          <p className="text-sm text-text-tertiary mt-2">
            You are not listed as a beneficiary for this will
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine share info - use beneficiary data if available, otherwise use manual entry
  const shareBps = beneficiary?.shareBps ?? Math.round(manualSharePercent * 100);
  const isManualMode = !beneficiary && allowManualEntry;

  // Check if already claimed (only for non-manual mode where we have beneficiary data)
  if (beneficiary && (!beneficiary.isActive || claimed)) {
    return (
      <Card variant="bordered" className="bg-accent-green/10 border-accent-green/20">
        <CardContent className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-accent-green mx-auto mb-3" />
          <p className="text-text-primary font-medium">Assets Claimed</p>
          <p className="text-sm text-text-tertiary mt-2">
            You have successfully claimed your share of the assets
          </p>
        </CardContent>
      </Card>
    );
  }

  // Also check claimed state for manual mode
  if (claimed) {
    return (
      <Card variant="bordered" className="bg-accent-green/10 border-accent-green/20">
        <CardContent className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-accent-green mx-auto mb-3" />
          <p className="text-text-primary font-medium">Assets Claimed</p>
          <p className="text-sm text-text-tertiary mt-2">
            You have successfully claimed your share of the assets
          </p>
        </CardContent>
      </Card>
    );
  }

  const shareAmount = (will.totalLocked * BigInt(shareBps)) / 10000n;
  const sharePercent = bpsToPercent(shareBps);
  // Can only claim if will is triggered AND there's actually something to claim
  // In manual mode, also require a valid share percentage
  const canClaim = will.status === WillStatus.TRIGGERED &&
    shareAmount > 0n &&
    (!isManualMode || manualSharePercent > 0);

  const handleClaim = async () => {
    // Prevent double-click submission
    if (isClaimingRef.current || isLoading) {
      return;
    }
    isClaimingRef.current = true;

    try {
      setIsLoading(true);
      toast.info('Processing Claim', 'Please confirm the transaction in your wallet...');

      // Use claimInheritanceV2 which doesn't require a beneficiary record
      // It uses the on-chain allocation mapping to verify the claim
      const result = await claimInheritanceV2(will.willId, shareBps, shareAmount);

      if (!isMountedRef.current) return;

      if (result?.success) {
        // Persist claim status to localStorage so it survives page refreshes
        if (typeof window !== 'undefined') {
          localStorage.setItem(getClaimStorageKey(will.willId, beneficiaryAddress), 'true');
        }
        setClaimed(true);
        toast.success(
          'Claim Successful',
          `You have successfully claimed ${formatCredits(shareAmount)}`,
          { duration: 6000 }
        );
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim assets. Please try again.';
      toast.error('Claim Failed', errorMessage, { duration: 8000 });
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      isClaimingRef.current = false;
    }
  };

  return (
    <Card variant="bordered">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Your Inheritance Claim</CardTitle>
            <CardDescription>
              {canClaim
                ? 'You can now claim your share of the assets'
                : 'Waiting for will to be triggered'}
            </CardDescription>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg">
            <Gift className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Beneficiary Info - only show if we have beneficiary data */}
          {beneficiary && (
            <div className="p-4 bg-background-tertiary rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-tertiary">Your Name</p>
                  <p className="text-base font-medium text-text-primary mt-1">
                    {beneficiary.displayName || 'Unnamed'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-tertiary">Relationship</p>
                  <p className="text-base font-medium text-text-primary mt-1">
                    {beneficiary.relationship || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Manual share entry when beneficiary data is not available */}
          {isManualMode && (
            <div className="p-4 bg-accent-yellow/10 border border-accent-yellow/20 rounded-lg">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-accent-yellow">
                      Enter Your Share Percentage
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      Beneficiary data is private on-chain. Enter the share percentage the will owner assigned to you.
                      The contract will verify your allocation during the claim transaction.
                    </p>
                  </div>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={manualSharePercent || ''}
                  onChange={(e) => {
                    const val = Math.round(parseFloat(e.target.value) || 0);
                    if (val >= 0 && val <= 100) {
                      setManualSharePercent(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Prevent minus key, 'e' for scientific notation, decimal point (share is whole percent)
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '.') {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (!/^\d+$/.test(pasted.trim())) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Enter your share % (e.g., 25)"
                  label="Your Share Percentage"
                />
              </div>
            </div>
          )}

          {/* Claim Amount */}
          <div className="p-8 bg-gradient-to-br from-primary/10 to-accent-purple/10 border border-primary/20 rounded-xl text-center relative overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
            <p className="text-sm text-text-tertiary mb-4 uppercase tracking-wider font-medium relative">Your Share</p>
            <div className="flex items-center justify-center gap-6 relative">
              <p className="text-5xl font-bold text-primary">{sharePercent.toFixed(0)}%</p>
              <div className="text-left border-l border-border/50 pl-6">
                <p className="text-3xl font-bold text-text-primary tracking-tight">
                  {formatCredits(shareAmount)}
                </p>
                <p className="text-sm text-text-tertiary mt-1">
                  of {formatCredits(will.totalLocked)} total
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          {will.status !== WillStatus.TRIGGERED && (
            <div className="p-4 bg-accent-yellow/10 border border-accent-yellow/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-accent-yellow">
                    Claim Not Yet Available
                  </p>
                  <p className="text-sm text-text-tertiary mt-1">
                    The will must be triggered first. This happens when the owner
                    fails to check in before the deadline passes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Zero Balance Warning */}
          {will.status === WillStatus.TRIGGERED && shareAmount === 0n && (
            <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-accent-red">
                    No Assets to Claim
                  </p>
                  <p className="text-sm text-text-tertiary mt-1">
                    The will has no locked assets available for distribution.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Claim Button */}
          <Button
            onClick={handleClaim}
            isLoading={isLoading}
            disabled={!canClaim}
            size="lg"
            className="w-full gap-2"
          >
            <Gift className="w-5 h-5" />
            {canClaim ? `Claim ${formatCredits(shareAmount)}` : 'Waiting for Trigger'}
          </Button>

        </div>
      </CardContent>
    </Card>
  );
}
