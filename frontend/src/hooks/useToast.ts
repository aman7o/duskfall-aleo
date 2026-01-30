'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import { ToastData, ToastType } from '@/components/ui/Toast';

interface ToastStore {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// Counter to ensure unique IDs even in same millisecond
let toastCounter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    // Use counter + timestamp + crypto random for guaranteed uniqueness
    toastCounter = (toastCounter + 1) % 1000000;
    const cryptoRandom = typeof window !== 'undefined' && window.crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map(b => b.toString(16).padStart(2, '0')).join('')
      : Math.random().toString(36).substr(2, 9);
    const id = `toast-${Date.now()}-${toastCounter}-${cryptoRandom}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearAll: () => {
    set({ toasts: [] });
  },
}));

export function useToast() {
  const { addToast, removeToast, clearAll } = useToastStore();

  // Memoize toast object to prevent unnecessary re-renders when used in dependency arrays
  const toast = useMemo(() => ({
    success: (title: string, message?: string, options?: { duration?: number; txId?: string; explorerUrl?: string }) => {
      addToast({ type: 'success', title, message, ...options });
    },
    error: (title: string, message?: string, options?: { duration?: number }) => {
      addToast({ type: 'error', title, message, duration: options?.duration || 7000 });
    },
    warning: (title: string, message?: string, options?: { duration?: number }) => {
      addToast({ type: 'warning', title, message, ...options });
    },
    info: (title: string, message?: string, options?: { duration?: number }) => {
      addToast({ type: 'info', title, message, ...options });
    },
    custom: (toastData: Omit<ToastData, 'id'>) => {
      addToast(toastData);
    },
  }), [addToast]);

  return {
    toast,
    removeToast,
    clearAll,
  };
}
