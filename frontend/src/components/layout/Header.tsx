'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import WalletConnect from '@/components/wallet/WalletConnect';
import { cn } from '@/lib/utils';

/**
 * Navigation Header Component
 *
 * Features:
 * - Responsive mobile menu
 * - Active route highlighting
 * - Wallet connection integration
 *
 * Accessibility:
 * - Semantic nav element
 * - ARIA labels for mobile menu
 * - Keyboard navigation support
 */
export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/create', label: 'Create Will' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/claim', label: 'Claim' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-[rgba(255,255,255,0.05)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-16">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="diamond-icon">
              <div className="diamond-inner" />
            </div>
            <span className="font-serif text-xl font-medium text-cream tracking-wide">
              Duskfall
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'nav-link',
                  isActive(link.href) && 'text-gold'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Wallet Connect */}
          <div className="hidden md:block">
            <WalletConnect />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-cream-muted hover:text-gold transition-colors"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[rgba(255,255,255,0.05)] glass animate-fade-in">
          <nav className="px-6 py-4 space-y-2" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-3 text-sm transition-colors',
                  isActive(link.href)
                    ? 'text-gold bg-gold/10'
                    : 'text-cream-secondary hover:text-gold hover:bg-gold/5'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.05)]">
            <WalletConnect />
          </div>
        </div>
      )}
    </header>
  );
}
