# Digital Will SDK

TypeScript SDK for interacting with the Digital Will Leo smart contract on Aleo blockchain.

## Features

- Fully typed TypeScript interfaces matching Leo smart contract records
- Complete wrapper for all contract transitions
- Utility functions for time conversion, share calculation, and more
- Strict type safety with comprehensive error handling
- Support for testnet and mainnet networks

## Installation

```bash
npm install @digitalwill/sdk
```

## Quick Start

```typescript
import { DigitalWillClient, generateNonce, daysToBlocks } from '@digitalwill/sdk';

// Initialize client
const client = new DigitalWillClient({
  network: 'testnet',
  privateKey: 'your-private-key'
});

// Create a new will
const { config } = await client.createWill({
  nonce: generateNonce(),
  checkInPeriod: daysToBlocks(30),  // Check in every 30 days
  gracePeriod: daysToBlocks(7)       // 7 day grace period
});

console.log('Will created:', config.willId);
```

## Core Concepts

### Records

The SDK provides TypeScript interfaces for all Leo records:

- **WillConfig**: Main will configuration (owned by creator)
- **Beneficiary**: Beneficiary designation (owned by beneficiary)
- **LockedCredits**: Locked ALEO credits in the will
- **ClaimableShare**: Share claimable by beneficiary after trigger
- **SecretMessage**: Encrypted secret message storage
- **InheritanceClaim**: Proof of claim
- **TriggerBounty**: Bounty for triggering the will

### Time Conversions

```typescript
import { daysToBlocks, blocksToDays, formatTimeRemaining } from '@digitalwill/sdk';

// Convert days to blocks (Aleo ~20s block time)
const blocks = daysToBlocks(30);  // ~4320 blocks per day

// Convert back to days
const days = blocksToDays(blocks);

// Format for display
const formatted = formatTimeRemaining(blocks); // "30 days"
```

## Usage Examples

### Creating a Will

```typescript
import { DigitalWillClient, generateNonce, daysToBlocks } from '@digitalwill/sdk';

const client = new DigitalWillClient({ network: 'testnet' });

const response = await client.createWill({
  nonce: generateNonce(),
  checkInPeriod: daysToBlocks(30),
  gracePeriod: daysToBlocks(7)
});

const willConfig = response.config;
```

### Adding Beneficiaries

```typescript
// Add first beneficiary with 60% share
await client.addBeneficiary({
  config: willConfig,
  beneficiaryAddress: 'aleo1beneficiary1...',
  shareBps: 6000,  // 60% (basis points: 10000 = 100%)
  priority: 1
});

// Add second beneficiary with 40% share
await client.addBeneficiary({
  config: willConfig,
  beneficiaryAddress: 'aleo1beneficiary2...',
  shareBps: 4000,  // 40%
  priority: 2
});
```

### Check-In Operations

```typescript
// Regular check-in (requires WillConfig record)
await client.checkIn({ config: willConfig });

// Backup check-in (uses public will_id, no record needed)
await client.checkInBackup({ willId: willConfig.willId });
```

### Depositing and Withdrawing

```typescript
import { aleoToMicrocredits } from '@digitalwill/sdk';

// Deposit 100 ALEO
const depositResponse = await client.deposit({
  config: willConfig,
  amount: aleoToMicrocredits(100)
});

const lockedCredits = depositResponse.lockedCredits;

// Withdraw (only when will is active)
await client.withdraw({
  config: willConfig,
  lockedCredits
});
```

### Storing Secrets

```typescript
// Store encrypted secret message (8 field elements = ~250 bytes)
await client.storeSecret({
  config: willConfig,
  recipient: 'aleo1recipient...',
  data0: '123field',
  data1: '456field',
  data2: '789field',
  data3: '0field',
  data4: '0field',
  data5: '0field',
  data6: '0field',
  data7: '0field',
  nonce: generateNonce()
});
```

### Triggering and Claiming

```typescript
// Anyone can trigger the will after deadline
const triggerResponse = await client.triggerWill({
  willId: willConfig.willId
});

// Beneficiary claims their share
const claimResponse = await client.claimInheritance({
  beneficiaryRecord: myBeneficiaryRecord,
  lockedCredits: willLockedCredits
});

console.log('Claimed:', claimResponse.claimableShare.amount);
```

### Emergency Recovery

```typescript
// Owner can recover if still alive and < 50% claimed
const recoveryResponse = await client.emergencyRecovery({
  config: willConfig,
  lockedCredits: myLockedCredits
});
```

### Getting Will Status

```typescript
const status = await client.getWillStatus(willConfig.willId);

console.log('Status:', status.status);
console.log('Last check-in:', status.lastCheckin);
console.log('Is overdue:', status.isOverdue);
console.log('Blocks until deadline:', status.blocksUntilDeadline);
console.log('Total locked:', status.totalLocked);
```

## Utility Functions

### Share Calculations

```typescript
import {
  calculateShare,
  bpsToPercent,
  percentToBps,
  validateSharesTotal
} from '@digitalwill/sdk';

// Calculate share amount
const share = calculateShare(10000n, 5000);  // 50% of 10000 = 5000

// Convert between basis points and percentage
const percent = bpsToPercent(5000);  // 50%
const bps = percentToBps(50);         // 5000

// Validate shares total 100%
const isValid = validateSharesTotal([6000, 4000]);  // true (60% + 40%)
```

### Credit Conversions

```typescript
import {
  aleoToMicrocredits,
  microcreditsToAleo,
  formatAleo
} from '@digitalwill/sdk';

// Convert ALEO to microcredits
const micro = aleoToMicrocredits(1.5);  // 1500000n

// Convert back
const aleo = microcreditsToAleo(1500000n);  // 1.5

// Format for display
const formatted = formatAleo(1500000n);  // "1.500000 ALEO"
```

### Validation

```typescript
import { isValidAleoAddress, isValidField } from '@digitalwill/sdk';

const validAddress = isValidAleoAddress('aleo1...');  // true/false
const validField = isValidField('123field');           // true/false
```

## Constants

```typescript
import {
  PROGRAM_NAME,
  BLOCKS_PER_DAY,
  MIN_CHECKIN_PERIOD,
  MAX_CHECKIN_PERIOD,
  MAX_BENEFICIARIES,
  WillStatus,
  STATUS_LABELS
} from '@digitalwill/sdk';

console.log(PROGRAM_NAME);           // 'digital_will_v7.aleo'
console.log(BLOCKS_PER_DAY);         // 4320
console.log(MAX_BENEFICIARIES);      // 10
console.log(WillStatus.ACTIVE);      // 1
console.log(STATUS_LABELS[WillStatus.ACTIVE]);  // 'Active'
```

## Type Safety

The SDK is built with strict TypeScript configuration for maximum type safety:

```typescript
import type {
  WillConfig,
  Beneficiary,
  LockedCredits,
  WillStatusInfo
} from '@digitalwill/sdk';

// All parameters are fully typed
const params: AddBeneficiaryParams = {
  config: willConfig,
  beneficiaryAddress: 'aleo1...',
  shareBps: 5000,
  priority: 1
};

// Compile-time type checking prevents errors
const response = await client.addBeneficiary(params);
```

## Error Handling

```typescript
try {
  await client.addBeneficiary({
    config: willConfig,
    beneficiaryAddress: 'aleo1...',
    shareBps: 15000,  // Invalid: > 10000
    priority: 1
  });
} catch (error) {
  console.error('Error:', error.message);
  // "Share basis points must be between 1 and 10000"
}
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Clean

```bash
npm run clean
```

## Project Structure

```
sdk/
├── src/
│   ├── index.ts          # Main exports
│   ├── types.ts          # TypeScript interfaces
│   ├── client.ts         # DigitalWillClient class
│   ├── utils.ts          # Utility functions
│   └── constants.ts      # Constants and enums
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

## Contributing

Contributions welcome! Please ensure all code passes TypeScript strict mode checks.
