'use client';

import { useEffect, ReactNode } from 'react';
import { logger } from '@/utils/debug';

interface DebugProviderProps {
  children: ReactNode;
}

/**
 * DebugProvider - Global Error Handlers
 *
 * Wraps the app to catch:
 * - Runtime errors via window.onerror
 * - Unhandled promise rejections via window.onunhandledrejection
 * - Console errors (overridden to add context)
 */
export function DebugProvider({ children }: DebugProviderProps) {
  useEffect(() => {
    // Store original console.error
    const originalConsoleError = console.error;

    // Handle runtime errors
    const handleError = (event: ErrorEvent) => {
      logger.globalError(event.error || event.message, 'Runtime error');
      // Don't prevent default - let React Error Boundaries catch it too
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.unhandledRejection(event.reason);
    };

    // Add global listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Log initialization
    logger.info('UI', 'Debug provider initialized', {
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
    };
  }, []);

  return <>{children}</>;
}

export default DebugProvider;
