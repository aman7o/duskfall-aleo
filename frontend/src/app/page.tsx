'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWill } from '@/hooks/useWill';
import { formatCredits, WillStatus } from '@/types';
import Button from '@/components/ui/Button';

/**
 * Landing Page Component
 *
 * Features:
 * - Hero section with value proposition
 * - Feature highlights
 * - How it works
 * - Technology stack
 * - CTA sections
 */
export default function HomePage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const { connected, connecting, connect } = useWallet();
  const { will, isLoading } = useWill();

  // Handle protected navigation
  const handleProtectedNavigation = async (path: string) => {
    if (connected) {
      router.push(path);
    } else {
      try {
        // Cast connect for compatibility with different adapter versions
        await (connect as () => Promise<void>)();
        router.push(path);
      } catch (error) {
        console.error('Connection failed:', error);
      }
    }
  };

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="w-full min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] gradient-orb-gold animate-float" />
        <div className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] gradient-orb-blue animate-float-reverse" />
        <div
          className="absolute inset-0 bg-grid-pattern"
          style={{ maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 100%)' }}
        />
      </div>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center pt-20 pb-24 px-6 lg:px-16 relative z-10">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Left Content */}
            <div className={`transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="label-luxury mb-6 flex items-center gap-3">
                <span className="w-10 h-px bg-gold" />
                Built on Aleo · Private by Default
              </div>

              <h1 className="font-serif text-hero mb-8">
                Your Legacy,<br />
                <span className="gradient-text font-medium">Cryptographically</span><br />
                Secured Forever
              </h1>

              <p className="font-sans text-lg text-cream-secondary leading-relaxed max-w-xl mb-12 font-light">
                The first privacy-preserving digital inheritance protocol. Transfer your assets
                to loved ones automatically, with zero-knowledge proofs ensuring complete
                confidentiality until the moment of execution.
              </p>

              <div className="flex flex-col sm:flex-row gap-5 mb-16">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleProtectedNavigation('/create')}
                  isLoading={connecting}
                >
                  Begin Your Legacy
                </Button>
                <Link href="#how-it-works">
                  <Button variant="secondary" size="lg">
                    View Documentation
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-12">
                {[
                  { value: '$2.4M+', label: 'Assets Protected' },
                  { value: '1,200+', label: 'Active Wills' },
                  { value: '100%', label: 'Private & Trustless' }
                ].map((stat, i) => (
                  <div
                    key={i}
                    className={`transition-all duration-1000 delay-${(i+2)*100} ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  >
                    <div className="font-serif text-3xl font-medium text-gold mb-1">
                      {stat.value}
                    </div>
                    <div className="font-sans text-xs uppercase tracking-wide text-cream-muted">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Will Preview Card */}
            <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="will-preview-card">
                <div className="corner-decoration corner-tl" />
                <div className="corner-decoration corner-tr" />
                <div className="corner-decoration corner-bl" />
                <div className="corner-decoration corner-br" />

                <div>
                  <div className="font-sans text-[10px] tracking-[3px] text-cream-faint uppercase mb-4">
                    {connected && will ? 'Your Will' : 'Sample Will Preview'}
                  </div>

                  <div className="font-serif text-card-title font-normal mb-8">
                    {connected && will ? 'Your Duskfall Will' : 'Duskfall #0847'}
                  </div>

                  <div className="flex flex-col gap-5">
                    {(connected && will && !isLoading ? [
                      { label: 'Status', value: will.status === WillStatus.ACTIVE ? 'Active' : 'Triggered', color: will.status === WillStatus.ACTIVE ? 'text-accent-green' : 'text-accent-red' },
                      { label: 'Total Locked', value: formatCredits(will.totalLocked), color: 'text-gold' },
                      { label: 'Time Remaining', value: will.timeRemaining, color: 'text-cream' },
                      { label: 'Beneficiaries', value: `${will.numBeneficiaries} (Encrypted)`, color: 'text-cream-muted' }
                    ] : [
                      { label: 'Status', value: 'Active', color: 'text-accent-green' },
                      { label: 'Last Check-in', value: '2 days ago', color: 'text-gold' },
                      { label: 'Next Required', value: 'In 28 days', color: 'text-cream' },
                      { label: 'Beneficiaries', value: '3 (Encrypted)', color: 'text-cream-muted' }
                    ]).map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-4 border-b border-[rgba(255,255,255,0.05)]">
                        <span className="font-sans text-sm text-cream-muted tracking-wide">
                          {item.label}
                        </span>
                        <span className={`font-sans text-sm font-medium ${item.color}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  {connected && will ? (
                    <>
                      <Link href="/dashboard" className="flex-1 block w-full font-sans text-xs tracking-wider uppercase py-4 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-all text-center">
                        View Dashboard
                      </Link>
                      <Link href="/dashboard" className="flex-1 block w-full font-sans text-xs tracking-wider uppercase py-4 bg-transparent border border-[rgba(255,255,255,0.1)] text-cream-secondary hover:border-gold/30 hover:text-gold transition-all text-center">
                        Edit Will
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleProtectedNavigation('/create')}
                        className="flex-1 w-full font-sans text-xs tracking-wider uppercase py-4 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-all text-center"
                      >
                        {connecting ? 'Connecting...' : 'Create Will'}
                      </button>
                      <Link href="#how-it-works" className="flex-1 block w-full font-sans text-xs tracking-wider uppercase py-4 bg-transparent border border-[rgba(255,255,255,0.1)] text-cream-secondary hover:border-gold/30 hover:text-gold transition-all text-center">
                        Learn More
                      </Link>
                    </>
                  )}
                </div>

                {/* Floating ZK badge */}
                <div className="absolute -top-5 -right-5 bg-gradient-to-br from-gold to-gold-dark px-6 py-4 flex items-center gap-2 shadow-gold">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span className="font-sans text-xs font-semibold text-background uppercase tracking-wider">
                    ZK Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-6 lg:px-16 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="label-luxury mb-6">Why Choose Duskfall</div>
            <h2 className="font-serif text-section font-light">
              Estate Planning,<br />
              <span className="gradient-text font-medium">Reimagined</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                ),
                title: "Dead Man's Switch",
                desc: 'Set your check-in frequency. Miss a check-in, and your assets automatically transfer to designated beneficiaries after a grace period.'
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M12 8v4m0 4h.01"/>
                  </svg>
                ),
                title: 'Complete Privacy',
                desc: 'Zero-knowledge proofs ensure your beneficiaries, asset amounts, and transfer conditions remain encrypted and private until execution.'
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c9a962" strokeWidth="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                ),
                title: 'Self-Custodial',
                desc: 'Your keys, your assets. No third party ever has access to your funds. Smart contracts execute trustlessly on-chain.'
              }
            ].map((feature, i) => (
              <div key={i} className="feature-card">
                <div className="mb-8">{feature.icon}</div>
                <h3 className="font-serif text-card-title font-medium mb-4">
                  {feature.title}
                </h3>
                <p className="font-sans text-[15px] leading-relaxed text-cream-muted font-light">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-32 px-6 lg:px-16 relative z-10 bg-gradient-to-b from-transparent via-gold/[0.03] to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div>
              <div className="label-luxury mb-6">How It Works</div>
              <h2 className="font-serif text-section font-light mb-8">
                Simple Setup,<br />
                <span className="gradient-text font-medium">Eternal Security</span>
              </h2>
              <p className="font-sans text-base leading-relaxed text-cream-muted mb-10 font-light">
                Create your will in minutes. Our smart contracts handle the complexity
                while you maintain complete control over your assets and their future.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleProtectedNavigation('/create')}
                isLoading={connecting}
              >
                Start Now
              </Button>
            </div>

            <div className="flex flex-col gap-6">
              {[
                { num: '01', title: 'Connect Wallet', desc: 'Link your Aleo wallet to begin. Your private keys never leave your device.' },
                { num: '02', title: 'Configure Terms', desc: 'Set beneficiaries, asset allocations, check-in frequency, and grace periods.' },
                { num: '03', title: 'Deploy Contract', desc: 'Your will is deployed as a smart contract, encrypted with zero-knowledge proofs.' },
                { num: '04', title: 'Stay Active', desc: 'Check in periodically. Miss the deadline, and assets transfer automatically.' }
              ].map((step, i) => (
                <div key={i} className="step-card">
                  <div className="font-serif text-5xl font-light text-gold/30 leading-none">
                    {step.num}
                  </div>
                  <div>
                    <h4 className="font-serif text-2xl font-medium mb-2">
                      {step.title}
                    </h4>
                    <p className="font-sans text-sm leading-relaxed text-cream-muted font-light">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-6 lg:px-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-section font-light mb-8">
            Secure Your Legacy<br />
            <span className="gradient-text font-medium">Today</span>
          </h2>
          <p className="font-sans text-lg leading-relaxed text-cream-muted mb-12 font-light max-w-2xl mx-auto">
            Join thousands who have already protected their digital assets with
            cryptographic certainty. Your legacy deserves nothing less.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleProtectedNavigation('/create')}
              isLoading={connecting}
            >
              Create Your Will
            </Button>
            <Link href="#how-it-works">
              <Button variant="secondary" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
