'use client';

import React, { useMemo } from 'react';
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from '@demox-labs/aleo-wallet-adapter-base';
import { QueryProvider } from '@/providers/QueryProvider';
import { DebugProvider } from '@/providers/DebugProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Client Layout Component (ZKescrow Pattern)
 *
 * Provides:
 * - Aleo wallet adapter context with proper configuration
 * - Decrypt permission for record access
 * - Network configuration
 * - Auto-connect functionality
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  // Memoize wallet adapters (ZKescrow pattern)
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'Duskfall',
      }),
    ],
    []
  );

  return (
    <DebugProvider>
      <ErrorBoundary>
        <QueryProvider>
          <WalletProvider
            wallets={wallets}
            decryptPermission={DecryptPermission.OnChainHistory}
            network={WalletAdapterNetwork.TestnetBeta}
            autoConnect={true}
            programs={['digital_will_v7.aleo']}
          >
            <WalletModalProvider>
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 pt-20">{children}</main>
                <Footer />
              </div>
            </WalletModalProvider>
          </WalletProvider>
        </QueryProvider>
      </ErrorBoundary>
    </DebugProvider>
  );
}
