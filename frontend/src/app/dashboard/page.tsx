'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Coins, ArrowDownToLine, AlertTriangle, Minus, Pause, Play, Shield, LifeBuoy, Eye, EyeOff, Lock } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useWill } from '@/hooks/useWill';
import { useToast } from '@/hooks/useToast';
import WillCard from '@/components/will/WillCard';
import CheckInButton from '@/components/will/CheckInButton';
import CountdownTimer from '@/components/will/CountdownTimer';
import BeneficiaryList from '@/components/beneficiary/BeneficiaryList';
import AddBeneficiaryForm from '@/components/beneficiary/AddBeneficiaryForm';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { WillCardSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { PrivacyStatusCard, PrivacyBadge } from '@/components/privacy/PrivacyBadge';
import ZKProofExplainer from '@/components/privacy/ZKProofExplainer';
import SelectiveDisclosure from '@/components/privacy/SelectiveDisclosure';
import {
  formatCredits,
  blocksToTime,
  blocksToDays,
  STATUS_LABELS,
  WillStatus,
} from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const { will, fetchWill, isLoading, error, deposit, depositPublic, withdraw, triggerWill, deactivateWill, reactivateWill, emergencyRecovery, cancelActiveTransaction } = useWill();
  const { toast } = useToast();
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isPublicDeposit, setIsPublicDeposit] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  // Ref to track mounted state and prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Check if will can be triggered (deadline passed)
  const canTrigger = will && will.status === WillStatus.ACTIVE && will.blocksRemaining === 0n;

  // Refs to prevent double-click submission before isProcessing state updates
  const isDepositingRef = useRef(false);
  const isWithdrawingRef = useRef(false);
  const isTriggeringRef = useRef(false);
  const isDeactivatingRef = useRef(false);
  const isReactivatingRef = useRef(false);
  const isRecoveringRef = useRef(false);

  const handleDeposit = async () => {
    // Prevent double-click submission
    if (isDepositingRef.current || isProcessing) {
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid deposit amount');
      return;
    }

    isDepositingRef.current = true;
    try {
      setIsProcessing(true);
      toast.info('Processing Deposit', 'Please confirm the transaction in your wallet...');

      if (isPublicDeposit) {
        await depositPublic(depositAmount);
      } else {
        await deposit(depositAmount);
      }

      if (!isMountedRef.current) return;
      setShowDepositModal(false);
      setDepositAmount('');
      setIsPublicDeposit(true);  // Reset to default (Public is recommended)
      toast.success(
        'Deposit Successful',
        `Successfully deposited ${depositAmount} ALEO to your will`,
        { duration: 5000 }
      );
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit';
      toast.error('Deposit Failed', errorMessage, { duration: 8000 });
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
      isDepositingRef.current = false;
    }
  };

  const handleWithdraw = async () => {
    // Prevent double-click submission
    if (isWithdrawingRef.current || isProcessing) {
      return;
    }

    if (!will) return;

    isWithdrawingRef.current = true;
    try {
      setIsProcessing(true);
      toast.info('Processing Withdrawal', 'Please confirm the transaction in your wallet...');
      await withdraw();
      if (!isMountedRef.current) return;
      setShowWithdrawModal(false);
      toast.success(
        'Withdrawal Successful',
        `Successfully withdrew ${formatCredits(will.totalLocked)}`,
        { duration: 5000 }
      );
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw';
      toast.error('Withdrawal Failed', errorMessage, { duration: 8000 });
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
      isWithdrawingRef.current = false;
    }
  };

  const handleTriggerWill = async () => {
    // Prevent double-click submission
    if (isTriggeringRef.current || isProcessing) {
      return;
    }

    if (!will || !canTrigger) return;

    isTriggeringRef.current = true;
    try {
      setIsProcessing(true);
      toast.info('Triggering Will', 'Please confirm the transaction in your wallet...');
      await triggerWill(will.willId, will.totalLocked);
      if (!isMountedRef.current) return;
      toast.success(
        'Will Triggered Successfully',
        'The will has been triggered. Beneficiaries can now claim their inheritance.',
        { duration: 6000 }
      );
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger will';
      toast.error('Trigger Failed', errorMessage, { duration: 8000 });
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
      isTriggeringRef.current = false;
    }
  };

  const handleDeactivateWill = async () => {
    // Prevent double-click submission
    if (isDeactivatingRef.current || isProcessing) {
      return;
    }

    if (!will || will.status !== WillStatus.ACTIVE) return;

    isDeactivatingRef.current = true;
    try {
      setIsProcessing(true);
      toast.info('Deactivating Will', 'Please confirm the transaction in your wallet...');
      await deactivateWill();
      if (!isMountedRef.current) return;
      toast.success(
        'Will Deactivated',
        'Your will has been paused. Reactivate it when ready.',
        { duration: 5000 }
      );
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate will';
      toast.error('Deactivation Failed', errorMessage, { duration: 8000 });
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
      isDeactivatingRef.current = false;
    }
  };

  const handleReactivateWill = async () => {
    // Prevent double-click submission
    if (isReactivatingRef.current || isProcessing) {
      return;
    }

    if (!will || will.status !== WillStatus.INACTIVE) return;

    isReactivatingRef.current = true;
    try {
      setIsProcessing(true);
      toast.info('Reactivating Will', 'Please confirm the transaction in your wallet...');
      await reactivateWill();
      if (!isMountedRef.current) return;
      toast.success(
        'Will Reactivated',
        'Your will is now active again. Check-in timer has been reset.',
        { duration: 5000 }
      );
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to reactivate will';
      toast.error('Reactivation Failed', errorMessage, { duration: 8000 });
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
      isReactivatingRef.current = false;
    }
  };

  const handleEmergencyRecovery = async () => {
    // Prevent double-click submission
    if (isRecoveringRef.current || isProcessing) {
      return;
    }

    if (!will || will.status !== WillStatus.TRIGGERED) return;

    const halfLocked = will.totalLocked / 2n;
    if (will.totalClaimed >= halfLocked) {
      toast.error('Cannot Recover', 'More than 50% has been claimed. Emergency recovery not available.');
      return;
    }

    isRecoveringRef.current = true;
    try {
      setIsProcessing(true);
      toast.info('Emergency Recovery', 'Please confirm the transaction in your wallet...');
      await emergencyRecovery();
      if (!isMountedRef.current) return;
      toast.success(
        'Will Recovered Successfully',
        'Your will has been recovered and reactivated.',
        { duration: 6000 }
      );
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to recover will';
      toast.error('Recovery Failed', errorMessage, { duration: 8000 });
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
      isRecoveringRef.current = false;
    }
  };

  // Check if emergency recovery is available
  const canRecover = will && will.status === WillStatus.TRIGGERED && will.totalClaimed < will.totalLocked / 2n;

  useEffect(() => {
    isMountedRef.current = true;

    if (!isConnected) {
      router.push('/');
      return;
    }

    if (address) {
      // Fetch will data - the async function handles its own loading states
      // We use isMountedRef to prevent navigation after unmount
      fetchWill(address).catch((err) => {
        // Only log if still mounted to avoid noise from cancelled fetches
        if (isMountedRef.current) {
          console.error('Failed to fetch will:', err);
        }
      });
    }

    return () => {
      isMountedRef.current = false;
      // Cancel any active transaction polling when component unmounts
      cancelActiveTransaction();
    };
    // fetchWill uses stable Zustand setters, we only want to refetch on address/connection change
    // cancelActiveTransaction is excluded because it's a closure that gets a new reference each render,
    // but we only need it for cleanup - the latest version will be called at unmount time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="h-10 w-48 bg-background-tertiary rounded animate-pulse mb-2" />
              <div className="h-5 w-64 bg-background-tertiary rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <WillCardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!will) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <Card>
            <CardContent className="py-12">
              <div className="w-16 h-16 bg-background-tertiary rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">
                No Will Found
              </h2>
              <p className="text-text-tertiary mb-6">
                You haven&apos;t created a will yet. Get started to protect your Aleo assets.
              </p>
              <Button onClick={() => router.push('/create')} size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Create Your Will
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
              Dashboard
            </h1>
            <p className="text-text-secondary">
              Manage your will and beneficiaries on Aleo Testnet
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
            <p className="text-sm text-accent-red">{error}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Will Status Card */}
          <WillCard will={will} />

          {/* Onboarding Card - shown for new wills with no beneficiaries or deposits */}
          {will.numBeneficiaries === 0 && will.totalLocked === 0n && (
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-primary mb-2">
                      Complete Your Will Setup
                    </h3>
                    <p className="text-sm text-text-tertiary mb-4">
                      Your will has been created on the Aleo blockchain. Complete these steps to protect your assets:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-accent-yellow/20 flex items-center justify-center text-xs font-bold text-accent-yellow">1</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text-primary">Add Beneficiaries</p>
                          <p className="text-xs text-text-tertiary">Specify who should receive your assets</p>
                        </div>
                        <Button size="sm" onClick={() => setShowAddBeneficiary(true)} className="gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </Button>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-accent-yellow/20 flex items-center justify-center text-xs font-bold text-accent-yellow">2</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text-primary">Deposit ALEO</p>
                          <p className="text-xs text-text-tertiary">Fund your will with credits to distribute</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setShowDepositModal(true)} className="gap-1.5">
                          <Coins className="w-3.5 h-3.5" />
                          Deposit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Check-In Button */}
          <CheckInButton />

          {/* Countdown Timer */}
          <CountdownTimer deadline={will.deadline} blocksRemaining={will.blocksRemaining} />

          {/* Will Details */}
          <Card>
            <CardHeader>
              <CardTitle>Will Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-text-tertiary">Check-In Period</span>
                  <span className="text-sm font-medium text-text-primary">
                    {blocksToDays(will.checkInPeriod).toFixed(0)} days
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-text-tertiary">Grace Period</span>
                  <span className="text-sm font-medium text-text-primary">
                    {blocksToDays(will.gracePeriod).toFixed(0)} days
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-text-tertiary">Last Check-In</span>
                  <span className="text-sm font-medium text-text-primary">
                    Block #{will.lastCheckIn.toString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-text-tertiary">Will ID</span>
                  <span className="text-sm font-mono text-text-primary truncate max-w-[200px]">
                    {will.willId.slice(0, 20)}...
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Assets Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Locked Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Coins className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Aleo Credits
                      </p>
                      <p className="text-xs text-text-tertiary">
                        ALEO
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-text-primary">
                    {formatCredits(will.totalLocked)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => setShowDepositModal(true)}
                    disabled={will.status !== WillStatus.ACTIVE}
                  >
                    <Plus className="w-4 h-4" />
                    Deposit
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={will.status !== WillStatus.ACTIVE || will.totalLocked === 0n}
                  >
                    <Minus className="w-4 h-4" />
                    Withdraw
                  </Button>
                </div>

                {/* Trigger Will Button - shown when deadline has passed */}
                {canTrigger && (
                  <div className="mt-4 p-3 bg-accent-yellow/10 border border-accent-yellow/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-accent-yellow">
                          Deadline Passed
                        </p>
                        <p className="text-xs text-text-tertiary mt-1">
                          The check-in deadline has passed. Anyone can trigger this will to enable beneficiary claims and earn a 0.1% bounty.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-2 border-accent-yellow text-accent-yellow hover:bg-accent-yellow/10"
                          onClick={handleTriggerWill}
                          isLoading={isProcessing}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Trigger Will
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Statistics</CardTitle>
                <PrivacyBadge level="fully-private" size="sm" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-tertiary">Total Locked</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCredits(will.totalLocked)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-tertiary">Shares Allocated</span>
                  <span className="text-lg font-bold text-text-primary">
                    {(will.totalSharesBps / 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-tertiary">Beneficiaries</span>
                  <span className="text-lg font-bold text-text-primary">
                    {will.numBeneficiaries}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-tertiary">Status</span>
                  <span className={`text-sm font-medium ${
                    will.status === WillStatus.ACTIVE ? 'text-accent-green' :
                    will.status === WillStatus.TRIGGERED ? 'text-accent-red' :
                    'text-text-tertiary'
                  }`}>
                    {STATUS_LABELS[will.status]}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Status */}
          <PrivacyStatusCard
            features={{
              beneficiaryPrivacy: true,
              selectiveDisclosure: true,
              publicVerification: true,
              encryptedSecrets: will.numBeneficiaries > 0,
              hashCommitments: true,
            }}
          />

          {/* Will Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Will Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {will.status === WillStatus.ACTIVE && (
                  <div className="p-3 bg-background-tertiary rounded-lg">
                    <div className="flex items-start gap-3">
                      <Pause className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary">Pause Will</p>
                        <p className="text-xs text-text-tertiary mt-1">
                          Temporarily deactivate your will. The deadline timer will stop.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-2"
                          onClick={handleDeactivateWill}
                          isLoading={isProcessing}
                        >
                          <Pause className="w-4 h-4" />
                          Deactivate
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {will.status === WillStatus.INACTIVE && (
                  <div className="p-3 bg-accent-green/10 border border-accent-green/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Play className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-accent-green">Will Paused</p>
                        <p className="text-xs text-text-tertiary mt-1">
                          Your will is currently inactive. Reactivate to resume the check-in timer.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-2 border-accent-green text-accent-green hover:bg-accent-green/10"
                          onClick={handleReactivateWill}
                          isLoading={isProcessing}
                        >
                          <Play className="w-4 h-4" />
                          Reactivate
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {will.status === WillStatus.TRIGGERED && (
                  <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-accent-red">Will Triggered</p>
                        <p className="text-xs text-text-tertiary mt-1">
                          Your will has been triggered. Beneficiaries can now claim their inheritance.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Recovery - shown when will is triggered and less than 50% claimed */}
                {canRecover && (
                  <div className="p-3 bg-accent-yellow/10 border border-accent-yellow/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <LifeBuoy className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-accent-yellow">Emergency Recovery Available</p>
                        <p className="text-xs text-text-tertiary mt-1">
                          Less than 50% of your assets have been claimed. You can recover your will and remaining funds.
                        </p>
                        <div className="mt-2 text-xs text-text-tertiary">
                          <p>Claimed: {formatCredits(will.totalClaimed)} / {formatCredits(will.totalLocked)}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-2 border-accent-yellow text-accent-yellow hover:bg-accent-yellow/10"
                          onClick={handleEmergencyRecovery}
                          isLoading={isProcessing}
                        >
                          <LifeBuoy className="w-4 h-4" />
                          Recover Will
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Beneficiaries - Full Width */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-text-primary">Beneficiaries</h2>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-accent-green/10 rounded-full">
              <EyeOff className="w-3.5 h-3.5 text-accent-green" />
              <span className="text-xs text-accent-green font-medium">Private</span>
            </div>
          </div>
          <Button
            onClick={() => setShowAddBeneficiary(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Beneficiary
          </Button>
        </div>
        <BeneficiaryList
          beneficiaries={will.beneficiaries}
          totalLocked={will.totalLocked}
          willStatus={will.status}
        />
      </div>

      {/* Privacy & ZK Section */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ZK Proof Explainer */}
        <ZKProofExplainer />

        {/* Selective Disclosure */}
        <SelectiveDisclosure
          willId={will.willId}
          ownerAddress={address || ''}
        />
      </div>

      {/* What Others Can See - Transparency Section */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-blue/10 rounded-lg">
                <Eye className="w-5 h-5 text-accent-blue" />
              </div>
              <div>
                <CardTitle>What Others Can See</CardTitle>
                <p className="text-xs text-text-tertiary mt-1">Public on-chain data about your will</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-background-tertiary rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-accent-blue" />
                  <span className="text-xs font-medium text-accent-blue">PUBLIC</span>
                </div>
                <p className="text-sm font-medium text-text-primary">Will Status</p>
                <p className="text-lg font-bold text-text-primary mt-1">
                  {STATUS_LABELS[will.status]}
                </p>
              </div>

              <div className="p-4 bg-background-tertiary rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-accent-blue" />
                  <span className="text-xs font-medium text-accent-blue">PUBLIC</span>
                </div>
                <p className="text-sm font-medium text-text-primary">Last Check-In</p>
                <p className="text-lg font-bold text-text-primary mt-1">
                  Block #{will.lastCheckIn.toString().slice(0, 8)}...
                </p>
              </div>

              <div className="p-4 bg-background-tertiary rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-accent-blue" />
                  <span className="text-xs font-medium text-accent-blue">PUBLIC</span>
                </div>
                <p className="text-sm font-medium text-text-primary">Total Locked</p>
                <p className="text-lg font-bold text-text-primary mt-1">
                  {formatCredits(will.totalLocked)}
                </p>
              </div>

              <div className="p-4 bg-accent-green/5 border border-accent-green/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-accent-green" />
                  <span className="text-xs font-medium text-accent-green">PRIVATE</span>
                </div>
                <p className="text-sm font-medium text-text-primary">Beneficiaries</p>
                <p className="text-lg font-bold text-accent-green mt-1">
                  Hidden On-Chain
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-background-tertiary rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Privacy Guarantee</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Your beneficiaries&apos; identities and their allocations are encrypted on-chain.
                    Only you can see the full details. When triggered, beneficiaries can claim
                    their share using ZK proofs without revealing their identity to others.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Beneficiary Modal */}
      <AddBeneficiaryForm
        isOpen={showAddBeneficiary}
        onClose={() => setShowAddBeneficiary(false)}
        currentSharesBps={will.totalSharesBps}
      />

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowDepositModal(false); setDepositAmount(''); setIsPublicDeposit(true); }}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Deposit ALEO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Amount (ALEO)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => {
                      // Only allow non-negative values
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) {
                        setDepositAmount(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Prevent minus key
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                      }
                    }}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Deposit Type Toggle */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Deposit Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPublicDeposit(true)}
                      className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                        isPublicDeposit
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-border-light'
                      }`}
                    >
                      <p className="text-sm font-medium text-text-primary">Public (Recommended)</p>
                      <p className="text-xs text-text-tertiary mt-1">Uses faucet/public credits</p>
                    </button>
                    <button
                      onClick={() => setIsPublicDeposit(false)}
                      className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                        !isPublicDeposit
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-border-light'
                      }`}
                    >
                      <p className="text-sm font-medium text-text-primary">Private</p>
                      <p className="text-xs text-text-tertiary mt-1">Requires private records</p>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowDepositModal(false);
                      setDepositAmount('');
                      setIsPublicDeposit(true); // Reset to Public (Recommended) for consistency
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleDeposit}
                    isLoading={isProcessing}
                    disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Deposit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowWithdrawModal(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Withdraw ALEO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-background-tertiary rounded-lg">
                  <p className="text-sm text-text-tertiary">Available to withdraw</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {formatCredits(will.totalLocked)}
                  </p>
                </div>

                <div className="p-4 bg-accent-yellow/10 border border-accent-yellow/20 rounded-lg">
                  <p className="text-sm text-accent-yellow">
                    <strong>Note:</strong> Withdrawing funds will reduce the inheritance available to your beneficiaries.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowWithdrawModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 gap-2"
                    onClick={handleWithdraw}
                    isLoading={isProcessing}
                    disabled={will.totalLocked === 0n}
                  >
                    <Minus className="w-4 h-4" />
                    Withdraw All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
