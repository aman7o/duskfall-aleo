'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletModal } from '@demox-labs/aleo-wallet-adapter-reactui';
import { ChevronDown, Copy, ExternalLink, LogOut } from 'lucide-react';
import { formatAddress } from '@/types';
import { EXPLORER_URL } from '@/constants/config';

/**
 * Wallet Connection Component
 *
 * Provides:
 * - One-click wallet connection via Leo Wallet
 * - Address display with copy functionality
 * - Balance display
 * - Disconnect option
 */
export default function WalletConnect() {
  const { connected, connecting, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const address = publicKey?.toString() || null;

  const handleConnect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handleCopy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [address]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setShowDropdown(false);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, [disconnect]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showDropdown && !(e.target as Element).closest('.wallet-dropdown-container')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  if (!connected || !address) {
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="wallet-display hover:bg-gold/20 transition-all"
      >
        <div className="pulse-indicator" />
        <span className="font-sans text-sm text-gold uppercase tracking-wide">
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </span>
      </button>
    );
  }

  return (
    <div className="relative wallet-dropdown-container">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="wallet-display hover:bg-gold/20 transition-all"
      >
        <div className="pulse-indicator" />
        <span className="font-sans text-sm text-cream-secondary">
          {formatAddress(address)}
        </span>
        <ChevronDown className={`w-4 h-4 text-cream-muted transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 glass border border-gold/20 shadow-gold z-50 animate-fade-in">
          {/* Address Section */}
          <div className="p-4 border-b border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans text-xs text-cream-muted uppercase tracking-wide">
                Aleo Address
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-gold hover:text-gold-light transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-xs text-cream break-all">
              {address}
            </p>
          </div>

          {/* Actions */}
          <div className="p-2">
            <a
              href={`${EXPLORER_URL}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-cream-secondary hover:text-gold hover:bg-gold/5 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on Explorer
            </a>
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-accent-red hover:bg-accent-red/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
