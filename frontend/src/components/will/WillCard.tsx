'use client';

import { Clock, AlertTriangle, CheckCircle, Coins } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { UIWill, formatCredits, blocksToTime, blocksToDays, STATUS_LABELS, WillStatus } from '@/types';

interface WillCardProps {
  will: UIWill;
}

export default function WillCard({ will }: WillCardProps) {
  // Guard against null/undefined will
  if (!will) {
    return null;
  }

  // Calculate progress as percentage of time elapsed
  const totalPeriod = Number(will.checkInPeriod + will.gracePeriod);
  const elapsed = totalPeriod - Number(will.blocksRemaining);
  // Prevent division by zero
  const progress = totalPeriod > 0
    ? Math.min(100, Math.max(0, (elapsed / totalPeriod) * 100))
    : 0;
  const isUrgent = progress > 75;

  return (
    <Card variant="bordered" className="relative overflow-hidden">
      {/* Subtle background gradient based on status */}
      <div className={`absolute inset-0 opacity-50 pointer-events-none ${
        isUrgent ? 'bg-gradient-to-br from-accent-red/5 to-transparent' : 'bg-gradient-to-br from-accent-green/5 to-transparent'
      }`} />

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-background-tertiary">
        <div
          className={`h-full transition-all duration-1000 ${
            isUrgent ? 'bg-gradient-to-r from-accent-red to-accent-yellow' : progress > 50 ? 'bg-gradient-to-r from-accent-yellow to-accent-green' : 'bg-gradient-to-r from-accent-green to-primary'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Your Will</CardTitle>
            <p className="text-sm text-text-tertiary mt-1">
              Status: {will.status === WillStatus.ACTIVE ? (
                <span className="text-accent-green">Active</span>
              ) : will.status === WillStatus.TRIGGERED ? (
                <span className="text-accent-red">Triggered</span>
              ) : (
                <span className="text-text-tertiary">{STATUS_LABELS[will.status]}</span>
              )}
            </p>
          </div>
          {will.status === WillStatus.ACTIVE && (
            <div className="p-2 bg-accent-green/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-accent-green" />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Locked */}
          <div className="flex items-start gap-4 p-4 bg-background-tertiary/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
            <div className="p-3 bg-primary/10 rounded-xl shadow-lg shadow-primary/10">
              <Coins className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-tertiary">Total Locked</p>
              <p className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
                {formatCredits(will.totalLocked)}
              </p>
            </div>
          </div>

          {/* Time Remaining */}
          <div className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
            isUrgent ? 'bg-accent-red/5 border-accent-red/20 hover:border-accent-red/40' : 'bg-accent-yellow/5 border-accent-yellow/20 hover:border-accent-yellow/40'
          }`}>
            <div className={`p-3 rounded-xl shadow-lg ${
              isUrgent ? 'bg-accent-red/10 shadow-accent-red/10' : 'bg-accent-yellow/10 shadow-accent-yellow/10'
            }`}>
              {isUrgent ? (
                <AlertTriangle className="w-6 h-6 text-accent-red" />
              ) : (
                <Clock className="w-6 h-6 text-accent-yellow" />
              )}
            </div>
            <div>
              <p className="text-sm text-text-tertiary">Time Until Deadline</p>
              <p className={`text-2xl font-bold mt-1 tracking-tight ${
                isUrgent ? 'text-accent-red' : 'text-accent-yellow'
              }`}>
                {will.timeRemaining}
              </p>
            </div>
          </div>

          {/* Beneficiaries */}
          <div className="flex items-start gap-4 p-4 bg-accent-purple/5 rounded-xl border border-accent-purple/20 hover:border-accent-purple/40 transition-colors">
            <div className="p-3 bg-accent-purple/10 rounded-xl shadow-lg shadow-accent-purple/10">
              <svg className="w-6 h-6 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-tertiary">Beneficiaries</p>
              <p className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
                {will.numBeneficiaries}
              </p>
            </div>
          </div>
        </div>

        {/* Warning message if urgent */}
        {isUrgent && will.status === WillStatus.ACTIVE && (
          <div className="mt-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-accent-red">
                  Action Required
                </p>
                <p className="text-sm text-text-tertiary mt-1">
                  Your deadline is approaching. Please check in to prevent asset distribution.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
