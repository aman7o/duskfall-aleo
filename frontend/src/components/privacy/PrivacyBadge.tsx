'use client';

import { Shield, Eye, EyeOff, Lock, Unlock, CheckCircle2 } from 'lucide-react';

export type PrivacyLevel = 'fully-private' | 'selective-disclosure' | 'public-verification';

interface PrivacyBadgeProps {
  level: PrivacyLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const PRIVACY_CONFIG = {
  'fully-private': {
    label: 'Fully Private',
    description: 'Beneficiary identities are hidden on-chain',
    icon: EyeOff,
    color: 'text-accent-green',
    bgColor: 'bg-accent-green/10',
    borderColor: 'border-accent-green/20',
  },
  'selective-disclosure': {
    label: 'Selective Disclosure',
    description: 'Owner can prove ownership without revealing details',
    icon: Eye,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
  'public-verification': {
    label: 'Public Verification',
    description: 'Anyone can verify trigger conditions',
    icon: CheckCircle2,
    color: 'text-accent-blue',
    bgColor: 'bg-accent-blue/10',
    borderColor: 'border-accent-blue/20',
  },
};

const SIZE_CONFIG = {
  sm: {
    iconSize: 'w-3 h-3',
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    gap: 'gap-1',
  },
  md: {
    iconSize: 'w-4 h-4',
    padding: 'px-2.5 py-1',
    text: 'text-sm',
    gap: 'gap-1.5',
  },
  lg: {
    iconSize: 'w-5 h-5',
    padding: 'px-3 py-1.5',
    text: 'text-base',
    gap: 'gap-2',
  },
};

export function PrivacyBadge({
  level,
  size = 'md',
  showLabel = true,
  className = '',
}: PrivacyBadgeProps) {
  const config = PRIVACY_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center ${sizeConfig.gap} ${sizeConfig.padding} rounded-full ${config.bgColor} border ${config.borderColor} ${className}`}
      title={config.description}
    >
      <Icon className={`${sizeConfig.iconSize} ${config.color}`} />
      {showLabel && (
        <span className={`${sizeConfig.text} font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// Privacy status card showing all active privacy features
interface PrivacyStatusCardProps {
  features: {
    beneficiaryPrivacy: boolean;
    selectiveDisclosure: boolean;
    publicVerification: boolean;
    encryptedSecrets: boolean;
    hashCommitments: boolean;
  };
  className?: string;
}

export function PrivacyStatusCard({ features, className = '' }: PrivacyStatusCardProps) {
  const privacyFeatures = [
    {
      key: 'beneficiaryPrivacy',
      label: 'Beneficiary Privacy',
      description: 'Beneficiary addresses are encrypted on-chain',
      enabled: features.beneficiaryPrivacy,
      icon: EyeOff,
    },
    {
      key: 'selectiveDisclosure',
      label: 'Selective Disclosure',
      description: 'Prove ownership without revealing allocations',
      enabled: features.selectiveDisclosure,
      icon: Eye,
    },
    {
      key: 'publicVerification',
      label: 'Public Verification',
      description: 'Trigger conditions are publicly verifiable',
      enabled: features.publicVerification,
      icon: CheckCircle2,
    },
    {
      key: 'encryptedSecrets',
      label: 'Encrypted Secrets',
      description: 'Private messages encrypted for beneficiaries',
      enabled: features.encryptedSecrets,
      icon: Lock,
    },
    {
      key: 'hashCommitments',
      label: 'Hash Commitments',
      description: 'Allocations verified via hash proofs',
      enabled: features.hashCommitments,
      icon: Shield,
    },
  ];

  const enabledCount = Object.values(features).filter(Boolean).length;

  return (
    <div className={`p-4 bg-background-secondary rounded-xl border border-border ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent-green" />
          <h3 className="font-semibold text-text-primary">Privacy Status</h3>
        </div>
        <PrivacyBadge
          level={enabledCount >= 4 ? 'fully-private' : enabledCount >= 2 ? 'selective-disclosure' : 'public-verification'}
          size="sm"
        />
      </div>

      <div className="space-y-3">
        {privacyFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.key}
              className={`flex items-start gap-3 p-2 rounded-lg ${
                feature.enabled ? 'bg-accent-green/5' : 'bg-background-tertiary'
              }`}
            >
              <div className={`p-1.5 rounded-md ${feature.enabled ? 'bg-accent-green/10' : 'bg-background-tertiary'}`}>
                <Icon
                  className={`w-4 h-4 ${feature.enabled ? 'text-accent-green' : 'text-text-tertiary'}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${feature.enabled ? 'text-text-primary' : 'text-text-tertiary'}`}>
                    {feature.label}
                  </span>
                  {feature.enabled && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
                  )}
                </div>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-text-tertiary">
          {enabledCount} of {privacyFeatures.length} privacy features enabled
        </p>
        <div className="h-1.5 bg-background-tertiary rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-accent-green rounded-full transition-all duration-500"
            style={{ width: `${(enabledCount / privacyFeatures.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Compact privacy indicator for headers
interface PrivacyIndicatorProps {
  isPrivate: boolean;
  className?: string;
}

export function PrivacyIndicator({ isPrivate, className = '' }: PrivacyIndicatorProps) {
  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      title={isPrivate ? 'This data is encrypted on-chain' : 'This data is public'}
    >
      {isPrivate ? (
        <>
          <Lock className="w-3.5 h-3.5 text-accent-green" />
          <span className="text-xs text-accent-green">Private</span>
        </>
      ) : (
        <>
          <Unlock className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-xs text-text-tertiary">Public</span>
        </>
      )}
    </div>
  );
}
