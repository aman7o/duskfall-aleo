'use client';

import { useState } from 'react';
import { Shield, Eye, EyeOff, Copy, CheckCircle2, AlertCircle, Key, Lock, Unlock, ChevronRight, ExternalLink } from 'lucide-react';

interface SelectiveDisclosureProps {
  willId: string;
  ownerAddress: string;
  onGenerateProof?: (proofType: ProofType) => Promise<string>;
  className?: string;
}

type ProofType = 'ownership' | 'beneficiary-status' | 'allocation-proof';

interface ProofOption {
  type: ProofType;
  title: string;
  description: string;
  reveals: string[];
  hides: string[];
  icon: typeof Shield;
  disabled?: boolean;
}

const PROOF_OPTIONS: ProofOption[] = [
  {
    type: 'ownership',
    title: 'Prove Will Ownership',
    description: 'Generate a proof that you own this will without revealing its contents',
    reveals: ['You own a will with this ID', 'The will is active'],
    hides: ['Beneficiaries', 'Allocations', 'Locked amount', 'Check-in schedule'],
    icon: Key,
  },
  {
    type: 'beneficiary-status',
    title: 'Prove Beneficiary Status',
    description: 'Prove you are a beneficiary of a will without revealing your share',
    reveals: ['You are listed as a beneficiary', 'The will exists'],
    hides: ['Your allocation percentage', 'Other beneficiaries', 'Total locked amount'],
    icon: Shield,
  },
  {
    type: 'allocation-proof',
    title: 'Prove Minimum Allocation',
    description: 'Prove you have at least X% allocation without revealing exact amount',
    reveals: ['You have at least the stated percentage', 'The will is valid'],
    hides: ['Exact allocation', 'Other details'],
    icon: Eye,
    disabled: true, // Feature coming soon
  },
];

export default function SelectiveDisclosure({
  willId,
  ownerAddress,
  onGenerateProof,
  className = '',
}: SelectiveDisclosureProps) {
  const [selectedProof, setSelectedProof] = useState<ProofType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateProof = async (proofType: ProofType) => {
    if (!onGenerateProof) {
      // Simulate proof generation with mock data
      setGenerating(true);
      setError(null);
      setSelectedProof(proofType);

      try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate a mock proof
        const mockProof = generateMockProof(proofType, willId, ownerAddress);
        setGeneratedProof(mockProof);
      } catch (err) {
        setError('Failed to generate proof. Please try again.');
      } finally {
        setGenerating(false);
      }
      return;
    }

    setGenerating(true);
    setError(null);
    setSelectedProof(proofType);

    try {
      const proof = await onGenerateProof(proofType);
      setGeneratedProof(proof);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate proof');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedProof) return;

    try {
      await navigator.clipboard.writeText(generatedProof);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const resetProof = () => {
    setGeneratedProof(null);
    setSelectedProof(null);
    setError(null);
  };

  return (
    <div className={`bg-background-secondary rounded-xl border border-border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Eye className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Selective Disclosure</h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Generate proofs to share specific information without revealing everything
            </p>
          </div>
        </div>
      </div>

      {/* Proof Options or Generated Proof */}
      <div className="p-4">
        {!generatedProof ? (
          <div className="space-y-3">
            {PROOF_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedProof === option.type;
              const isGenerating = generating && isSelected;

              return (
                <button
                  key={option.type}
                  onClick={() => !option.disabled && handleGenerateProof(option.type)}
                  disabled={option.disabled || generating}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    option.disabled
                      ? 'bg-background-tertiary border-border opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-background-primary border-border hover:border-primary/30 hover:bg-background-tertiary'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-background-tertiary'}`}>
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-text-secondary'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-text-primary">{option.title}</span>
                        {option.disabled && (
                          <span className="text-xs px-2 py-0.5 bg-background-tertiary rounded text-text-tertiary">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-tertiary mt-1">{option.description}</p>

                      {isSelected && !isGenerating && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <Eye className="w-3.5 h-3.5 text-accent-green mt-0.5 shrink-0" />
                            <div>
                              <span className="text-xs font-medium text-accent-green">Reveals:</span>
                              <ul className="text-xs text-text-tertiary mt-0.5">
                                {option.reveals.map((r, i) => (
                                  <li key={i}>• {r}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <EyeOff className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <div>
                              <span className="text-xs font-medium text-primary">Keeps Private:</span>
                              <ul className="text-xs text-text-tertiary mt-0.5">
                                {option.hides.map((h, i) => (
                                  <li key={i}>• {h}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {isGenerating && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-primary">Generating proof...</span>
                        </div>
                      )}
                    </div>
                    {!option.disabled && !generating && (
                      <ChevronRight className="w-5 h-5 text-text-tertiary shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}

            {error && (
              <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-accent-red" />
                  <span className="text-sm text-accent-red">{error}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success Message */}
            <div className="p-3 bg-accent-green/10 border border-accent-green/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-green" />
                <span className="text-sm font-medium text-accent-green">Proof Generated Successfully</span>
              </div>
            </div>

            {/* Proof Display */}
            <div className="relative">
              <pre className="p-4 bg-background-tertiary rounded-lg overflow-x-auto text-xs text-text-secondary font-mono whitespace-pre-wrap break-all">
                {generatedProof}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-background-secondary rounded-lg hover:bg-background-primary transition-colors"
                title="Copy proof"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-accent-green" />
                ) : (
                  <Copy className="w-4 h-4 text-text-tertiary" />
                )}
              </button>
            </div>

            {/* Info */}
            <div className="p-3 bg-background-tertiary rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-text-tertiary">
                  Share this proof with anyone who needs to verify your claim. They can verify it on-chain
                  without you revealing any additional information.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={resetProof}
                className="flex-1 px-4 py-2 bg-background-tertiary hover:bg-background-primary text-text-secondary rounded-lg transition-colors text-sm font-medium"
              >
                Generate Another
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Proof
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to generate mock proof for demo
function generateMockProof(proofType: ProofType, willId: string, ownerAddress: string): string {
  const timestamp = Date.now();
  const proofData = {
    version: '1.0.0',
    type: proofType,
    timestamp,
    proof: {
      willIdCommitment: hashString(`${willId}_${timestamp}`),
      proverCommitment: hashString(`${ownerAddress}_${proofType}_${timestamp}`),
      zkProof: generateRandomHex(256),
      publicInputs: [
        hashString(willId),
        proofType === 'ownership' ? '1' : '0', // is_owner flag
        proofType === 'beneficiary-status' ? '1' : '0', // is_beneficiary flag
      ],
    },
    metadata: {
      network: 'testnet',
      program: 'digital_will_v7.aleo',
      generatedAt: new Date(timestamp).toISOString(),
    },
  };

  return JSON.stringify(proofData, null, 2);
}

function hashString(input: string): string {
  let hash = 0n;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31n + BigInt(input.charCodeAt(i))) % (2n ** 253n);
  }
  return hash.toString(16).padStart(64, '0');
}

function generateRandomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Compact disclosure toggle for inline use
interface DisclosureToggleProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  description?: string;
  className?: string;
}

export function DisclosureToggle({
  label,
  enabled,
  onChange,
  description,
  className = '',
}: DisclosureToggleProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {enabled ? (
            <Unlock className="w-4 h-4 text-accent-green" />
          ) : (
            <Lock className="w-4 h-4 text-text-tertiary" />
          )}
          <span className="text-sm font-medium text-text-primary">{label}</span>
        </div>
        {description && (
          <p className="text-xs text-text-tertiary mt-0.5 ml-6">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-accent-green' : 'bg-background-tertiary'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}
