# Digital Will dApp - Testing Guide

## Overview

This directory contains comprehensive testing resources for the Digital Will dApp smart contract (`digital_will_v2.aleo`).

## Quick Start

### 1. Build the Contract
```bash
cd /Users/amansingh/digitalwill/contracts/digital_will
leo build
```

### 2. Run the Test Suite
```bash
cd /Users/amansingh/digitalwill
./scripts/test-local.sh
```

### 3. Run Individual Tests
```bash
cd /Users/amansingh/digitalwill/contracts/digital_will

# Example: Create a will
leo run create_will --file inputs/create_will.in

# Example: Add a beneficiary (after updating with actual WillConfig)
leo run add_beneficiary --file inputs/add_beneficiary.in
```

## Directory Structure

```
/Users/amansingh/digitalwill/
├── contracts/digital_will/
│   ├── src/main.leo              # Smart contract source
│   ├── inputs/                    # Test input files
│   │   ├── create_will.in
│   │   ├── check_in.in
│   │   ├── add_beneficiary.in
│   │   ├── deposit.in
│   │   ├── trigger_will.in
│   │   ├── claim_inheritance.in
│   │   └── ... (15+ input files)
│   └── outputs/                   # Generated outputs
├── scripts/
│   └── test-local.sh             # Automated test script
├── tests/
│   ├── TEST_CASES.md             # Comprehensive test documentation
│   └── README.md                 # This file
└── logs/
    └── test_run_*.log            # Test execution logs
```

## Available Test Input Files

All test input files are located in `/Users/amansingh/digitalwill/contracts/digital_will/inputs/`:

### Core Operations
- `create_will.in` - Create a new digital will
- `check_in.in` - Standard check-in with WillConfig record
- `check_in_backup.in` - Emergency check-in without record

### Beneficiary Management
- `add_beneficiary.in` - Add first beneficiary (50% share)
- `add_beneficiary_second.in` - Add second beneficiary (30% share)
- `revoke_beneficiary.in` - Revoke a beneficiary's rights

### Configuration
- `update_check_in_period.in` - Change check-in frequency

### Asset Management
- `deposit.in` - Deposit ALEO credits into will
- `store_secret.in` - Store encrypted secret message
- `withdraw.in` - Withdraw credits (before trigger)

### Lifecycle
- `deactivate_will.in` - Temporarily deactivate will
- `reactivate_will.in` - Reactivate deactivated will

### Triggering & Claims
- `trigger_will.in` - Trigger will after deadline
- `claim_inheritance.in` - Beneficiary claims their share

### Emergency
- `emergency_recovery.in` - Owner recovers assets if still alive

## Testing Workflow

### Phase 1: Initial Setup
1. **Create Will** - Run `create_will.in`
   ```bash
   leo run create_will --file inputs/create_will.in
   ```
   - Save the output `WillConfig` record
   - Note the generated `will_id`

2. **Update Input Files** - Replace placeholder values in other input files with actual records from step 1

### Phase 2: Configuration
3. **Add Beneficiaries** - Run `add_beneficiary.in`
   - Use the WillConfig from create_will
   - Save the updated WillConfig and Beneficiary records
   - Repeat for multiple beneficiaries

4. **Configure Settings** - Run `update_check_in_period.in`, etc.

### Phase 3: Asset Management
5. **Deposit Assets** - Run `deposit.in`
   - Save the LockedCredits record

6. **Store Secrets** - Run `store_secret.in` (optional)

### Phase 4: Operations
7. **Check In** - Run `check_in.in` periodically
8. **Modify** - Update beneficiaries, withdraw funds as needed

### Phase 5: Triggering (Time-Dependent)
9. **Wait for Deadline** - Allow time to pass beyond check-in + grace period
10. **Trigger Will** - Run `trigger_will.in`
11. **Claim Inheritance** - Beneficiaries run `claim_inheritance.in`

### Phase 6: Recovery
12. **Emergency Recovery** - Owner can run `emergency_recovery.in` if triggered early

## Important Notes

### Record-Based Testing
Leo smart contracts use a UTXO-like model with records. Most tests require using actual output records from previous transitions:

```
[add_beneficiary]
config: WillConfig {
    owner: aleo1...,          # ⚠️ Replace with actual address
    will_id: 0field,          # ⚠️ Replace with actual will_id from create_will
    check_in_period: 8640u64,
    grace_period: 4320u64,
    total_shares_bps: 0u16,   # ⚠️ Update based on current state
    num_beneficiaries: 0u8,   # ⚠️ Update based on current state
    is_active: true,
    nonce: 1234567890field
}
```

### Time-Dependent Tests
Tests involving `trigger_will` require the deadline to pass:
- Deadline = last_checkin + check_in_period + grace_period
- With default inputs: ~3 days (8640 + 4320 blocks ≈ 3 days)
- In local development, you may need to use a test network or manually advance blocks

### Multiple Account Testing
For realistic testing of beneficiary scenarios:
1. Create multiple Aleo accounts
2. Use one account as the will owner
3. Use different accounts for beneficiaries
4. Run claims from the respective beneficiary accounts

## Test Cases Documentation

See `TEST_CASES.md` for comprehensive documentation of all test scenarios including:
- 70+ detailed test cases
- Test IDs, descriptions, inputs, expected outputs
- Negative tests and edge cases
- Test execution order and dependencies
- Pass/fail criteria

## Test Script Features

The automated test script (`test-local.sh`) provides:

- ✅ Automatic contract building
- ✅ Colored output for easy reading
- ✅ Test execution logging
- ✅ Test result summary
- ✅ Timestamped log files
- ⚠️ Most tests are commented out by default (require actual records)

To enable tests in the script:
1. Run initial tests to generate records
2. Update input files with actual record values
3. Uncomment the corresponding test sections in `test-local.sh`

## Troubleshooting

### Common Issues

#### 1. "Input file not found"
```
[ERROR] Input file not found: inputs/create_will.in
```
**Solution:** Ensure you're in the correct directory:
```bash
cd /Users/amansingh/digitalwill/contracts/digital_will
```

#### 2. "Assertion failed" errors
```
Error: Assertion failed: config.owner == self.caller
```
**Solution:** Update input file with correct record values from previous outputs

#### 3. "Will not found" or mapping errors
```
Error: Mapping key not found
```
**Solution:** Ensure prerequisite transitions have been run (e.g., create_will before check_in)

#### 4. "Invalid share percentage"
```
Error: Assertion failed: new_total <= 10000u16
```
**Solution:** Check that total beneficiary shares don't exceed 100% (10000 basis points)

#### 5. Time-dependent test failures
```
Error: Assertion failed: block.height > deadline
```
**Solution:** Wait for sufficient blocks to pass, or use a test network with controlled time

### Getting Help

1. Check the test case documentation in `TEST_CASES.md`
2. Review the contract source in `contracts/digital_will/src/main.leo`
3. Check execution logs in `logs/test_run_*.log`
4. Verify input files match the expected format for each transition

## Example: Complete Test Workflow

Here's a complete example of testing the will creation and beneficiary flow:

```bash
# Navigate to contract directory
cd /Users/amansingh/digitalwill/contracts/digital_will

# Step 1: Build
leo build

# Step 2: Create will
leo run create_will --file inputs/create_will.in
# Output: WillConfig {..., will_id: 123456789field, ...}

# Step 3: Edit add_beneficiary.in with actual WillConfig and will_id

# Step 4: Add first beneficiary
leo run add_beneficiary --file inputs/add_beneficiary.in
# Output: Updated WillConfig, Beneficiary record

# Step 5: Edit add_beneficiary_second.in with updated WillConfig

# Step 6: Add second beneficiary
leo run add_beneficiary --file inputs/add_beneficiary_second.in
# Output: WillConfig with 2 beneficiaries, 80% allocated

# Step 7: Deposit assets
# Edit deposit.in with current WillConfig
leo run deposit --file inputs/deposit.in
# Output: LockedCredits record

# Step 8: Check in
leo run check_in --file inputs/check_in.in
# Output: Updated WillConfig

# Step 9: Wait for deadline to pass (in production)
# For testing, you might use a test network or skip this

# Step 10: Trigger will (can be called by anyone)
leo run trigger_will --file inputs/trigger_will.in
# Output: TriggerBounty record

# Step 11: Claim inheritance (from beneficiary account)
# Edit claim_inheritance.in with Beneficiary and LockedCredits records
leo run claim_inheritance --file inputs/claim_inheritance.in
# Output: ClaimableShare, InheritanceClaim records
```

## Test Data Reference

### Test Addresses
```
Owner:        aleo1testowner00000000000000000000000000000000000000000000000
Beneficiary1: aleo1beneficiary1000000000000000000000000000000000000000000000
Beneficiary2: aleo1beneficiary2000000000000000000000000000000000000000000000
Beneficiary3: aleo1beneficiary3000000000000000000000000000000000000000000000
```

### Amounts (in microcredits)
```
1 ALEO     = 1000000u64
0.5 ALEO   = 500000u64
0.1 ALEO   = 100000u64
0.001 ALEO = 1000u64
```

### Share Percentages (basis points)
```
100% = 10000u16
50%  = 5000u16
30%  = 3000u16
20%  = 2000u16
10%  = 1000u16
1%   = 100u16
```

### Time Periods (blocks @ ~20s/block)
```
1 day (MIN)  = 4320 blocks
2 days       = 8640 blocks
4 days       = 17280 blocks
1 year (MAX) = 1576800 blocks
```

## Best Practices

1. **Always save output records** - You'll need them for subsequent tests
2. **Test incrementally** - Run one transition at a time initially
3. **Verify state changes** - Check that mappings are updated as expected
4. **Use version control** - Track changes to input files
5. **Document actual values** - Note what records you used in each test
6. **Test negative cases** - Ensure the contract properly rejects invalid inputs
7. **Clean state between test runs** - Be aware that mapping state persists

## Advanced Testing

### Integration Testing
For production readiness, consider:
- Testing with actual `credits.aleo` integration
- Multi-user scenarios with real accounts
- Stress testing with maximum beneficiaries (10)
- Large value testing (near u64::MAX)

### Security Testing
- Attempt unauthorized access to records
- Test overflow scenarios
- Verify cryptographic commitments
- Test race conditions in concurrent claims

### Performance Testing
- Measure gas costs for each transition
- Optimize frequently-used operations
- Test with maximum data sizes (e.g., 10 beneficiaries, all shares allocated)

## Resources

- [Leo Documentation](https://developer.aleo.org/leo/)
- [Aleo Developer Docs](https://developer.aleo.org/)
- [Contract Source](../contracts/digital_will/src/main.leo)
- [Test Cases](./TEST_CASES.md)

---

**Last Updated:** 2026-01-21
**Maintained By:** Digital Will Development Team
