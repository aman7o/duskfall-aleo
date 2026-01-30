'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Bell, BellOff, AlertTriangle } from 'lucide-react';
import { BLOCK_TIME_SECONDS } from '@/types';

interface CountdownTimerProps {
  deadline: bigint;
  blocksRemaining: bigint;
  totalBlocks?: bigint; // Total blocks from check-in to deadline (for progress)
  onExpire?: () => void;
  showProgressRing?: boolean;
  showNotificationToggle?: boolean;
  compact?: boolean;
}

interface TimeState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

function getTimeFromBlocks(blocks: bigint): TimeState {
  const totalSeconds = Number(blocks) * BLOCK_TIME_SECONDS;

  if (totalSeconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return { days, hours, minutes, seconds, isExpired: false, totalSeconds };
}

/**
 * Progress Ring SVG Component
 */
function ProgressRing({ progress, isUrgent }: { progress: number; isUrgent: boolean }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
      {/* Background circle */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-border"
      />
      {/* Progress circle */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className={`transition-all duration-1000 ${
          isUrgent ? 'text-accent-yellow' : 'text-primary'
        }`}
      />
    </svg>
  );
}

/**
 * Time Unit Display Component
 */
function TimeUnit({
  value,
  label,
  isUrgent,
  isAnimated,
}: {
  value: number;
  label: string;
  isUrgent: boolean;
  isAnimated: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`bg-background-tertiary border rounded-xl p-3 md:p-5 transition-all duration-300 hover:scale-105 ${
          isUrgent
            ? 'border-accent-yellow/30 shadow-lg shadow-accent-yellow/10'
            : 'border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10'
        } ${isAnimated && isUrgent ? 'animate-urgency-pulse' : ''}`}
      >
        <p
          className={`text-3xl md:text-5xl font-bold tabular-nums tracking-tight ${
            isUrgent ? 'text-accent-yellow' : 'text-text-primary'
          }`}
        >
          {String(value).padStart(2, '0')}
        </p>
      </div>
      <p className="text-xs text-text-tertiary mt-3 uppercase tracking-wider font-medium">
        {label}
      </p>
    </div>
  );
}

/**
 * Compact Countdown Display
 */
function CompactCountdown({ time, isUrgent }: { time: TimeState; isUrgent: boolean }) {
  const formatTime = () => {
    if (time.days > 0) {
      return `${time.days}d ${time.hours}h`;
    }
    if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m`;
    }
    return `${time.minutes}m ${time.seconds}s`;
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
        isUrgent ? 'bg-accent-yellow/10 text-accent-yellow' : 'bg-primary/10 text-primary'
      }`}
    >
      {isUrgent && <AlertTriangle className="w-4 h-4" />}
      <span className="font-mono font-medium">{formatTime()}</span>
    </div>
  );
}

export default function CountdownTimer({
  deadline,
  blocksRemaining,
  totalBlocks,
  onExpire,
  showProgressRing = false,
  showNotificationToggle = false,
  compact = false,
}: CountdownTimerProps) {
  const [time, setTime] = useState<TimeState>(getTimeFromBlocks(blocksRemaining));
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  // Track if expire callback has been called to prevent duplicate calls
  const hasExpiredRef = useRef(false);
  // Store onExpire in a ref to avoid stale closures in setInterval
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Get initial total seconds for progress calculation
  // Use the greater of current remaining time or the actual initial value
  const [initialTotalSeconds, setInitialTotalSeconds] = useState(() => {
    const initial = getTimeFromBlocks(blocksRemaining).totalSeconds;
    return initial > 0 ? initial : 1; // Prevent division by zero
  });

  // Update initial if blocksRemaining increases (e.g., after check-in)
  useEffect(() => {
    const newTotal = getTimeFromBlocks(blocksRemaining).totalSeconds;
    if (newTotal > initialTotalSeconds) {
      setInitialTotalSeconds(newTotal);
    }
    // Also reset time state when blocksRemaining changes
    setTime(getTimeFromBlocks(blocksRemaining));
  }, [blocksRemaining, initialTotalSeconds]);

  // Calculate progress (0 to 1, where 1 is complete/expired)
  const progress = initialTotalSeconds > 0
    ? Math.max(0, Math.min(1, 1 - (time.totalSeconds / initialTotalSeconds)))
    : 1;

  // Reset hasExpiredRef when blocksRemaining changes (e.g., after check-in)
  useEffect(() => {
    if (blocksRemaining > 0n) {
      hasExpiredRef.current = false;
    }
  }, [blocksRemaining]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        let totalSeconds = prev.totalSeconds - 1;
        totalSeconds = Math.max(0, totalSeconds);

        if (totalSeconds <= 0) {
          // Only call onExpire once to prevent duplicate calls
          if (!hasExpiredRef.current && onExpireRef.current) {
            hasExpiredRef.current = true;
            onExpireRef.current();
          }
          clearInterval(interval);
          return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
        }

        return {
          days: Math.floor(totalSeconds / 86400),
          hours: Math.floor((totalSeconds % 86400) / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: Math.floor(totalSeconds % 60),
          isExpired: false,
          totalSeconds,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [blocksRemaining]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  // Toggle notifications
  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        // Show confirmation notification
        new Notification('Duskfall Reminders Enabled', {
          body: 'You will be notified before your deadline expires.',
          icon: '/favicon.ico',
        });
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  // Check for notification triggers
  useEffect(() => {
    if (!notificationsEnabled) return;

    // Notify at specific thresholds
    const thresholds = [
      { seconds: 86400, message: '24 hours remaining until deadline' },
      { seconds: 3600, message: '1 hour remaining until deadline' },
      { seconds: 600, message: '10 minutes remaining until deadline' },
    ];

    for (const threshold of thresholds) {
      // FIX: Use range check instead of exact match to avoid missing thresholds
      // when timer skips a second (e.g., tab throttling, slow renders)
      if (time.totalSeconds <= threshold.seconds && time.totalSeconds > threshold.seconds - 2) {
        new Notification('Duskfall Deadline Alert', {
          body: threshold.message,
          icon: '/favicon.ico',
          requireInteraction: true,
        });
        break;
      }
    }
  }, [time.totalSeconds, notificationsEnabled]);

  const isUrgent = time.days === 0 && time.hours < 24;
  const isCritical = time.days === 0 && time.hours === 0 && time.minutes < 30;

  // Compact mode
  if (compact) {
    if (time.isExpired) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-accent-red/10 text-accent-red text-sm font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          Expired
        </span>
      );
    }
    return <CompactCountdown time={time} isUrgent={isUrgent} />;
  }

  // Expired state
  if (time.isExpired) {
    return (
      <Card variant="bordered" className="bg-accent-red/10 border-accent-red/20">
        <CardContent className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-red/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-accent-red" />
          </div>
          <p className="text-2xl font-bold text-accent-red">Deadline Expired</p>
          <p className="text-sm text-text-tertiary mt-2">
            Beneficiaries can now trigger the will and claim their assets
          </p>
        </CardContent>
      </Card>
    );
  }

  const timeUnits = [
    { label: 'Days', value: time.days, urgent: false },
    { label: 'Hours', value: time.hours, urgent: isUrgent },
    { label: 'Minutes', value: time.minutes, urgent: isUrgent },
    { label: 'Seconds', value: time.seconds, urgent: isCritical },
  ];

  return (
    <Card variant="bordered" className="relative overflow-hidden">
      {/* Background gradient for urgency */}
      {isUrgent && (
        <div className="absolute inset-0 bg-gradient-to-br from-accent-yellow/5 to-transparent pointer-events-none" />
      )}

      {/* Optional progress ring overlay */}
      {showProgressRing && (
        <div className="absolute top-4 right-4 w-12 h-12">
          <ProgressRing progress={progress} isUrgent={isUrgent} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-text-secondary">
            {Math.round(progress * 100)}%
          </span>
        </div>
      )}

      <CardContent className="py-8 relative">
        {/* Header with notification toggle */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <p className="text-sm text-text-tertiary uppercase tracking-wider font-medium">
            Time Until Deadline
          </p>
          {showNotificationToggle && (
            <button
              onClick={handleToggleNotifications}
              className={`p-1.5 rounded-lg transition-colors ${
                notificationsEnabled
                  ? 'bg-primary/10 text-primary'
                  : 'bg-background-tertiary text-text-tertiary hover:text-text-secondary'
              }`}
              title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
            >
              {notificationsEnabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Urgency warning banner */}
        {isCritical && (
          <div className="mb-6 p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent-red animate-pulse" />
            <span className="text-sm font-medium text-accent-red">
              Check in now to prevent will trigger!
            </span>
          </div>
        )}

        {/* Time units grid */}
        <div className="grid grid-cols-4 gap-3 md:gap-6">
          {timeUnits.map((unit, index) => (
            <TimeUnit
              key={unit.label}
              value={unit.value}
              label={unit.label}
              isUrgent={unit.urgent}
              isAnimated={isCritical && index >= 2}
            />
          ))}
        </div>

        {/* Progress bar (alternative to ring) */}
        {!showProgressRing && (
          <div className="mt-6 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${
                isUrgent ? 'bg-accent-yellow' : 'bg-primary'
              }`}
              style={{ width: `${(1 - progress) * 100}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact countdown for inline use
 */
export function InlineCountdown({
  blocksRemaining,
  className = '',
}: {
  blocksRemaining: bigint;
  className?: string;
}) {
  const [time, setTime] = useState(getTimeFromBlocks(blocksRemaining));

  // Reset time when blocksRemaining changes (e.g., after check-in)
  useEffect(() => {
    setTime(getTimeFromBlocks(blocksRemaining));
  }, [blocksRemaining]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        const totalSeconds = Math.max(0, prev.totalSeconds - 1);
        if (totalSeconds <= 0) {
          clearInterval(interval);
          return { ...prev, isExpired: true, totalSeconds: 0 };
        }
        return {
          days: Math.floor(totalSeconds / 86400),
          hours: Math.floor((totalSeconds % 86400) / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: Math.floor(totalSeconds % 60),
          isExpired: false,
          totalSeconds,
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [blocksRemaining]);

  const isUrgent = time.days === 0 && time.hours < 24;

  if (time.isExpired) {
    return <span className={`text-accent-red font-medium ${className}`}>Expired</span>;
  }

  const formatTime = () => {
    if (time.days > 0) return `${time.days}d ${time.hours}h`;
    if (time.hours > 0) return `${time.hours}h ${time.minutes}m`;
    return `${time.minutes}m ${time.seconds}s`;
  };

  return (
    <span className={`font-mono ${isUrgent ? 'text-accent-yellow' : 'text-text-secondary'} ${className}`}>
      {formatTime()}
    </span>
  );
}
