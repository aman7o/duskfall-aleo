# Digital Will Frontend - Setup Guide

## Quick Start

```bash
# Navigate to frontend directory
cd /Users/amansingh/digitalwill/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Development Commands

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Environment Setup

### Required Tools

1. **Node.js 18+**
   ```bash
   node --version  # Should be v18 or higher
   ```

2. **MetaMask Browser Extension**
   - Install from [metamask.io](https://metamask.io)
   - Create or import a wallet
   - Switch to a test network (Sepolia, Goerli, etc.)

### Optional Configuration

Create `.env.local` for environment variables:

```env
# API endpoints (when backend is ready)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Contract addresses (when deployed)
NEXT_PUBLIC_WILL_CONTRACT_ADDRESS=0x...

# Chain configuration
NEXT_PUBLIC_CHAIN_ID=11155111  # Sepolia testnet
```

## Project Overview

### Pages

1. **Landing Page** (`/`)
   - Hero section with value proposition
   - How it works (3 steps)
   - Features showcase
   - Call-to-action to create will

2. **Dashboard** (`/dashboard`)
   - Will status overview
   - Check-in button
   - Countdown timer
   - Beneficiary management
   - Asset summary

3. **Create Will** (`/create`)
   - Step 1: Set check-in interval
   - Step 2: Add beneficiaries
   - Step 3: Initial deposit

4. **Claim Assets** (`/claim`)
   - Search for will by owner address
   - View claimable amount
   - Claim interface for beneficiaries

### Component Architecture

```
UI Components (Primitives)
├── Button - Variants: primary, secondary, outline, ghost, danger
├── Card - Layouts with header, content, footer
├── Input - Form inputs with validation
└── Modal - Dialog overlays

Layout Components
├── Header - Navigation + Wallet Connect
└── Footer - Links and branding

Feature Components
├── Wallet
│   └── WalletConnect - MetaMask integration
├── Will
│   ├── WillCard - Status display
│   ├── CheckInButton - Check-in action
│   ├── CountdownTimer - Real-time countdown
│   └── CreateWillForm - Multi-step wizard
└── Beneficiary
    ├── BeneficiaryList - Display beneficiaries
    ├── AddBeneficiaryForm - Add new beneficiary
    └── ClaimCard - Claim interface
```

### State Management

**Zustand Stores:**

1. **useWallet** (`src/hooks/useWallet.ts`)
   ```typescript
   {
     address: string | null
     isConnected: boolean
     balance: string
     chainId: number | null
     connect: () => Promise<void>
     disconnect: () => void
   }
   ```

2. **useWill** (`src/hooks/useWill.ts`)
   ```typescript
   {
     will: Will | null
     isLoading: boolean
     error: string | null
     fetchWill: (address: string) => Promise<void>
     createWill: (data: CreateWillFormData) => Promise<void>
     checkIn: () => Promise<void>
     addBeneficiary: (beneficiary: Beneficiary) => Promise<void>
     claimAssets: (beneficiaryAddress: string) => Promise<void>
   }
   ```

### Mock Data

For testing without backend, mock data is included in `useWill.ts`:

```typescript
const mockWill = {
  owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  checkInInterval: 2592000, // 30 days
  totalValue: '5.5',
  beneficiaries: [...],
  // ...
}
```

To test:
1. Connect wallet with address matching `mockWill.owner`
2. Navigate to dashboard
3. Test check-in, add beneficiary, etc.

## Styling Guide

### Tailwind Configuration

Custom colors defined in `tailwind.config.js`:

```javascript
colors: {
  background: '#0a0a0b',      // Main background
  primary: '#3b82f6',          // Primary blue
  accent: {
    green: '#10b981',          // Success
    red: '#ef4444',            // Error/Danger
    yellow: '#f59e0b',         // Warning
    purple: '#8b5cf6',         // Secondary accent
  },
  text: {
    primary: '#f9fafb',        // Main text
    secondary: '#d1d5db',      // Secondary text
    tertiary: '#9ca3af',       // Muted text
  },
}
```

### Responsive Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### Usage Examples

```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Responsive text
<h1 className="text-2xl md:text-4xl lg:text-5xl">

// Conditional styling
<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === 'primary' && "primary-class"
)}>
```

## Testing Guide

### Manual Testing Checklist

**Landing Page:**
- [ ] Hero section displays correctly
- [ ] How it works section explains process
- [ ] Features showcase all benefits
- [ ] CTA buttons navigate properly

**Wallet Connection:**
- [ ] Connect wallet button appears
- [ ] MetaMask popup opens
- [ ] Address displays after connection
- [ ] Balance shows correctly
- [ ] Disconnect works

**Dashboard (with mock data):**
- [ ] Will status card shows correct data
- [ ] Check-in button works
- [ ] Countdown timer updates
- [ ] Beneficiary list displays
- [ ] Add beneficiary modal opens

**Create Will:**
- [ ] Step 1: Can select interval
- [ ] Step 2: Can add beneficiaries
- [ ] Step 2: Share validation works (total = 100%)
- [ ] Step 3: Can enter deposit amount
- [ ] Summary shows correct data
- [ ] Submit creates will

**Claim Page:**
- [ ] Search form accepts address
- [ ] Shows claim card if beneficiary
- [ ] Shows "no claim" if not beneficiary
- [ ] Claim button works when deadline passed

## Accessibility

### Implemented Features

1. **Semantic HTML**
   - Proper heading hierarchy (h1 → h2 → h3)
   - Semantic tags (header, nav, main, footer)
   - Form labels associated with inputs

2. **Keyboard Navigation**
   - All interactive elements focusable
   - Focus indicators visible
   - Modal closes on Escape key

3. **Color Contrast**
   - Text meets WCAG AA standards
   - Interactive elements have sufficient contrast

4. **ARIA Labels**
   - Screen reader friendly
   - Descriptive button labels
   - Form error announcements

## Performance

### Optimizations Implemented

1. **Code Splitting**
   - Automatic route-based splitting by Next.js
   - Dynamic imports for heavy components

2. **Image Optimization**
   - Next.js Image component (when needed)
   - Lazy loading images

3. **Font Loading**
   - Next.js Font optimization
   - Variable fonts for better performance

4. **Bundle Size**
   - Tree shaking enabled
   - Minimal dependencies
   - lucide-react for icons (lighter than react-icons)

### Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Manual Deployment

```bash
# Build
npm run build

# The output will be in .next/
# Deploy .next/ folder to your hosting service
```

## Troubleshooting

### Common Issues

**"Cannot find module" errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors:**
```bash
npm run type-check
```

**MetaMask not detected:**
- Ensure MetaMask extension is installed
- Check browser console for errors
- Try refreshing the page

**Wallet not connecting:**
- Check if MetaMask is unlocked
- Verify you're on a supported network
- Check browser console for errors

**Build errors:**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## Next Steps

1. **Backend Integration**
   - Replace mock data with actual API calls
   - Add contract interaction logic
   - Implement real blockchain transactions

2. **Smart Contract Integration**
   - Add ethers.js or viem
   - Connect to deployed contracts
   - Handle transaction signing

3. **Enhanced Features**
   - Transaction history
   - Email notifications
   - Multiple asset types (ERC20, NFTs)
   - Will templates

4. **Testing**
   - Add unit tests (Jest + React Testing Library)
   - Add E2E tests (Playwright)
   - Add integration tests

## Support

For issues or questions:
1. Check this setup guide
2. Review component source code
3. Check browser console for errors
4. Review Next.js documentation

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [MetaMask Documentation](https://docs.metamask.io)
