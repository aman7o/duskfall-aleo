'use client';

import { ButtonHTMLAttributes, forwardRef, useState, useCallback, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

interface RippleEffect {
  x: number;
  y: number;
  id: number;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient' | 'success';
  size?: 'mini' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  enableRipple?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Ripple Effect Component (art-factory pattern)
 */
function ButtonRipple({ ripples }: { ripples: RippleEffect[] }) {
  return (
    <>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute animate-ripple bg-white/30 rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '10px',
            height: '10px',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </>
  );
}

/**
 * Loading Spinner Component
 */
function LoadingSpinner({ size }: { size: 'mini' | 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    mini: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <svg
      className={cn('animate-spin', sizeClasses[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Reusable Button Component with Ripple Effect
 *
 * Enhanced with:
 * - Ripple click effect (art-factory pattern)
 * - Loading states with custom text
 * - Icon support (left/right)
 * - Multiple size and color variants
 *
 * Usage:
 * <Button variant="primary" size="lg" onClick={handleClick} enableRipple>
 *   Click Me
 * </Button>
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      loadingText,
      enableRipple = true,
      leftIcon,
      rightIcon,
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<RippleEffect[]>([]);

    const handleClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        if (enableRipple && !disabled && !isLoading) {
          const button = e.currentTarget;
          const rect = button.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const rippleId = Date.now();

          setRipples((prev) => [...prev, { x, y, id: rippleId }]);

          // Remove ripple after animation
          setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== rippleId));
          }, 600);
        }

        if (onClick && !disabled && !isLoading) {
          onClick(e);
        }
      },
      [enableRipple, disabled, isLoading, onClick]
    );

    const baseStyles =
      'inline-flex items-center justify-center font-sans font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden select-none';

    const variants = {
      primary:
        'bg-gradient-to-r from-gold to-gold-dark text-background uppercase tracking-[1.5px] hover:shadow-gold-glow active:scale-[0.98]',
      secondary:
        'bg-transparent text-cream border border-cream/30 uppercase tracking-[1.5px] hover:border-gold hover:text-gold active:scale-[0.98]',
      outline:
        'border border-gold/50 text-gold hover:bg-gold/10 hover:border-gold active:scale-[0.98]',
      ghost:
        'text-cream-secondary hover:text-gold hover:bg-gold/5 active:bg-gold/10',
      danger:
        'bg-accent-red text-white hover:bg-red-600 shadow-lg shadow-red-500/30 active:scale-[0.98]',
      gradient:
        'bg-gradient-to-r from-gold via-gold-light to-gold text-background uppercase tracking-[1.5px] shadow-gold-glow hover:shadow-xl active:scale-[0.98]',
      success:
        'bg-accent-green text-white hover:bg-green-600 shadow-lg shadow-green-500/30 active:scale-[0.98]',
    };

    const sizes = {
      mini: 'px-2.5 py-1 text-[10px] gap-1',
      sm: 'px-4 py-2 text-[11px] gap-1.5',
      md: 'px-6 py-3 text-[12px] gap-2',
      lg: 'px-8 py-4 text-[13px] gap-2.5',
    };

    const iconSizes = {
      mini: 'h-3 w-3',
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        onClick={handleClick}
        {...props}
      >
        {/* Ripple effects */}
        <ButtonRipple ripples={ripples} />

        {/* Content */}
        {isLoading ? (
          <>
            <LoadingSpinner size={size} />
            <span className="ml-2">{loadingText || 'Processing...'}</span>
          </>
        ) : (
          <>
            {leftIcon && (
              <span className={cn('flex-shrink-0', iconSizes[size])}>
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className={cn('flex-shrink-0', iconSizes[size])}>
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

/**
 * Icon Button - compact button for icon-only actions
 */
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> & {
    icon: React.ReactNode;
    'aria-label': string;
  }
>(({ icon, className, size = 'md', ...props }, ref) => {
  const iconSizes = {
    mini: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <Button
      ref={ref}
      className={cn('!p-0 rounded-full', iconSizes[size], className)}
      size={size}
      {...props}
    >
      {icon}
    </Button>
  );
});

IconButton.displayName = 'IconButton';

/**
 * Button Group - for grouping related buttons
 */
export function ButtonGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex rounded-lg overflow-hidden [&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:last-child)]:border-r-0',
        className
      )}
    >
      {children}
    </div>
  );
}
