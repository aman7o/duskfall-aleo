'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useWallet as useLeoWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { AleoAddress } from '@/types';
import { useWillStore } from './useWill';
import { queryKeys } from './useWillQuery';
import { logger } from '@/utils/debug';
import { RPC_URL } from '@/constants/config';

// Aleo RPC endpoint - use config for single source of truth
const ALEO_RPC = RPC_URL;

export function useWallet() {
  const prevConnectedRef = useRef<boolean | null>(null);
  const prevAddressRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  // Use the Leo Wallet adapter
  const leoWallet = useLeoWallet();

  const {
    publicKey,
    connected,
    connecting,
    disconnect: leoDisconnect,
    select,
    wallets,
    wallet
  } = leoWallet;

  const [balance, setBalance] = useState<bigint>(0n);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Log wallet connection state changes
  useEffect(() => {
    // Detect connection change
    if (prevConnectedRef.current !== null && prevConnectedRef.current !== connected) {
      if (connected && publicKey) {
        logger.wallet.connected(publicKey);
      } else if (!connected) {
        logger.wallet.disconnected();
      }
    }

    // Detect account change (while remaining connected)
    if (
      connected &&
      prevAddressRef.current !== null &&
      prevAddressRef.current !== publicKey &&
      publicKey
    ) {
      logger.wallet.accountChanged(publicKey);
    }

    prevConnectedRef.current = connected;
    prevAddressRef.current = publicKey || null;
  }, [connected, publicKey]);

  // Fetch balance from Aleo RPC
  const fetchBalance = useCallback(async (address: string) => {
    if (!address) return;

    setIsLoadingBalance(true);
    logger.debug('Wallet', 'Fetching balance', { address });
    try {
      const response = await fetch(
        `${ALEO_RPC}/testnet/program/credits.aleo/mapping/account/${address}`
      );

      if (response.ok) {
        const data = await response.text();
        const match = data.match(/(\d+)u64/);
        if (match) {
          const bal = BigInt(match[1]);
          setBalance(bal);
          logger.wallet.balanceFetched(bal);
        } else {
          setBalance(0n);
          logger.wallet.balanceFetched(0n);
        }
      } else {
        setBalance(0n);
      }
    } catch (error) {
      logger.wallet.error(error instanceof Error ? error : String(error));
      setBalance(0n);
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  // Fetch balance when address changes
  useEffect(() => {
    if (publicKey) {
      fetchBalance(publicKey);
    } else {
      setBalance(0n);
    }
  }, [publicKey, fetchBalance]);

  const connect = useCallback(async () => {
    logger.wallet.connecting();

    // Use Leo Wallet
    const leoWalletAdapter = wallets.find((w) => w.adapter.name === 'Leo Wallet');
    if (leoWalletAdapter) {
      select(leoWalletAdapter.adapter.name);
    } else {
      const error = 'Leo Wallet not found. Please install the Leo Wallet browser extension from https://leo.app';
      logger.wallet.error(error);
      throw new Error(error);
    }
  }, [wallets, select]);

  const disconnect = useCallback(async () => {
    // Get current address before disconnect for cache cleanup
    const currentAddress = publicKey;

    // Clear will data to prevent privacy leak (C-07)
    const {
      setWill,
      setError,
      setWillId,
      setWillConfigRecord,
      setBeneficiaryRecords,
      setLockedCreditsRecords
    } = useWillStore.getState();

    setWill(null);
    setError(null);
    setWillId(null);
    setWillConfigRecord(null);
    setBeneficiaryRecords(new Map());
    setLockedCreditsRecords([]);

    // FIX: Clear React Query cache to prevent stale data when reconnecting
    // This prevents privacy leaks where previous wallet's data could briefly display
    queryClient.removeQueries({ queryKey: queryKeys.all });

    // Clear localStorage cache for this wallet to prevent privacy leak
    if (typeof window !== 'undefined' && currentAddress) {
      // Clear will-related localStorage keys for this address
      localStorage.removeItem(`will_id_${currentAddress}`);
      localStorage.removeItem(`will_config_${currentAddress}`);
      // Clear plaintext records (pt_ prefix, used for _nonce-bearing record inputs)
      localStorage.removeItem(`pt_will_config_${currentAddress}`);
      for (let i = 0; i < 10; i++) {
        localStorage.removeItem(`beneficiary_${currentAddress}_${i}`);
        localStorage.removeItem(`pt_beneficiary_${currentAddress}_${i}`);
      }
      for (let i = 0; i < 20; i++) {
        localStorage.removeItem(`locked_credits_${currentAddress}_${i}`);
        localStorage.removeItem(`pt_locked_credits_${currentAddress}_${i}`);
      }
      // Also clear legacy keys without address suffix
      localStorage.removeItem('will_id');
      localStorage.removeItem('will_config');
    }

    if (leoDisconnect) {
      await leoDisconnect();
    }
    setBalance(0n);
  }, [leoDisconnect, publicKey, queryClient]);

  const refreshBalance = useCallback(() => {
    if (publicKey) {
      fetchBalance(publicKey);
    }
  }, [publicKey, fetchBalance]);

  return {
    address: publicKey as AleoAddress | null,
    isConnected: connected,
    isConnecting: connecting,
    balance,
    isLoadingBalance,
    connect,
    disconnect,
    refreshBalance,
    wallet,
  };
}
