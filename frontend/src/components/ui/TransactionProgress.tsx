'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Loader2, ExternalLink, Copy, RotateCcw, AlertCircle, Clock } from 'lucide-react';
import { getExplorerUrl } from '@/services/aleo';

export type TransactionStatus =
  | 'idle'
  | 'signing'
  | 'broadcasting'
  | 'confirming'
  | 'finalized'
  | 'error';

interface TransactionProgressProps {
  status: TransactionStatus;
  txId?: string | null;
  error?: string;
  className?: string;
  onRetry?: () => void;
  showEstimatedTime?: boolean;
  startTime?: number;
}

interface Step {
  key: TransactionStatus;
  label: string;
  description: string;
  estimatedSeconds?: number;
}

const STEPS: Step[] = [
  { key: 'signing', label: 'Signing Transaction', description: 'Waiting for wallet confirmation...', estimatedSeconds: 5 },
  { key: 'broadcasting', label: 'Broadcasting to Network', description: 'Sending transaction to Aleo...', estimatedSeconds: 3 },
  { key: 'confirming', label: 'Confirming on Chain', description: 'Waiting for block confirmation...', estimatedSeconds: 30 },
  { key: 'finalized', label: 'Transaction Complete', description: 'Success!' },
];

function getStepStatus(currentStatus: TransactionStatus, stepKey: string): 'pending' | 'active' | 'completed' {
  const stepOrder = ['signing', 'broadcasting', 'confirming', 'finalized'];
  const currentIndex = stepOrder.indexOf(currentStatus);
  const stepIndex = stepOrder.indexOf(stepKey);

  if (currentStatus === 'idle' || currentStatus === 'error') {
    return 'pending';
  }

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-background-tertiary transition-colors"
      title="Copy transaction ID"
    >
      {copied ? (
        <CheckCircle className="w-4 h-4 text-accent-green" />
      ) : (
        <Copy className="w-4 h-4 text-text-tertiary" />
      )}
    </button>
  );
}

function ElapsedTimeDisplay({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
      <Clock className="w-3 h-3" />
      <span>Elapsed: {formatTime(elapsed)}</span>
    </div>
  );
}

export default function TransactionProgress({
  status,
  txId,
  error,
  className = '',
  onRetry,
  showEstimatedTime = true,
  startTime,
}: TransactionProgressProps) {
  const explorerUrl = txId ? getExplorerUrl(txId) : null;

  if (status === 'idle') {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Transaction ID Banner */}
      {txId && (
        <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg border border-border gap-2">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <span className="text-xs text-text-tertiary shrink-0">TX:</span>
            <span className="text-xs sm:text-sm font-mono text-text-secondary truncate max-w-[120px] sm:max-w-none">
              <span className="hidden sm:inline">{txId.slice(0, 12)}...{txId.slice(-8)}</span>
              <span className="sm:hidden">{txId.slice(0, 8)}...{txId.slice(-4)}</span>
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <CopyButton text={txId} />
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md hover:bg-background-tertiary transition-colors"
                title="View on explorer"
              >
                <ExternalLink className="w-4 h-4 text-text-tertiary" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Elapsed Time */}
      {showEstimatedTime && startTime && status !== 'finalized' && status !== 'error' && (
        <ElapsedTimeDisplay startTime={startTime} />
      )}

      {/* Progress Steps */}
      {STEPS.map((step, index) => {
        const stepStatus = getStepStatus(status, step.key);
        const isActive = stepStatus === 'active';

        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Step Indicator */}
            <div className="flex-shrink-0 mt-0.5">
              {stepStatus === 'completed' ? (
                <div className="w-6 h-6 rounded-full bg-accent-green flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              ) : isActive ? (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center relative">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  {/* Ripple effect for active step */}
                  <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-background-tertiary border border-border flex items-center justify-center">
                  <Circle className="w-3 h-3 text-text-tertiary" />
                </div>
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${
                  stepStatus === 'completed' ? 'text-accent-green' :
                  isActive ? 'text-primary' :
                  'text-text-tertiary'
                }`}>
                  {step.label}
                </p>
                {isActive && showEstimatedTime && step.estimatedSeconds && (
                  <span className="text-xs text-text-tertiary">
                    ~{formatTime(step.estimatedSeconds)}
                  </span>
                )}
              </div>
              {isActive && (
                <p className="text-xs text-text-tertiary mt-0.5">
                  {step.description}
                </p>
              )}
            </div>

            {/* Connector Line */}
            {index < STEPS.length - 1 && (
              <div className="absolute left-3 top-7 w-0.5 h-6 bg-border hidden" />
            )}
          </div>
        );
      })}

      {/* Error Message */}
      {status === 'error' && error && (
        <div className="mt-4 p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent-red shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-accent-red">Transaction Failed</p>
              <p className="text-sm text-accent-red/80 mt-1">{error}</p>
            </div>
          </div>

          {/* Retry Button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-accent-red/20 hover:bg-accent-red/30 text-accent-red rounded-lg transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Success Message */}
      {status === 'finalized' && (
        <div className="mt-4 p-4 bg-accent-green/10 border border-accent-green/20 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-accent-green" />
            <div className="flex-1">
              <p className="text-sm font-medium text-accent-green">Transaction Confirmed</p>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-green/80 hover:text-accent-green underline mt-1 inline-flex items-center gap-1"
                >
                  View on Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook to manage transaction progress state
export function useTransactionProgress() {
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [startTime, setStartTime] = useState<number | undefined>();

  const reset = () => {
    setStatus('idle');
    setTxId(null);
    setError(undefined);
    setStartTime(undefined);
  };

  const startTransaction = () => {
    setStatus('signing');
    setTxId(null);
    setError(undefined);
    setStartTime(Date.now());
  };

  const setTransactionId = (id: string) => {
    setTxId(id);
    setStatus('broadcasting');
  };

  const updateStatus = (newStatus: TransactionStatus, errorMessage?: string) => {
    setStatus(newStatus);
    if (errorMessage) {
      setError(errorMessage);
    }
  };

  return {
    status,
    txId,
    error,
    startTime,
    reset,
    startTransaction,
    setTransactionId,
    updateStatus,
  };
}

// Progress bar component for compact display
export function TransactionProgressBar({
  status,
  className = '',
}: {
  status: TransactionStatus;
  className?: string;
}) {
  const getProgress = (): number => {
    switch (status) {
      case 'idle':
        return 0;
      case 'signing':
        return 15;
      case 'broadcasting':
        return 35;
      case 'confirming':
        return 70;
      case 'finalized':
        return 100;
      case 'error':
        return 100;
      default:
        return 0;
    }
  };

  const progress = getProgress();
  const isError = status === 'error';
  const isComplete = status === 'finalized';

  if (status === 'idle') {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${
            isError
              ? 'bg-accent-red'
              : isComplete
              ? 'bg-accent-green'
              : 'bg-primary'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className={`text-xs ${
          isError ? 'text-accent-red' :
          isComplete ? 'text-accent-green' :
          'text-text-tertiary'
        }`}>
          {isError ? 'Failed' :
           isComplete ? 'Complete' :
           status === 'signing' ? 'Signing...' :
           status === 'broadcasting' ? 'Broadcasting...' :
           'Confirming...'}
        </span>
        <span className="text-xs text-text-tertiary">{progress}%</span>
      </div>
    </div>
  );
}
