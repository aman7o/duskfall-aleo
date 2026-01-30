'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  txId?: string;
  explorerUrl?: string;
}

interface ToastProps extends ToastData {
  onClose: (id: string) => void;
}

export function Toast({ id, type, title, message, duration = 5000, txId, explorerUrl, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          onClose(id);
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-accent-red flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-accent-yellow flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-primary flex-shrink-0" />,
  };

  const bgColors = {
    success: 'bg-accent-green/10 border-accent-green/20',
    error: 'bg-accent-red/10 border-accent-red/20',
    warning: 'bg-accent-yellow/10 border-accent-yellow/20',
    info: 'bg-primary/10 border-primary/20',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-xl border shadow-xl shadow-black/20 backdrop-blur-md transition-all duration-300 bg-background-secondary/95',
        bgColors[type],
        isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100'
      )}
      role="alert"
    >
      <div className={cn(
        'p-2 rounded-lg',
        type === 'success' && 'bg-accent-green/20',
        type === 'error' && 'bg-accent-red/20',
        type === 'warning' && 'bg-accent-yellow/20',
        type === 'info' && 'bg-primary/20'
      )}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text-primary text-sm">{title}</p>
        {message && (
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">{message}</p>
        )}
        {txId && explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover mt-2 transition-colors font-medium"
          >
            View Transaction
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <button
        onClick={handleClose}
        className="p-1.5 hover:bg-background-tertiary rounded-lg transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-text-tertiary" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: ToastData[]; onClose: (id: string) => void }) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}
