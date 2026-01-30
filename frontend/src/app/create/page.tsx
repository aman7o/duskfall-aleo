'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useWill } from '@/hooks/useWill';
import { useToast } from '@/hooks/useToast';
import CreateWillForm from '@/components/will/CreateWillForm';

export default function CreatePage() {
  const router = useRouter();
  const { isConnected, address } = useWallet();
  const { will, willId, fetchWill, isLoading, cancelActiveTransaction } = useWill();
  const { toast } = useToast();
  const [checkingWill, setCheckingWill] = useState(true);
  const hasChecked = useRef(false);
  const hasRedirected = useRef(false);
  const isMountedRef = useRef(true);

  // Check if user already has a will (run once)
  useEffect(() => {
    isMountedRef.current = true;

    if (!isConnected) {
      router.push('/');
      return;
    }

    if (address && !hasChecked.current) {
      hasChecked.current = true;
      fetchWill(address).finally(() => {
        if (isMountedRef.current) {
          setCheckingWill(false);
        }
      });
    }

    return () => {
      isMountedRef.current = false;
      // Cancel any active transaction polling when component unmounts
      cancelActiveTransaction();
    };
    // fetchWill and cancelActiveTransaction are closures that get new references each render,
    // but hasChecked ref guards against re-fetching and cleanup only needs latest version at unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, router]);

  // Redirect if will already exists (run once)
  useEffect(() => {
    if (!checkingWill && !hasRedirected.current && (will || willId)) {
      hasRedirected.current = true;
      toast.warning(
        'Will Already Exists',
        'You already have a will. Redirecting to dashboard...'
      );
      router.push('/dashboard');
    }
  }, [checkingWill, will, willId, router, toast]);

  if (!isConnected || checkingWill || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-text-secondary">Checking wallet status...</p>
      </div>
    );
  }

  // If will exists, don't render form (redirect will happen)
  if (will || willId) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
          Create Your Will
        </h1>
        <p className="text-text-secondary">
          Set up your dead man&apos;s switch in just a few steps
        </p>
      </div>

      <CreateWillForm />
    </div>
  );
}
