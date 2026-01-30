# Automated Test Suite for Digital Will

## Overview

This test suite provides fully automated testing for the Digital Will dApp:

- **Layer 1**: Smart contract tests using Leo CLI (real testnet transactions)
- **Layer 2**: Frontend unit tests using Jest (mocked wallet)

## Setup

### 1. Create Test Wallet

```bash
# In Leo Wallet browser extension:
# 1. Create a NEW wallet (don't use your main wallet!)
# 2. Export the private key
# 3. Get testnet credits from faucet: https://faucet.aleo.org
```

### 2. Configure Environment

```bash
cd tests/automated
cp .env.test.example .env.test
# Edit .env.test with your test wallet private key
```

### 3. Install Dependencies

```bash
cd frontend
npm install
```

## Running Tests

### Run All Tests

```bash
cd tests/automated
./run-all.sh
```

### Run Layer 1 Only (Contract Tests)

```bash
./run-all.sh --layer1-only
```

### Run Layer 2 Only (Unit Tests)

```bash
./run-all.sh --layer2-only
# Or directly:
cd frontend && npm test
```

## Test Coverage

### Layer 1: Smart Contract Tests

| Test | Description |
|------|-------------|
| Create Will | Creates a new will with check-in/grace periods |
| Check In | Resets the dead man's switch timer |
| Deposit Public | Deposits credits using public balance |
| Query State | Verifies all on-chain mappings |
| Verify Logic | Tests contract logic locally |

### Layer 2: Frontend Unit Tests

| Test Suite | Coverage |
|------------|----------|
| Record Formatting | normalizeAleoValue, formatWillConfig, formatLockedCredits |
| Type Conversions | daysToBlocks, blocksToTime, percentToBps |
| Nonce Generation | generateSecureNonce |
| Error Formatting | formatWalletError |
| Aleo Service | RPC queries, value parsing, fee calculation |

## What These Tests Find

✅ **Layer 1 finds:**
- Smart contract logic errors
- On-chain state bugs
- Transaction validation issues
- Access control problems

✅ **Layer 2 finds:**
- Record formatting bugs
- Type conversion errors
- Utility function bugs
- Error handling issues

❌ **Not tested (requires manual E2E):**
- Wallet popup interactions
- Full UI flow
- Browser-specific issues

## Troubleshooting

### "TEST_PRIVATE_KEY not set"
→ Copy `.env.test.example` to `.env.test` and add your test wallet key

### "Program not deployed"
→ The contract must be deployed on testnet first

### "Insufficient balance"
→ Get more testnet credits from the faucet

### Tests timeout
→ Testnet may be slow; increase timeout in scripts

## Security

⚠️ **IMPORTANT:**
- Never commit `.env.test` with real keys
- Use a dedicated TEST wallet with minimal funds
- Never use your main wallet for automated testing
