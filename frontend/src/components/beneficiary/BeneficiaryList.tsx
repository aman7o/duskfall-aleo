'use client';

import { useState, useRef } from 'react';
import { User, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UIBeneficiary, formatAddress, formatCredits, bpsToPercent, WillStatus } from '@/types';
import { useWill } from '@/hooks/useWill';
import { useToast } from '@/hooks/useToast';

interface BeneficiaryListProps {
  beneficiaries: UIBeneficiary[];
  totalLocked: bigint;
  willStatus?: WillStatus;
  onRevoke?: (beneficiary: UIBeneficiary) => void;
}

export default function BeneficiaryList({ beneficiaries, totalLocked, willStatus, onRevoke }: BeneficiaryListProps) {
  const { removeBeneficiary, isLoading } = useWill();
  const { toast } = useToast();
  const [revokingAddress, setRevokingAddress] = useState<string | null>(null);
  // Ref to prevent double-click submission before revokingAddress state updates
  const isRevokingRef = useRef(false);

  const canRevoke = willStatus === WillStatus.ACTIVE;

  const handleRevoke = async (beneficiary: UIBeneficiary) => {
    // Prevent double-click submission
    if (isRevokingRef.current || isLoading || revokingAddress) {
      return;
    }

    if (!canRevoke) {
      toast.error('Cannot Revoke', 'Can only revoke beneficiaries while will is active');
      return;
    }

    isRevokingRef.current = true;
    try {
      setRevokingAddress(beneficiary.owner);
      toast.info('Revoking Beneficiary', 'Please confirm the transaction in your wallet...');
      await removeBeneficiary(beneficiary.owner);
      toast.success('Beneficiary Revoked', `${beneficiary.displayName || 'Beneficiary'} has been removed`);
      onRevoke?.(beneficiary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke beneficiary';
      toast.error('Revocation Failed', errorMessage, { duration: 8000 });
    } finally {
      setRevokingAddress(null);
      isRevokingRef.current = false;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Beneficiaries</CardTitle>
      </CardHeader>
      <CardContent>
        {beneficiaries.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-tertiary">No beneficiaries added yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {beneficiaries.map((beneficiary, index) => {
              // Guard against invalid shareBps values (NaN, negative, out of range)
              const rawBps = Number(beneficiary.shareBps);
              const safeBps = Number.isNaN(rawBps) ? 0 : Math.max(0, Math.min(10000, Math.floor(rawBps)));
              const shareAmount = (totalLocked * BigInt(safeBps)) / 10000n;
              const sharePercent = bpsToPercent(safeBps);

              return (
                <div
                  key={`${beneficiary.owner}-${index}`}
                  className="p-5 bg-background-tertiary border border-border rounded-xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-text-primary">
                            {beneficiary.displayName || 'Unnamed'}
                          </p>
                          {!beneficiary.isActive && (
                            <CheckCircle className="w-4 h-4 text-accent-green" />
                          )}
                        </div>
                        <p className="text-sm text-text-tertiary font-mono truncate mt-1">
                          {formatAddress(beneficiary.owner)}
                        </p>
                        {beneficiary.relationship && (
                          <p className="text-xs text-text-tertiary mt-2 px-2 py-1 bg-background-secondary rounded-md inline-block">
                            {beneficiary.relationship}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-primary">
                        {sharePercent.toFixed(0)}%
                      </p>
                      <p className="text-sm text-text-tertiary font-medium">
                        {formatCredits(shareAmount)}
                      </p>
                      {beneficiary.isActive ? (
                        <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-accent-yellow/10 text-accent-yellow text-xs font-medium rounded-full border border-accent-yellow/20">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-accent-green/10 text-accent-green text-xs font-medium rounded-full border border-accent-green/20">
                          <CheckCircle className="w-3 h-3" />
                          Claimed
                        </span>
                      )}
                      {/* Revoke Button - only for active beneficiaries when will is active */}
                      {canRevoke && beneficiary.isActive && (
                        <button
                          onClick={() => handleRevoke(beneficiary)}
                          disabled={isLoading || revokingAddress === beneficiary.owner}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-accent-red hover:bg-accent-red/10 text-xs font-medium rounded-full border border-accent-red/20 transition-colors disabled:opacity-50"
                        >
                          {revokingAddress === beneficiary.owner ? (
                            <span className="w-3 h-3 border-2 border-accent-red border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
