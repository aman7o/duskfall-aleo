import Link from 'next/link';
import { Github, Twitter, ExternalLink } from 'lucide-react';

/**
 * Footer Component
 *
 * Simple footer with links and social media
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[rgba(255,255,255,0.05)] bg-background-secondary">
      <div className="max-w-7xl mx-auto px-6 lg:px-16 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="diamond-icon w-10 h-10">
                <div className="diamond-inner w-5 h-5" />
              </div>
              <span className="font-serif text-lg font-medium text-cream">
                Duskfall
              </span>
            </div>
            <p className="text-sm text-cream-muted max-w-sm">
              Privacy-preserving digital inheritance protocol built on Aleo blockchain.
              Secure your legacy with zero-knowledge proofs.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-sans text-sm font-medium text-cream mb-3 uppercase tracking-wide">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/create" className="text-sm text-cream-muted hover:text-gold transition-colors">
                  Create Will
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-cream-muted hover:text-gold transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/claim" className="text-sm text-cream-muted hover:text-gold transition-colors">
                  Claim Assets
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-sans text-sm font-medium text-cream mb-3 uppercase tracking-wide">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://developer.aleo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-cream-muted hover:text-gold transition-colors inline-flex items-center gap-1"
                >
                  Aleo Docs <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://explorer.provable.com/testnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-cream-muted hover:text-gold transition-colors inline-flex items-center gap-1"
                >
                  Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://faucet.aleo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-cream-muted hover:text-gold transition-colors inline-flex items-center gap-1"
                >
                  Testnet Faucet <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[rgba(255,255,255,0.05)] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-cream-muted">
            &copy; {currentYear} Duskfall. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cream-muted hover:text-gold transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cream-muted hover:text-gold transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
