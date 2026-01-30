# Digital Will - Technical Architecture

> Comprehensive technical documentation of the Digital Will system architecture, smart contract design, and privacy implementation on Aleo blockchain.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Smart Contract Structure](#smart-contract-structure)
3. [Data Flow & State Management](#data-flow--state-management)
4. [Privacy Model](#privacy-model)
5. [Security Considerations](#security-considerations)
6. [Integration Points](#integration-points)
7. [Performance & Scalability](#performance--scalability)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DIGITAL WILL ECOSYSTEM                           │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │   Web Frontend  │  Next.js 14 + TypeScript
    │   (localhost)   │  - React Components
    │                 │  - Wallet Integration
    │                 │  - UI/UX Layer
    └────────┬────────┘
             │
             │ HTTP/WebSocket
             │
    ┌────────▼────────────────────────────────────────┐
    │  Aleo Wallet Adapter                            │
    │  - Transaction Signing                          │
    │  - Record Management                            │
    │  - Key Management                               │
    └────────┬────────────────────────────────────────┘
             │
             │ JSON-RPC
             │
    ┌────────▼────────────────────────────────────────┐
    │  Leo Wallet Extension                           │
    │  - Private Key Storage                          │
    │  - Transaction Approval                         │
    │  - Record Decryption                            │
    └────────┬────────────────────────────────────────┘
             │
             │ Aleo Network Protocol
             │
┌────────────▼──────────────────────────────────────────────────┐
│                    ALEO BLOCKCHAIN                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Zero-Knowledge Virtual Machine (snarkVM)                 │ │
│  │  - Offchain Execution                                     │ │
│  │  - ZK Proof Generation                                    │ │
│  │  - Public Verification                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Smart Contract: digital_will_v3.aleo                     │ │
│  │  ┌────────────────────────────────────────────────────┐  │ │
│  │  │  PRIVATE RECORDS (Encrypted State)                 │  │ │
│  │  │  • WillConfig         - Will owner only            │  │ │
│  │  │  • Beneficiary        - Beneficiary only           │  │ │
│  │  │  • LockedCredits      - Owner only                 │  │ │
│  │  │  • SecretMessage      - Encrypted to recipient     │  │ │
│  │  │  • ClaimableShare     - Beneficiary after trigger  │  │ │
│  │  │  • InheritanceClaim   - Claim receipt              │  │ │
│  │  │  • TriggerBounty      - Trigger reward             │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  │                                                            │ │
│  │  ┌────────────────────────────────────────────────────┐  │ │
│  │  │  PUBLIC MAPPINGS (Minimal Public State)            │  │ │
│  │  │  • will_status       : field => u8                 │  │ │
│  │  │  • last_checkin      : field => u32                │  │ │
│  │  │  • checkin_periods   : field => u32                │  │ │
│  │  │  • grace_periods     : field => u32                │  │ │
│  │  │  • total_locked      : field => u64                │  │ │
│  │  │  • total_claimed     : field => u64                │  │ │
│  │  │  • owner_hash        : field => field              │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  credits.aleo (Native Token Program)                      │ │
│  │  - transfer_private_to_public                             │ │
│  │  - transfer_public_to_private                             │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Frontend Layer (`/frontend`)

**Technology Stack:**
- Next.js 14 (App Router)
- TypeScript 5.4+
- Tailwind CSS
- Zustand (state management)
- Aleo Wallet Adapter

**Key Components:**
```
frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── dashboard/         # Will management
│   │   ├── create/            # Will creation flow
│   │   └── claims/            # Beneficiary claims
│   ├── components/            # React components
│   │   ├── wallet/            # Wallet connection
│   │   ├── will/              # Will management UI
│   │   ├── beneficiary/       # Beneficiary management
│   │   └── ui/                # Shared UI components
│   ├── hooks/                 # React hooks
│   │   ├── useWallet.ts       # Wallet state
│   │   └── useWill.ts         # Will operations
│   ├── services/              # Business logic
│   │   ├── aleo.ts            # Aleo network service
│   │   └── local-aleo.ts      # Local testing service
│   ├── types/                 # TypeScript definitions
│   └── contexts/              # React contexts
```

**State Management:**
```typescript
// Zustand store for will state
interface WillStore {
  will: UIWill | null;
  willId: string | null;
  willConfigRecord: string | null;
  beneficiaryRecords: Map<string, string>;
  lockedCreditsRecords: string[];
  isLoading: boolean;
  error: string | null;
  programDeployed: boolean;
  isLocalMode: boolean;
}
```

#### 2. Smart Contract Layer (`/contracts/digital_will`)

**Technology Stack:**
- Leo Language
- Aleo VM (snarkVM)
- credits.aleo integration

**Contract Structure:**
```
contracts/digital_will/
├── src/
│   └── main.leo              # Main contract (558 lines)
├── build/                    # Compiled output
│   ├── main.aleo            # Compiled instructions
│   ├── program.json         # Metadata
│   └── imports/
│       └── credits.aleo     # Imported credits program
├── inputs/                   # Test inputs
└── README.md                 # Contract documentation
```

---

## Smart Contract Structure

### Records (Private State)

Records are the core privacy primitive in Aleo. They are encrypted to specific addresses and cannot be read by others.

#### 1. WillConfig

The primary configuration owned by the will creator.

```leo
record WillConfig {
    owner: address,              // Will creator's address
    will_id: field,              // Unique identifier (BHP256 hash)
    check_in_period: u32,        // Blocks between check-ins
    grace_period: u32,           // Extra buffer before trigger
    total_shares_bps: u16,       // Total allocated shares (max 10000)
    num_beneficiaries: u8,       // Count of beneficiaries (max 10)
    is_active: bool,             // Active status flag
    nonce: field,                // Cryptographic nonce
}
```

**Properties:**
- **Privacy:** Only decryptable by owner
- **Mutability:** Updated on every operation (add beneficiary, deposit, etc.)
- **Storage:** Client-side in wallet, not on-chain
- **Lifecycle:** Created → Updated → Deactivated/Triggered

**Generation:**
```leo
let will_id: field = BHP256::hash_to_field(
    BHP256::hash_to_field(self.caller) + nonce
);
```

#### 2. Beneficiary

Represents a beneficiary's share of the inheritance.

```leo
record Beneficiary {
    owner: address,              // Beneficiary's address
    will_owner: address,         // Original will creator
    will_id: field,              // Associated will identifier
    share_bps: u16,              // Share in basis points (100 = 1%)
    priority: u8,                // Priority order (1-255)
    verification_hash: field,    // Authenticity proof
    is_active: bool,             // Can be revoked
}
```

**Verification Hash Calculation:**
```leo
let verification: field = BHP256::hash_to_field(
    BHP256::hash_to_field(beneficiary_address) +
    BHP256::hash_to_field(config.owner) +
    config.nonce
);
```

**Properties:**
- **Privacy:** Only beneficiary can decrypt
- **Isolation:** Beneficiaries don't know about each other
- **Revocability:** Owner can revoke by setting is_active = false
- **Share Verification:** Smart contract ensures shares don't exceed 10000 bps

#### 3. LockedCredits

Tracks credits deposited into the will.

```leo
record LockedCredits {
    owner: address,              // Record holder (will owner)
    will_id: field,              // Associated will
    amount: u64,                 // Microcredits locked
    depositor: address,          // Who deposited (usually = owner)
}
```

**Properties:**
- **Real Value:** Backed by actual ALEO credits transferred to program
- **Withdrawable:** Owner can withdraw before will triggers
- **Claimable:** Beneficiaries claim after trigger
- **Multiple Records:** Can have multiple LockedCredits records per will

#### 4. SecretMessage

Encrypted data storage for beneficiaries.

```leo
record SecretMessage {
    owner: address,              // Initial owner (will creator)
    will_id: field,              // Associated will
    recipient: address,          // Intended beneficiary
    data_0: field,               // Encrypted data chunks
    data_1: field,
    data_2: field,
    data_3: field,
}
```

**Capacity:** 4 fields × 31 bytes ≈ 124 bytes of encrypted data

**Use Cases:**
- Private keys for other accounts
- Wallet seed phrases (encrypted)
- Passwords for services
- Personal messages
- Coordinates to physical assets

#### 5. ClaimableShare

Created when beneficiary claims inheritance (after trigger).

```leo
record ClaimableShare {
    owner: address,              // Beneficiary
    will_id: field,              // Associated will
    amount: u64,                 // Claimable microcredits
    original_owner: address,     // Deceased will owner
}
```

#### 6. InheritanceClaim

Receipt of inheritance claim.

```leo
record InheritanceClaim {
    owner: address,              // Beneficiary who claimed
    will_id: field,              // Associated will
    original_owner: address,     // Deceased will owner
    amount_claimed: u64,         // Amount received
}
```

#### 7. TriggerBounty

Reward for triggering the will.

```leo
record TriggerBounty {
    owner: address,              // Trigger caller
    will_id: field,              // Triggered will
    bounty_amount: u64,          // 0.1% of total locked
}
```

---

### Mappings (Public State)

Mappings store minimal public state necessary for verification. They are key-value stores visible to everyone.

```leo
mapping will_status: field => u8;
// 0 = Inactive, 1 = Active, 2 = Triggered, 3 = Claimed

mapping last_checkin: field => u32;
// Block height of last check-in

mapping checkin_periods: field => u32;
// Required blocks between check-ins

mapping grace_periods: field => u32;
// Grace period in blocks

mapping total_locked: field => u64;
// Total microcredits locked in will

mapping total_claimed: field => u64;
// Total microcredits claimed by beneficiaries

mapping owner_hash: field => field;
// BHP256 hash of owner address (for backup check-in)
```

**Design Philosophy:**
- **Minimal Exposure:** Only data needed for public verification
- **No PII:** No addresses, names, or identifying information
- **Hash-Based Keys:** Will IDs are hashes, not predictable
- **State Machine:** Status codes enable proper workflow enforcement

---

### Transitions (Public Functions)

Transitions are the executable functions of the smart contract. They have two phases:

1. **Execution Phase** (offchain): Runs locally with private inputs, generates ZK proof
2. **Finalize Phase** (onchain): Verifies proof and updates public state

#### State Machine

```
┌───────────┐
│ INACTIVE  │ (0)
│ (Created  │
│  but not  │
│ deployed) │
└─────┬─────┘
      │ create_will / reactivate_will
      ▼
┌───────────┐
│  ACTIVE   │ (1)
│ (Normal   │───────┐
│operation) │       │ check_in (periodic)
└─────┬─────┘       │
      │             │
      │◄────────────┘
      │
      │ deactivate_will
      ▼
┌───────────┐
│ INACTIVE  │ (0)
└───────────┘
      │
      │ Deadline passes (no check-in)
      ▼
┌───────────┐
│ TRIGGERED │ (2)
│ (Will is  │
│  active)  │
└─────┬─────┘
      │
      │ All beneficiaries claim OR emergency_recovery
      ▼
┌───────────┐
│  CLAIMED  │ (3)
│ (Fully    │
│distributed)│
└───────────┘
```

#### Key Transition Details

##### create_will

**Purpose:** Initialize a new digital will

**Inputs:**
```leo
private nonce: field,          // Random value for will_id generation
private check_in_period: u32,  // Blocks between check-ins (min: 4320, max: 1576800)
private grace_period: u32,     // Grace period blocks (min: 4320)
```

**Outputs:**
```leo
WillConfig,                    // Private record to owner
Future                         // Finalize function to execute onchain
```

**Privacy:** Will ID is a hash (non-predictable), owner address stored as hash

##### add_beneficiary

**Purpose:** Designate a new beneficiary with inheritance share

**Inputs:**
```leo
private config: WillConfig,
private beneficiary_address: address,
private share_bps: u16,        // Basis points (100 = 1%, 10000 = 100%)
private priority: u8,          // Priority order
```

**Privacy:** Beneficiary record owned by beneficiary, other beneficiaries can't see

##### deposit

**Purpose:** Lock ALEO credits in the will

**Integration:** Uses `credits.aleo/transfer_private_to_public` to transfer user's private credits to program's public balance

##### trigger_will

**Purpose:** Activate the will after deadline passes (anyone can call)

**Incentive:** Caller receives 0.1% bounty from locked credits

**Verification:** Deadline must be passed, expected_locked must match actual

##### claim_inheritance

**Purpose:** Beneficiary claims their share after will is triggered

**Privacy:** Beneficiary receives private credits via `credits.aleo/transfer_public_to_private`

**Verification:** Share amount matches beneficiary's share_bps

---

## Data Flow & State Management

### Will Creation Flow

```
┌──────────┐
│  User    │ 1. Fill form (check-in period, grace period, beneficiaries)
│ (Owner)  │
└────┬─────┘
     │
     ▼
┌──────────────┐
│   Frontend   │ 2. createWill(formData)
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ useWill Hook │ 3. Generate nonce, convert days to blocks
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ Leo Wallet   │ 4. Sign transaction with private key
└────┬─────────┘
     │
     ▼
┌─────────────────────────────┐
│   Aleo Network              │
│  ┌─────────────────────┐   │
│  │ Execute Transition  │   │ Generate ZK Proof
│  │ (offchain)          │   │
│  └──────┬──────────────┘   │
│         ▼                   │
│  ┌─────────────────────┐   │
│  │ Finalize            │   │ 5. WillConfig record encrypted to owner
│  │ (onchain)           │   │
│  │ - Set mappings      │   │
│  │ - Return WillConfig │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
     │
     ▼
┌──────────────┐
│   Frontend   │ 6. Display will info, store will_id
└──────────────┘
```

### Beneficiary Claim Flow

```
┌──────────────┐
│ Beneficiary  │ 1. Will gets triggered (deadline passed)
└────┬─────────┘
     │
     ▼
┌──────────────┐
│   Frontend   │ 2. Load Beneficiary record from wallet
│ (Claims page)│
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ Leo Wallet   │ 3. Decrypt Beneficiary record (only beneficiary can)
└────┬─────────┘
     │
     ▼
┌──────────────┐
│   Frontend   │ 4. Calculate: amount = (total_locked * share_bps) / 10000
└────┬─────────┘
     │
     ▼
┌─────────────────────────────────────┐
│   Aleo Network                      │
│  ┌─────────────────────────────┐   │
│  │ Execute claim_inheritance   │   │ Verify beneficiary record
│  └──────┬──────────────────────┘   │ Verify will is triggered
│         ▼                           │ Verify amount matches share
│  ┌─────────────────────────────┐   │
│  │ Finalize                     │   │ Transfer credits (public → private)
│  │ - Transfer credits           │   │ Update total_claimed
│  │ - Return InheritanceClaim    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
     │
     ▼
┌──────────────┐
│ Leo Wallet   │ Receives private credits
└──────────────┘
```

---

## Privacy Model

### Privacy Levels

| Data Element | Visibility | Storage | Who Can See |
|-------------|-----------|---------|-------------|
| Owner Address | Hashed | Public mapping (owner_hash) | No one (hash only) |
| Will ID | Derived Hash | Public mapping keys | Everyone (but meaningless) |
| Beneficiary Identities | Encrypted | Private Beneficiary records | Only beneficiary |
| Inheritance Shares | Encrypted | Private Beneficiary records | Only beneficiary |
| Locked Amounts (individual) | Encrypted | Private LockedCredits records | Only owner |
| Total Locked | Public | Public mapping (total_locked) | Everyone |
| Check-In Period | Public | Public mapping (checkin_periods) | Everyone |
| Last Check-In Block | Public | Public mapping (last_checkin) | Everyone |
| Will Status | Public | Public mapping (will_status) | Everyone |
| Secret Messages | Encrypted | Private SecretMessage records | Only recipient |

### Zero-Knowledge Proofs in Action

#### Example 1: Proving Beneficiary Entitlement

**What beneficiary wants to prove:**
"I am entitled to claim X ALEO from this will"

**Private Inputs:**
- Beneficiary record (contains share_bps, verification_hash)
- Will ID

**Public Inputs:**
- Amount to claim

**What the ZK proof proves:**
1. Beneficiary owns a valid Beneficiary record for this will
2. The verification_hash matches the will's owner and nonce
3. The amount claimed = (total_locked × share_bps) / 10000
4. The will is in triggered status

**What is NOT revealed:**
- Beneficiary's identity (address stays private)
- Other beneficiaries' shares
- When beneficiary was added
- Original owner's address

#### Example 2: Proving Ownership for Check-In

**Option A - With WillConfig:**
- **Private Inputs:** WillConfig record
- **Public Inputs:** None
- **Proves:** Caller owns the WillConfig record for this will_id

**Option B - Backup Check-In:**
- **Private Inputs:** Owner address (hashed in execution)
- **Public Inputs:** will_id
- **Proves:** Hash of caller's address matches stored owner_hash

### Cryptographic Primitives

#### BHP256 Hash Function

Used throughout for:
- Will ID generation
- Owner address hashing
- Beneficiary verification

**Properties:**
- Collision-resistant
- One-way (can't reverse)
- Deterministic (same input → same output)
- Field-compatible (outputs valid Aleo field element)

**Example Usage:**
```leo
// Generate will_id from owner + nonce
let will_id: field = BHP256::hash_to_field(
    BHP256::hash_to_field(self.caller) + nonce
);
```

#### Record Encryption

Records are automatically encrypted by Aleo VM using:
- Record owner's public key
- Symmetric encryption (AES-GCM)
- Encrypted to view key for owner

**Decryption:**
Only the record owner (address specified in `owner` field) can decrypt using their private key.

---

## Security Considerations

### Attack Vectors & Mitigations

#### 1. Front-Running Attack on Trigger

**Attack:** Malicious actor monitors pending check-ins and front-runs with trigger transaction.

**Mitigation:**
- Check-in deadline is strictly enforced in finalize
- Can't check-in after deadline passes (H-04 fix)
- Even if triggered early, owner can use emergency_recovery if < 50% claimed

#### 2. Will ID Collision

**Attack:** Attacker generates nonce to collide with existing will_id.

**Mitigation:**
- BHP256 hash has 2^256 output space (collision practically impossible)
- Finalize checks if will_id already exists
- Nonce should be cryptographically random

#### 3. Bounty Manipulation

**Attack:** Trigger caller provides inflated expected_locked to get larger bounty.

**Mitigation:**
```leo
// Verify expected locked matches actual
let locked: u64 = Mapping::get_or_use(total_locked, will_id, 0u64);
assert_eq(locked, expected_locked);
```

### Access Control Matrix

| Function | Caller | Required Records | Status Check |
|----------|--------|-----------------|--------------|
| create_will | Anyone | None | will_id must not exist |
| check_in | Owner | WillConfig | status = ACTIVE |
| check_in_backup | Owner | None (uses will_id) | status = ACTIVE |
| add_beneficiary | Owner | WillConfig | status = ACTIVE |
| deposit | Owner | WillConfig + credits | status = ACTIVE |
| trigger_will | Anyone | None | status = ACTIVE, deadline passed |
| claim_inheritance | Beneficiary | Beneficiary | status = TRIGGERED |
| emergency_recovery | Owner | WillConfig + LockedCredits | < 50% claimed |

---

## Integration Points

### credits.aleo Integration

The contract integrates with Aleo's native credits program for real token transfers.

#### Credits Flow Diagram

```
DEPOSIT:
┌──────────────┐
│ User Private │  transfer_private_to_public
│  Credits     │─────────────────────────────┐
└──────────────┘                             ▼
                                    ┌────────────────┐
                                    │ Program Public │
                                    │    Balance     │
                                    └────────┬───────┘
                                             │
                                             ▼
                                    ┌────────────────┐
                                    │ LockedCredits  │
                                    │   (Record)     │
                                    └────────────────┘

CLAIM:
              ┌────────────────┐
              │ Program Public │  transfer_public_to_private
              │    Balance     │─────────────────────────────┐
              └────────────────┘                             ▼
                                                    ┌──────────────┐
                                                    │ Beneficiary  │
                                                    │   Private    │
                                                    │   Credits    │
                                                    └──────────────┘
```

---

## Performance & Scalability

### Transaction Costs

| Operation | Estimated Cost | Complexity |
|-----------|---------------|------------|
| create_will | ~100,000 microcredits | Low (mapping writes) |
| check_in | ~50,000 microcredits | Low (1 mapping write) |
| add_beneficiary | ~80,000 microcredits | Medium (record creation) |
| deposit | ~150,000 microcredits | High (credits transfer) |
| trigger_will | ~120,000 microcredits | Medium (status change + transfer) |
| claim_inheritance | ~150,000 microcredits | High (credits transfer) |

### Proof Generation Time

- **Simple transitions** (check_in): ~2-5 seconds
- **Complex transitions** (claim_inheritance): ~10-30 seconds

### Storage Considerations

**Private Records (client-side):**
- WillConfig: ~256 bytes
- Beneficiary: ~256 bytes each
- Total per user: < 5 KB (for typical will with 3 beneficiaries)

**Public Mappings (on-chain):**
- 7 mappings per will
- Total per will: < 500 bytes

**Scalability:**
- No limit on number of wills (separate will_ids)
- Max 10 beneficiaries per will (contract constant)
- No limit on locked amount (u64 max)

---

## Conclusion

The Digital Will architecture demonstrates how Aleo's zero-knowledge capabilities enable truly private financial applications. By storing sensitive data in encrypted records and only exposing minimal verification state publicly, we achieve:

- **Privacy:** Beneficiary identities and shares remain hidden until necessary
- **Security:** Cryptographic proofs verify all operations without exposing data
- **Usability:** Clean abstractions make complex ZK operations accessible
- **Decentralization:** No trusted third parties required

---

**For more information:**
- [README.md](README.md) - User-facing documentation
- [PRIVACY.md](PRIVACY.md) - Privacy model deep dive
- [contracts/digital_will/README.md](contracts/digital_will/README.md) - Contract documentation
