'use client';

import { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, CheckCircle2, ChevronDown, ChevronUp, Info, Zap } from 'lucide-react';

interface ZKProofExplainerProps {
  className?: string;
  defaultExpanded?: boolean;
}

interface DataItem {
  label: string;
  description: string;
  encrypted: boolean;
}

const ENCRYPTED_DATA: DataItem[] = [
  {
    label: 'Beneficiary Addresses',
    description: 'Real addresses stored in private records, only hashes visible on-chain',
    encrypted: true,
  },
  {
    label: 'Share Allocations',
    description: 'Percentage shares encrypted, verified via hash commitments',
    encrypted: true,
  },
  {
    label: 'Private Messages',
    description: 'Encrypted messages that only beneficiaries can decrypt',
    encrypted: true,
  },
  {
    label: 'Will Configuration',
    description: 'Stored as private record owned by will creator',
    encrypted: true,
  },
];

const PUBLIC_DATA: DataItem[] = [
  {
    label: 'Will Status',
    description: 'Active, triggered, or claimed - publicly verifiable',
    encrypted: false,
  },
  {
    label: 'Last Check-In Block',
    description: 'When the owner last proved they are alive',
    encrypted: false,
  },
  {
    label: 'Total Locked Amount',
    description: 'Sum of all deposits (required for trigger verification)',
    encrypted: false,
  },
  {
    label: 'Deadline',
    description: 'Block height when trigger becomes possible',
    encrypted: false,
  },
];

export default function ZKProofExplainer({
  className = '',
  defaultExpanded = false,
}: ZKProofExplainerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'encrypted' | 'public' | 'claims'>('encrypted');

  return (
    <div className={`bg-background-secondary rounded-xl border border-border overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-background-tertiary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-text-primary">How ZK Privacy Works</h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Understanding what&apos;s private vs. public in your will
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-text-tertiary" />
        ) : (
          <ChevronDown className="w-5 h-5 text-text-tertiary" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg mb-4">
            <button
              onClick={() => setActiveTab('encrypted')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'encrypted'
                  ? 'bg-background-primary text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <EyeOff className="w-4 h-4 inline-block mr-1.5" />
              Encrypted
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'public'
                  ? 'bg-background-primary text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <Eye className="w-4 h-4 inline-block mr-1.5" />
              Public
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'claims'
                  ? 'bg-background-primary text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <Zap className="w-4 h-4 inline-block mr-1.5" />
              Claims
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'encrypted' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-accent-green" />
                <span className="text-sm font-medium text-text-primary">What&apos;s Encrypted</span>
              </div>
              {ENCRYPTED_DATA.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-accent-green/5 border border-accent-green/10 rounded-lg"
                >
                  <div className="p-1 bg-accent-green/10 rounded">
                    <Lock className="w-3.5 h-3.5 text-accent-green" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'public' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-accent-blue" />
                <span className="text-sm font-medium text-text-primary">What&apos;s Publicly Verifiable</span>
              </div>
              {PUBLIC_DATA.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-accent-blue/5 border border-accent-blue/10 rounded-lg"
                >
                  <div className="p-1 bg-accent-blue/10 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-background-tertiary rounded-lg mt-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-text-tertiary shrink-0 mt-0.5" />
                  <p className="text-xs text-text-tertiary">
                    Public data enables trustless verification - anyone can confirm when a will can be triggered,
                    without knowing who the beneficiaries are.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'claims' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-text-primary">How Claims Work</span>
              </div>

              {/* Flow Diagram */}
              <div className="relative">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                    1
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="text-sm font-medium text-text-primary">Will Gets Triggered</p>
                    <p className="text-xs text-text-tertiary mt-1">
                      After the deadline passes, anyone can trigger the will on-chain.
                      The trigger verifies the deadline has passed using public mappings.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                    2
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="text-sm font-medium text-text-primary">Beneficiary Initiates Claim</p>
                    <p className="text-xs text-text-tertiary mt-1">
                      Beneficiary submits a claim with their private Beneficiary record.
                      The record proves their allocation without revealing it to others.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                    3
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="text-sm font-medium text-text-primary">ZK Proof Verification</p>
                    <p className="text-xs text-text-tertiary mt-1">
                      The contract verifies: (a) the beneficiary is in the will via hash commitment,
                      (b) the allocation matches, (c) they haven&apos;t claimed before.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-green flex items-center justify-center text-white text-sm font-bold shrink-0">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">Funds Transferred</p>
                    <p className="text-xs text-text-tertiary mt-1">
                      Credits are sent to the beneficiary. The transaction is visible,
                      but the connection to the original will remains private.
                    </p>
                  </div>
                </div>

                {/* Connecting line */}
                <div className="absolute left-4 top-8 w-0.5 h-[calc(100%-40px)] bg-border -translate-x-1/2" />
              </div>

              {/* Key Privacy Guarantee */}
              <div className="p-3 bg-accent-green/5 border border-accent-green/10 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary">
                    <span className="font-medium text-accent-green">Key Privacy Guarantee:</span>{' '}
                    Beneficiaries can claim their share without other beneficiaries knowing who they are
                    or how much they received. Only the will creator knows the full allocation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
export function ZKInfoTooltip({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="p-1 rounded-full hover:bg-background-tertiary transition-colors"
      >
        <Info className="w-4 h-4 text-text-tertiary" />
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-background-primary border border-border rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-text-primary">Zero-Knowledge Privacy</span>
          </div>
          <p className="text-xs text-text-tertiary">
            This data is protected by ZK proofs. It can be verified without revealing the actual values.
          </p>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-background-primary border-r border-b border-border" />
        </div>
      )}
    </div>
  );
}
