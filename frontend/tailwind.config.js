/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Luxury dark backgrounds
        background: {
          DEFAULT: '#0a0a0f',
          secondary: '#111115',
          tertiary: '#18181c',
        },
        // Gold primary palette
        gold: {
          DEFAULT: '#c9a962',
          dark: '#8b7355',
          light: '#d4b876',
          muted: 'rgba(201, 169, 98, 0.3)',
        },
        // Keep primary as alias for gold for compatibility
        primary: {
          DEFAULT: '#c9a962',
          hover: '#d4b876',
          dark: '#8b7355',
          light: '#d4b876',
        },
        // Accent colors
        accent: {
          green: '#4ade80',
          red: '#ef4444',
          yellow: '#f59e0b',
          purple: '#8b5cf6',
          blue: 'rgba(100, 100, 180, 0.6)',
        },
        // Cream text palette
        cream: {
          DEFAULT: '#faf9f6',
          secondary: 'rgba(250, 249, 246, 0.7)',
          muted: 'rgba(250, 249, 246, 0.5)',
          faint: 'rgba(250, 249, 246, 0.4)',
        },
        // Keep text alias for compatibility
        text: {
          primary: '#faf9f6',
          secondary: 'rgba(250, 249, 246, 0.7)',
          tertiary: 'rgba(250, 249, 246, 0.5)',
        },
        // Subtle borders
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          light: 'rgba(255, 255, 255, 0.1)',
          gold: 'rgba(201, 169, 98, 0.3)',
        },
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        // Aliases for the design
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
        body: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero': ['76px', { lineHeight: '1.05', letterSpacing: '-1px' }],
        'section': ['52px', { lineHeight: '1.2' }],
        'card-title': ['28px', { lineHeight: '1.3' }],
      },
      letterSpacing: {
        'luxury': '4px',
        'wide-luxury': '3px',
        'nav': '0.5px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s infinite',
        'gradient': 'gradient 3s ease infinite',
        'float': 'float 8s ease-in-out infinite',
        'float-reverse': 'float 10s ease-in-out infinite reverse',
        // ZKescrow animations
        'blink': 'blink 1.4s infinite both',
        'move-up': 'moveUp 500ms infinite alternate',
        'scale-up': 'scaleUp 500ms infinite alternate',
        'drip-expand': 'expand 500ms ease-in forwards',
        'drip-expand-large': 'expandLarge 600ms ease-in forwards',
        'move-up-small': 'moveUpSmall 500ms infinite alternate',
        // Button ripple effect
        'ripple': 'ripple 600ms ease-out forwards',
        // Progress ring
        'progress-ring': 'progressRing 2s linear infinite',
        // Urgency pulse
        'urgency-pulse': 'urgencyPulse 1s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(2deg)' },
        },
        // ZKescrow keyframes
        blink: {
          '0%': { opacity: '0.2' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0.2' },
        },
        expand: {
          '0%': { opacity: '0', transform: 'scale(1)' },
          '30%': { opacity: '1' },
          '80%': { opacity: '0.5' },
          '100%': { transform: 'scale(30)', opacity: '0' },
        },
        expandLarge: {
          '0%': { opacity: '0', transform: 'scale(1)' },
          '30%': { opacity: '1' },
          '80%': { opacity: '0.5' },
          '100%': { transform: 'scale(96)', opacity: '0' },
        },
        moveUp: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-20px)' },
        },
        moveUpSmall: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-10px)' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0)' },
          '100%': { transform: 'scale(1)' },
        },
        // Button ripple effect
        ripple: {
          '0%': { transform: 'translate(-50%, -50%) scale(1)', opacity: '0.6' },
          '100%': { transform: 'translate(-50%, -50%) scale(50)', opacity: '0' },
        },
        // Progress ring animation
        progressRing: {
          '0%': { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: '0' },
        },
        // Urgency pulse for countdown
        urgencyPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.02)' },
        },
      },
      backgroundSize: {
        '200': '200% 200%',
      },
      boxShadow: {
        'gold': '0 20px 40px rgba(0, 0, 0, 0.3)',
        'gold-glow': '0 0 10px rgba(201, 169, 98, 0.3)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.2)',
      },
      transitionTimingFunction: {
        'luxury': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
