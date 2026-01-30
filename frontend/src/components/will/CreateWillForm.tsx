'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Shield, CheckCircle } from 'lucide-react';
import { useWill } from '@/hooks/useWill';
import { useToast } from '@/hooks/useToast';
import { CreateWillFormData } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

const CHECK_IN_OPTIONS: Array<{ label: string; value: number | 'custom' }> = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
  { label: '180 days', value: 180 },
  { label: '365 days', value: 365 },
  { label: 'Custom', value: 'custom' },
];

const GRACE_PERIOD_OPTIONS = [
  { label: '3 days', value: 3 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
];

export default function CreateWillForm() {
  const router = useRouter();
  const { createWill, isLoading } = useWill();
  const { toast } = useToast();
  const [formData, setFormData] = useState<CreateWillFormData>({
    checkInPeriodDays: 30,
    gracePeriodDays: 7,
    beneficiaries: [],
    initialDeposit: '',
  });
  const [isCustomCheckIn, setIsCustomCheckIn] = useState(false);
  const [customCheckInDays, setCustomCheckInDays] = useState('');
  // Ref to prevent double-click submission before isLoading state updates
  const isSubmittingRef = useRef(false);

  const handleSubmit = async () => {
    // Prevent double-click submission (ref check is synchronous, before async state updates)
    if (isSubmittingRef.current || isLoading) {
      console.log('[CreateWillForm] Submission blocked - already in progress');
      return;
    }
    isSubmittingRef.current = true;

    console.log('[CreateWillForm] handleSubmit called', { formData, isLoading });

    // Prepare the final form data, ensuring custom check-in days are applied
    let finalFormData = { ...formData };

    // Validate and apply custom check-in period if using custom option
    if (isCustomCheckIn) {
      const days = parseInt(customCheckInDays);
      if (!days || days < 1 || days > 365) {
        toast.error('Invalid Check-In Period', 'Custom period must be between 1 and 365 days');
        isSubmittingRef.current = false;
        return;
      }
      // Ensure the custom value is used in case onChange didn't sync properly
      finalFormData.checkInPeriodDays = days;
    }

    // Validate grace period is not longer than check-in period
    if (finalFormData.gracePeriodDays > finalFormData.checkInPeriodDays) {
      toast.error(
        'Invalid Grace Period',
        `Grace period (${finalFormData.gracePeriodDays} days) cannot exceed check-in period (${finalFormData.checkInPeriodDays} days)`
      );
      isSubmittingRef.current = false;
      return;
    }

    try {
      console.log('[CreateWillForm] Calling createWill...');
      toast.info('Creating Will', 'Please confirm the transaction in your wallet...');
      await createWill(finalFormData);
      toast.success(
        'Will Created Successfully',
        'Your will has been created. Now add beneficiaries and deposit funds from your dashboard.',
        { duration: 8000 }
      );
      router.push('/dashboard');
    } catch (error) {
      console.error('[CreateWillForm] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create will. Please try again.';
      toast.error('Creation Failed', errorMessage, { duration: 8000 });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Set Your Check-In Schedule</CardTitle>
              <CardDescription>
                How often do you want to check in to prove you&apos;re alive?
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 mb-6">
            {CHECK_IN_OPTIONS.map((option) => (
              <button
                key={String(option.value)}
                onClick={() => {
                  if (option.value === 'custom') {
                    setIsCustomCheckIn(true);
                  } else {
                    setIsCustomCheckIn(false);
                    setFormData({ ...formData, checkInPeriodDays: option.value });
                  }
                }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  (option.value === 'custom' && isCustomCheckIn) ||
                  (option.value !== 'custom' && !isCustomCheckIn && formData.checkInPeriodDays === option.value)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-border-light'
                }`}
              >
                <p className="text-lg font-semibold text-text-primary">{option.label}</p>
                <p className="text-sm text-text-tertiary mt-1">
                  {option.value === 'custom'
                    ? 'Set any period between 1-365 days'
                    : `You'll need to check in every ${option.label}`}
                </p>
              </button>
            ))}
          </div>

          {/* Custom Check-In Period Input */}
          {isCustomCheckIn && (
            <div className="mb-6 p-4 bg-background-tertiary rounded-lg border border-border">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Custom Check-In Period (days)
              </label>
              <Input
                type="number"
                min={1}
                max={365}
                value={customCheckInDays}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  setCustomCheckInDays(inputValue);
                  // Only update formData if valid number in range
                  // This keeps the summary accurate and avoids showing 0 days
                  const days = parseInt(inputValue);
                  if (!isNaN(days) && days >= 1 && days <= 365) {
                    setFormData({ ...formData, checkInPeriodDays: days });
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent minus key, 'e' for scientific notation, decimal point
                  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '.') {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  // Only allow digits in pasted content
                  if (!/^\d+$/.test(pasted.trim())) {
                    e.preventDefault();
                  }
                }}
                placeholder="Enter days (1-365)"
                helperText="Must be between 1 and 365 days"
              />
            </div>
          )}

          <div className="mb-6">
            <p className="text-sm font-medium text-text-secondary mb-3">Grace Period</p>
            <p className="text-sm text-text-tertiary mb-3">
              Additional time after deadline before assets are distributed
            </p>
            <div className="grid grid-cols-3 gap-3">
              {GRACE_PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormData({ ...formData, gracePeriodDays: option.value })}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    formData.gracePeriodDays === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border-light'
                  }`}
                >
                  <p className="text-sm font-semibold text-text-primary">{option.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="p-6 bg-background-tertiary rounded-lg space-y-4 mb-6">
            <p className="text-sm font-semibold text-text-primary">Summary</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Check-in Period</span>
                <span className="text-text-primary">
                  {isCustomCheckIn
                    ? `${formData.checkInPeriodDays} days (custom)`
                    : CHECK_IN_OPTIONS.find((o) => o.value === formData.checkInPeriodDays)?.label || `${formData.checkInPeriodDays} days`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Grace Period</span>
                <span className="text-text-primary">
                  {GRACE_PERIOD_OPTIONS.find((o) => o.value === formData.gracePeriodDays)?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps Info */}
          <div className="p-4 bg-accent-blue/10 border border-accent-blue/20 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-accent-blue">What happens next?</p>
                <p className="text-xs text-text-tertiary mt-1">
                  After creating your will, you&apos;ll be redirected to your dashboard where you can:
                </p>
                <ul className="text-xs text-text-tertiary mt-2 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-accent-green" />
                    Add beneficiaries and their share allocations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-accent-green" />
                    Deposit ALEO credits to fund your will
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-accent-green" />
                    Monitor your check-in status and deadline
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              isLoading={isLoading}
              size="lg"
            >
              Create Will
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
