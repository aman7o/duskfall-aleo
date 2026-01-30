'use client';

import { useState, useRef, useEffect } from 'react';
import { Heart, CheckCircle } from 'lucide-react';
import { useWill } from '@/hooks/useWill';
import { useToast } from '@/hooks/useToast';
import Button from '@/components/ui/Button';

export default function CheckInButton() {
  const { checkIn, isLoading } = useWill();
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  // Ref to prevent double-click submission before isLoading state updates
  const isCheckingInRef = useRef(false);
  // Ref to store timeout for cleanup
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, []);

  const handleCheckIn = async () => {
    // Prevent double-click submission (ref check is synchronous)
    if (isCheckingInRef.current || isLoading) {
      return;
    }
    isCheckingInRef.current = true;

    // Reset success state on new attempt
    setShowSuccess(false);

    try {
      toast.info('Processing Check-In', 'Please confirm the transaction in your wallet...');
      await checkIn();
      setShowSuccess(true);
      toast.success(
        'Check-In Successful',
        'Your deadline has been extended. Stay safe!',
        { duration: 5000 }
      );
      // Clear any existing timeout before setting new one
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      // Ensure success state is false on error
      setShowSuccess(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to check in. Please try again.';
      toast.error('Check-In Failed', errorMessage, { duration: 8000 });
    } finally {
      isCheckingInRef.current = false;
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={handleCheckIn}
        isLoading={isLoading}
        size="lg"
        className={`w-full py-7 text-xl font-bold gap-3 relative overflow-hidden group ${
          showSuccess ? 'bg-accent-green hover:bg-accent-green shadow-accent-green/30' : ''
        }`}
        disabled={showSuccess}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent-purple to-primary bg-[length:200%_100%] animate-gradient opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none" />

        {showSuccess ? (
          <>
            <CheckCircle className="w-7 h-7" />
            Check-In Successful!
          </>
        ) : (
          <>
            <Heart className="w-7 h-7 group-hover:scale-125 transition-transform duration-300" />
            I&apos;m Alive - Check In
          </>
        )}
      </Button>

      {showSuccess && (
        <div className="absolute -top-3 -right-3 bg-accent-green text-white px-4 py-1.5 rounded-full text-sm font-bold animate-slide-up shadow-lg shadow-accent-green/30">
          Deadline Extended!
        </div>
      )}
    </div>
  );
}
