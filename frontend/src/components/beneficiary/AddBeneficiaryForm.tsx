'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useWill } from '@/hooks/useWill';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/useToast';
import { UIBeneficiary, isValidAleoAddress, percentToBps, bpsToPercent, MAX_BENEFICIARIES } from '@/types';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface AddBeneficiaryFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentSharesBps: number;
}

export default function AddBeneficiaryForm({
  isOpen,
  onClose,
  currentSharesBps,
}: AddBeneficiaryFormProps) {
  const { addBeneficiary, isLoading, will } = useWill();
  const { address: walletAddress } = useWallet();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    address: '',
    name: '',
    sharePercent: 0,
    relationship: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Ref to prevent double-click submission before isLoading state updates
  const isSubmittingRef = useRef(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        address: '',
        name: '',
        sharePercent: 0,
        relationship: '',
      });
      setErrors({});
      isSubmittingRef.current = false; // Reset submission state on modal open
    }
  }, [isOpen]);

  const availableSharePercent = bpsToPercent(10000 - currentSharesBps);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.address) {
      newErrors.address = 'Address is required';
    } else if (!isValidAleoAddress(formData.address)) {
      newErrors.address = 'Invalid Aleo address (must start with aleo1)';
    } else if (walletAddress && formData.address.toLowerCase() === walletAddress.toLowerCase()) {
      newErrors.address = 'You cannot add yourself as a beneficiary';
    } else if (
      will?.beneficiaries.some(
        (b) => b.owner.toLowerCase() === formData.address.toLowerCase() ||
               (b.beneficiaryAddr && b.beneficiaryAddr.toLowerCase() === formData.address.toLowerCase())
      )
    ) {
      newErrors.address = 'This address is already a beneficiary';
    }

    // Check max beneficiaries limit
    if (will && will.numBeneficiaries >= MAX_BENEFICIARIES) {
      newErrors.address = newErrors.address || `Cannot exceed maximum of ${MAX_BENEFICIARIES} beneficiaries`;
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.sharePercent || formData.sharePercent <= 0) {
      newErrors.sharePercent = 'Share must be greater than 0';
    } else if (formData.sharePercent > availableSharePercent) {
      newErrors.sharePercent = `Maximum available share is ${availableSharePercent.toFixed(0)}%`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-click submission
    if (isSubmittingRef.current || isLoading) {
      return;
    }
    isSubmittingRef.current = true;

    if (!validate() || !will) {
      isSubmittingRef.current = false;
      return;
    }

    try {
      const newBeneficiary: UIBeneficiary = {
        owner: formData.address,
        willOwner: will.owner,
        willId: will.willId,
        shareBps: percentToBps(formData.sharePercent),
        priority: will.numBeneficiaries + 1,
        verificationHash: `${Date.now()}field`,
        isActive: true,
        displayName: formData.name,
        relationship: formData.relationship,
        sharePercent: formData.sharePercent,
      };

      toast.info('Adding Beneficiary', 'Please confirm the transaction in your wallet...');
      await addBeneficiary(newBeneficiary);

      toast.success(
        'Beneficiary Added',
        `${formData.name} has been added with ${formData.sharePercent}% share`,
        { duration: 5000 }
      );

      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add beneficiary. Please try again.';
      toast.error('Failed to Add Beneficiary', errorMessage, { duration: 8000 });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Beneficiary"
      description="Add a new beneficiary to your will on Aleo"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm text-text-secondary">
            Available Share: <span className="font-bold text-primary">{availableSharePercent.toFixed(0)}%</span>
          </p>
        </div>

        <Input
          label="Aleo Address"
          placeholder="aleo1..."
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value.trim() })}
          error={errors.address}
          maxLength={63}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
          />

          <Input
            label="Share (%)"
            type="number"
            min="1"
            max={Math.floor(availableSharePercent)}
            step="1"
            placeholder="25"
            value={formData.sharePercent || ''}
            onChange={(e) => {
              // Round to integer to prevent decimal precision issues with basis points
              const value = Math.round(parseFloat(e.target.value) || 0);
              setFormData({ ...formData, sharePercent: value });
            }}
            onKeyDown={(e) => {
              // Prevent minus key, 'e' for scientific notation, and decimal point (share is whole percent)
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
            error={errors.sharePercent}
          />
        </div>

        <Input
          label="Relationship (optional)"
          placeholder="Spouse, Child, Sibling, etc."
          value={formData.relationship}
          onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
        />

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button type="button" onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={availableSharePercent === 0 || (will !== null && will.numBeneficiaries >= MAX_BENEFICIARIES)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Beneficiary
          </Button>
        </div>
      </form>
    </Modal>
  );
}
