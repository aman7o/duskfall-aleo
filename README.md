# Duskfall - Privacy-Preserving Inheritance on Aleo

> A zero-knowledge Dead Man's Switch that ensures your digital assets reach the right people, without revealing your plans to the world.

[![Aleo](https://img.shields.io/badge/Aleo-Privacy-blue)](https://aleo.org)
[![Leo](https://img.shields.io/badge/Leo-Smart%20Contracts-green)](https://leo-lang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

Duskfall is a privacy-first digital inheritance system built on Aleo blockchain that enables users to:

- **Lock ALEO credits** in a secure, zero-knowledge smart contract
- **Designate beneficiaries** with specific inheritance shares (all data encrypted)
- **Prove you're alive** through periodic check-ins without revealing will details
- **Automatically distribute assets** when check-ins stop, ensuring your legacy is protected
- **Store encrypted messages** that transfer to beneficiaries only upon activation

Unlike traditional estate planning that requires lawyers, public records, and trust in centralized systems, Duskfall leverages Aleo's zero-knowledge proofs to keep your inheritance plans completely private until they need to be executed.

## Why Aleo? Privacy-First Architecture

Here's how we achieve real privacy:

### 1. Zero-Knowledge Execution
All will operations execute **offchain** using zero-knowledge proofs. Beneficiary identities, asset amounts, and inheritance shares remain completely hidden during normal operation.

### 2. Private Records, Not Public State
Traditional blockchains expose all data publicly. Duskfall uses Aleo's **private records**:
- Your `WillConfig` is a private record only you can see
- Each `BenAllocation` record is encrypted and owned by the beneficiary 
- `LockedCredits` amounts are hidden from public view
- Only the minimal verification data (will_id, status codes) exists on-chain

### 3. Selective Disclosure
Beneficiaries don't know:
- How much you locked until the will triggers
- Who else is a beneficiary
- What percentage they're getting

You can prove the will exists without revealing its contents. After trigger, beneficiaries can claim their share using zero-knowledge proofs that verify their entitlement without exposing others' data.

### 4. Hash-Based Verification
Owner and beneficiary addresses are stored as cryptographic hashes (BHP256), not plaintext. Even on-chain data doesn't directly reveal who owns which will.

## Key Features

### Privacy & Security
- **Zero-Knowledge Proofs** - All operations verified cryptographically without exposing data
- **Private Record Ownership** - Only you can access your will configuration
- **Encrypted Beneficiary Data** - Beneficiaries remain hidden until will triggers
- **Hash-Based Verification** - Owner identity protected with cryptographic commitments
- **No Public Exposure** - Asset amounts and distributions completely private

### Asset Management
- **Real ALEO Credits** - Direct integration with `credits.aleo` for actual token transfers
- **Flexible Shares** - Distribute assets as percentages (basis points) up to 100%
- **Multi-Beneficiary** - Support for up to 10 beneficiaries per will
- **Emergency Recovery** - Owner can reclaim if accidentally triggered (before 50% claimed)
- **Withdraw Anytime** - Remove funds before triggering while will is active

### Dead Man's Switch
- **Configurable Check-In Periods** - 1 day to 1 year intervals
- **Grace Periods** - Extra buffer time before automatic triggering
- **Backup Check-In** - Alternative check-in method if you lose your WillConfig record
- **Automatic Trigger** - Anyone can activate the will after deadline (earns 0.1% bounty)
- **Claim Verification** - Beneficiaries prove their entitlement with zero-knowledge proofs

### User Experience
- **Next.js Frontend** - Modern, responsive web interface
- **Wallet Integration** - Seamless connection with Leo Wallet
- **Real-Time Status** - Live countdown to check-in deadline
- **Transaction Tracking** - Monitor all will operations on Aleo testnet

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     DIGITAL WILL SYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │   Frontend   │◄──────►│  Leo Wallet  │                  │
│  │  (Next.js)   │        │   Adapter    │                  │
│  └──────┬───────┘        └──────────────┘                  │
│         │                                                    │
│         │ Transactions                                       │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────┐           │
│  │    ALEO BLOCKCHAIN (Zero-Knowledge Layer)    │           │
│  ├─────────────────────────────────────────────┤           │
│  │                                              │           │
│  │  Smart Contract: digital_will_v7.aleo       │           │
│  │  ┌──────────────────────────────────────┐  │           │
│  │  │  PRIVATE RECORDS (Encrypted)         │  │           │
│  │  │  • WillConfig (owner only)           │  │           │
│  │  │  • Beneficiary (beneficiary only)    │  │           │
│  │  │  • LockedCredits (owner)             │  │           │
│  │  │  • SecretMessage (encrypted)         │  │           │
│  │  │  • ClaimableShare (after trigger)    │  │           │
│  │  └──────────────────────────────────────┘  │           │
│  │                                              │           │
│  │  ┌──────────────────────────────────────┐  │           │
│  │  │  PUBLIC MAPPINGS (Minimal State)     │  │           │
│  │  │  • will_status: field => u8          │  │           │
│  │  │  • last_checkin: field => u32        │  │           │
│  │  │  • total_locked: field => u64        │  │           │
│  │  │  • owner_hash: field => field        │  │           │
│  │  └──────────────────────────────────────┘  │           │
│  │                                              │           │
│  │  Credits Integration: credits.aleo          │           │
│  └─────────────────────────────────────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Installation & Setup

### Prerequisites

1. **Node.js 18+** and npm/yarn
2. **Leo Wallet** browser extension ([Download](https://leo.app))
3. **Aleo Account** with testnet credits ([Faucet](https://faucet.aleo.org))
4. **Leo Compiler** (for contract development)

```bash
# Install Leo compiler (optional, for development)
curl -fsSL https://raw.githubusercontent.com/AleoHQ/leo/mainnet/install.sh | sh
```

### Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd digitalwill

# Install frontend dependencies
cd frontend
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration
```

### Environment Configuration

Create `/Users/amansingh/digitalwill/frontend/.env.local`:

```bash
# Aleo Network Configuration
NEXT_PUBLIC_ALEO_NETWORK=testnet
NEXT_PUBLIC_PROGRAM_ID=digital_will_v7.aleo

# API Configuration (if using custom RPC)
NEXT_PUBLIC_ALEO_API_URL=https://api.explorer.provable.com/v1
```

### Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start

# Type checking
npm run type-check
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Usage Guide

### 1. Connect Your Wallet

- Click "Connect Wallet" in the top right
- Approve the connection in Leo Wallet extension
- Your Aleo address will be displayed

### 2. Create Your Will

**Step 1: Configure Check-In Settings**
```
Check-In Period: 30 days
Grace Period: 7 days
```
This means you must check in every 30 days. If you miss a check-in, you have an additional 7-day grace period before the will can be triggered.

**Step 2: Add Beneficiaries**
```
Beneficiary 1:
  Address: aleo1beneficiary1address...
  Name: Family Trust
  Share: 60%

Beneficiary 2:
  Address: aleo1beneficiary2address...
  Name: Charity
  Share: 40%
```

Shares must total 100%. Each beneficiary receives a private `Beneficiary` record.

**Step 3: Lock Initial Assets (Optional)**
```
Initial Deposit: 100 ALEO
```

Click "Create Will" to deploy your private will configuration.

### 3. Regular Check-Ins

**Option A: Private Check-In** (requires WillConfig record)
```
Dashboard → Check In Now
```

**Option B: Public Check-In** (backup method using will_id)
```
Dashboard → Check In (Backup)
```

Your last check-in block height is recorded. The deadline is automatically calculated:
```
Deadline = Last Check-In + Check-In Period + Grace Period
```

### 4. Manage Your Will

**Add More Funds (Private)**
```
Dashboard → Deposit → Enter amount → Confirm
```

**Add More Funds (Public)** — uses public credits (e.g. from faucet)
```
Dashboard → Deposit Public → Enter amount → Confirm
```

**Withdraw Funds** (while active)
```
Dashboard → Withdraw → Confirm
```

**Add New Beneficiary**
```
Dashboard → Add Beneficiary → Fill details → Confirm
```

**Revoke Beneficiary** (requires their Beneficiary record)
```
Dashboard → Beneficiaries → Revoke → Confirm
```

### 5. Trigger the Will (After Deadline)

If the owner misses check-ins beyond the grace period, **anyone** can trigger the will:

```
Dashboard → Trigger Will
```

The trigger caller receives a 0.1% bounty from the locked credits. The will status changes to "TRIGGERED".

### 6. Claim Inheritance (For Beneficiaries)

Once triggered, beneficiaries can claim their share:

```
Claim → Enter Will ID → Claim Inheritance
```

Two claim methods are available:

**Method A: Record-Based Claim** (`claim_inheritance`)
Uses the beneficiary's private `BenAllocation` record for verification.

**Method B: Mapping-Based Claim** (`claim_inheritance_v2`)
Uses on-chain mapping lookup — doesn't require the beneficiary to hold a record.

The smart contract:
1. Verifies the beneficiary's entitlement with zero-knowledge proof
2. Calculates their share: `(Total Locked × Share BPS) / 10000`
3. Transfers private credits directly to the beneficiary
4. Creates an `InheritanceClaim` receipt record

### 7. Emergency Recovery (Owner Only)

If accidentally triggered or you return after a long absence:

```
Dashboard → Emergency Recovery
```

**Requirements:**
- Less than 50% of assets have been claimed
- You still have your WillConfig record

This reactivates the will and resets the check-in timer.

## Smart Contract Deployment

The contract is deployed at `digital_will_v7.aleo` on Aleo Testnet Beta.

### Deploy Your Own Instance

```bash
# Navigate to contract directory
cd contracts/digital_will

# Build the contract
leo build

# Deploy to testnet (requires funded Aleo account)
leo deploy --network testnet
```

### Contract Address

After deployment, update the program ID in your frontend `.env.local`:
```bash
NEXT_PUBLIC_PROGRAM_ID=your_program_name.aleo
```

## Privacy Model Deep Dive

### What's Private?
| Data | Visibility | Storage |
|------|-----------|---------|
| Will ID | Owner only (hash derived) | Public mapping key |
| Owner Address | Hashed (BHP256) | Public mapping (owner_hash) |
| Beneficiary Identities | Beneficiary only | Private record |
| Inheritance Shares | Beneficiary only | Private record |
| Locked Amount | Owner only | Private record + Public total |
| Check-In Period | Owner only | Private record + Public mapping |
| Secret Messages | Recipient only | Private record |

### What's Public?
| Data | Why Public? | Privacy Protection |
|------|------------|-------------------|
| Will Status (0-3) | Enables triggering by anyone | Doesn't reveal owner |
| Last Check-In Block | Verifies deadline | Doesn't reveal identity |
| Total Locked (mapping) | Bounty calculation | Individual deposits are private |

### Zero-Knowledge Proofs in Action

**Creating a Will:**
```
Input (Private):  Owner address, nonce, check-in period
Proof:           "I created a valid will with proper parameters"
Public Output:   Will ID (hash), status code
Private Output:  WillConfig record (encrypted to owner)
```

**Adding Beneficiary:**
```
Input (Private):  WillConfig, beneficiary address, share %
Proof:           "I own this will and shares don't exceed 100%"
Public Output:   None
Private Output:  Updated WillConfig, Beneficiary record (to beneficiary)
```

**Claiming Inheritance:**
```
Input (Private):  Beneficiary record, will ID
Proof:           "I'm a valid beneficiary with X% share"
Public Output:   Claimed amount added to total_claimed
Private Output:  Credits transferred privately to beneficiary
```

## Technology Stack

### Smart Contract
- **Leo** - Zero-knowledge programming language for Aleo
- **Aleo VM** - Execution environment with ZK proofs
- **credits.aleo** - Native token transfer integration

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Aleo Wallet Adapter** - Wallet connection and transaction signing
- **Zustand** - Will state management
- **React Query** - Server state, caching, and background refetching
- **Jotai** - Atomic UI state (modals, notifications, preferences)
- **Lucide React** - Icon library

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Type checking
- **Leo Compiler** - Smart contract compilation

## Security Considerations

### Smart Contract Security
- **Tested Transitions** - All functions tested with various inputs
- **Access Control** - Owner-only functions protected with assertions
- **Overflow Protection** - Safe arithmetic with proper type bounds
- **Record Validation** - Cryptographic verification of all records
- **Status Checks** - State machine prevents invalid transitions

### Best Practices
1. **Secure Your Private Key** - Lost keys = lost will access
2. **Backup WillConfig Record** - Store encrypted backup of will configuration
3. **Test on Testnet First** - Never deploy to mainnet without thorough testing
4. **Choose Realistic Periods** - Check-in periods should match your lifestyle
5. **Verify Beneficiary Addresses** - Double-check all addresses before adding
6. **Keep Grace Period Generous** - Account for travel, emergencies, etc.

### Known Limitations
- Maximum 10 beneficiaries per will
- Check-in period: 1 day to 1 year
- Emergency recovery only if less than 50% claimed
- Requires beneficiaries to have Aleo wallet and know their private key

## Roadmap

### Phase 1 (Current - Testnet Beta)
- [x] Core dead man's switch functionality
- [x] Multi-beneficiary support with private shares
- [x] Real ALEO credits integration
- [x] Emergency recovery mechanism
- [x] Web interface with wallet integration
- [x] Mapping-based claim (v2) for beneficiaries without records
- [x] Public deposit support

### Phase 2 (Q2 2026)
- [ ] Multi-signature approval for large wills
- [ ] NFT and custom token support
- [ ] IPFS integration for legal documents
- [ ] Conditional inheritance (time-locked distributions)
- [ ] Beneficiary notifications (privacy-preserving)

### Phase 3 (Q3 2026)
- [ ] Mobile app (React Native)
- [ ] Oracle integration for automated check-ins
- [ ] Multi-chain asset bridging
- [ ] Professional executor marketplace
- [ ] Audit and mainnet deployment

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

```bash
# Fork and clone the repository
git clone your-fork-url
cd digitalwill

# Create a feature branch
git checkout -b feature/your-feature

# Make changes and test
cd frontend && npm run dev
cd contracts/digital_will && leo test

# Submit a pull request
```

## FAQ

**Q: Is my will information visible on the blockchain?**
A: No. All sensitive data (beneficiaries, amounts, shares) is stored in private records encrypted to specific owners. Only minimal verification data exists publicly.

**Q: What happens if I lose my WillConfig record?**
A: You can use the backup check-in method (check_in_backup) which uses your will_id and owner hash. However, for full management, you should keep encrypted backups of your records.

**Q: Can beneficiaries see other beneficiaries?**
A: No. Each beneficiary only receives their own private Beneficiary record. They cannot see who else is designated or what shares others receive.

**Q: What if I'm on vacation and miss a check-in?**
A: That's why you set a grace period. If check-in period is 30 days and grace is 7 days, you have 37 days total before the will can be triggered.

**Q: Can I revoke the will entirely?**
A: Yes, use the deactivate_will function to pause it, or withdraw all funds and stop checking in.

**Q: Is this legally binding?**
A: Duskfall is a technical solution for asset transfer. Consult a lawyer about legal estate planning requirements in your jurisdiction.

**Q: What are the fees?**
A: Standard Aleo transaction fees (varies by network congestion). The trigger bounty is 0.1% of locked assets.

## Resources

- [Aleo Developer Docs](https://developer.aleo.org/)
- [Leo Language Guide](https://docs.leo-lang.org/leo)
- [Aleo Testnet Faucet](https://faucet.aleo.org/)
- [Leo Wallet](https://leo.app)
- [Architecture Documentation](ARCHITECTURE.md)
- [Privacy Model Explanation](PRIVACY.md)

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Disclaimer

**IMPORTANT:** This smart contract manages real digital assets. Always:
- Test thoroughly on testnet before mainnet deployment
- Conduct independent security audits
- Understand the privacy and security implications
- Consult legal professionals for estate planning

The authors are not responsible for any loss of funds or legal issues arising from use of this software.

## Support

- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-repo/discussions)
- **Discord:** [Aleo Discord](https://discord.gg/aleo)

---

Built with privacy in mind on [Aleo](https://aleo.org)
