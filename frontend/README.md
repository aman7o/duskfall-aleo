# Digital Will - Frontend

A Next.js 14 frontend application for the Digital Will dApp - a decentralized dead man's switch protocol built on Ethereum.

## Features

- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Zustand for state management
- Responsive design (mobile-first)
- Dark theme optimized for financial apps
- MetaMask integration
- Mock data for testing without backend

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MetaMask browser extension

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                    # Next.js 14 App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # User dashboard
│   ├── create/            # Create will wizard
│   └── claim/             # Beneficiary claim page
├── components/
│   ├── layout/            # Header, Footer
│   ├── wallet/            # Wallet connection
│   ├── will/              # Will-related components
│   ├── beneficiary/       # Beneficiary management
│   └── ui/                # Reusable UI components
├── hooks/                 # Custom React hooks
│   ├── useWallet.ts       # Wallet state management
│   └── useWill.ts         # Will operations
├── lib/                   # Utility functions
└── types/                 # TypeScript type definitions
```

## Key Components

### Pages

- **Landing Page**: Hero section, how it works, features, CTA
- **Dashboard**: Will status, check-in button, countdown timer, beneficiary list
- **Create Will**: Multi-step form wizard
- **Claim Assets**: Beneficiary claim interface

### Core Components

- **WalletConnect**: MetaMask integration with connection state
- **WillCard**: Display will status and key metrics
- **CheckInButton**: Big "I'm Alive" check-in button
- **CountdownTimer**: Real-time countdown to deadline
- **CreateWillForm**: Multi-step will creation wizard
- **BeneficiaryList**: Display and manage beneficiaries
- **ClaimCard**: Interface for beneficiaries to claim assets

## State Management

The application uses Zustand for global state:

- **useWallet**: Wallet connection, address, balance
- **useWill**: Will data, CRUD operations, check-ins, claims

## Styling

- Tailwind CSS with custom dark theme
- Custom color palette for financial app aesthetics
- Responsive breakpoints for mobile, tablet, desktop
- Smooth animations and transitions

## Mock Data

The application includes mock data for testing without a backend:

- Sample will with beneficiaries
- Check-in simulation
- Asset management simulation

## Testing the App

1. Install MetaMask extension
2. Connect wallet
3. View mock will on dashboard (if address matches mock data)
4. Test check-in functionality
5. Navigate through create will wizard
6. Test claim interface

## Accessibility

- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Focus states on interactive elements
- Color contrast meeting WCAG AA standards

## Performance Optimizations

- Next.js automatic code splitting
- Lazy loading of components
- Optimized bundle with tree shaking
- Image optimization with Next.js Image component
- Font optimization with Next.js Font loader

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
