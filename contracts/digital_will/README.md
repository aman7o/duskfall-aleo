# Digital Will Smart Contract

A privacy-preserving digital inheritance system built on Aleo blockchain using Leo programming language.

## Overview

The Digital Will dApp implements a "Dead Man's Switch" mechanism that allows users to:
- Lock ALEO credits in a smart contract
- Designate beneficiaries with specific inheritance shares
- Require periodic check-ins to prove they're alive
- Automatically distribute assets to beneficiaries if check-ins stop
- Store encrypted secret messages that transfer to beneficiaries upon trigger

## Key Features

### Privacy-Preserving
- All will configurations are stored as private records
- Beneficiary information is hashed and committed
- Minimal public state (only essential verification data)
- Encrypted secret message storage

### Secure Asset Management
- Real ALEO credits locking via credits.aleo integration
- Share-based distribution (supports up to 100% allocation)
- Automatic bounty system (0.1% to trigger caller)
- Emergency recovery mechanism

### Flexible Configuration
- Customizable check-in periods (1 day to 1 year)
- Grace periods for delayed check-ins
- Support for up to 10 beneficiaries per will
- Beneficiary management (add/revoke/update)

## Contract Architecture

### Records (Private State)

#### WillConfig
The main configuration record owned by the will creator.
```leo
record WillConfig {
    owner: address,              // Will creator
    will_id: field,              // Unique identifier (hash-based)
    check_in_period: u64,        // Required check-in frequency (blocks)
    grace_period: u64,           // Extra time before trigger
    total_shares_bps: u16,       // Total allocated shares (must = 10000 for 100%)
    num_beneficiaries: u8,       // Count of beneficiaries
    is_active: bool,             // Active status
    nonce: field,                // For cryptographic operations
}
```

#### Beneficiary
Designation record owned by each beneficiary.
```leo
record Beneficiary {
    owner: address,              // The beneficiary
    will_owner: address,         // Original will creator
    will_id: field,              // Associated will
    share_bps: u16,              // Share in basis points (10000 = 100%)
    priority: u8,                // Priority level
    verification_hash: field,    // Authenticity proof
    is_active: bool,             // Can be revoked
}
```

#### LockedCredits
Represents actual ALEO credits locked in the will.
```leo
record LockedCredits {
    owner: address,              // Record holder
    will_id: field,              // Associated will
    amount: u64,                 // Microcredits locked
    depositor: address,          // Who deposited
    deposit_block: u64,          // When deposited
}
```

#### ClaimableShare
Created when will is triggered, represents beneficiary's claimable amount.
```leo
record ClaimableShare {
    owner: address,              // Beneficiary
    will_id: field,              // Associated will
    amount: u64,                 // Claimable microcredits
    original_owner: address,     // Deceased owner
    claim_deadline: u64,         // Deadline to claim
}
```

#### SecretMessage
Encrypted data storage (up to ~250 bytes).
```leo
record SecretMessage {
    owner: address,
    will_id: field,
    recipient: address,
    data_0: field,               // 8 fields for expanded storage
    data_1: field,
    data_2: field,
    data_3: field,
    data_4: field,
    data_5: field,
    data_6: field,
    data_7: field,
    nonce: field,
}
```

### Mappings (Public State)

- `will_status`: Track will state (inactive/active/triggered/claimed)
- `last_checkin`: Last check-in block height
- `checkin_periods`: Required check-in frequency
- `grace_periods`: Grace period duration
- `total_locked`: Total credits locked in will
- `total_claimed`: Total credits claimed by beneficiaries
- `beneficiary_commitment`: Hash commitment to beneficiary list
- `owner_hash`: Owner address hash (for backup verification)

## Transitions (Public Functions)

### 1. create_will
Create a new digital will.

**Parameters:**
- `nonce`: Random value for will_id generation
- `check_in_period`: Check-in frequency in blocks (min: 4320, max: 1576800)
- `grace_period`: Additional time before trigger (min: 4320 blocks)

**Returns:** WillConfig record

**Example:**
```bash
leo run create_will 12345field 86400u64 43200u64
```

### 2. check_in
Prove you're alive by checking in.

**Parameters:**
- `config`: Your WillConfig record

**Returns:** Updated WillConfig

**Example:**
```bash
leo run check_in "{owner:aleo1..., will_id:1234field, ...}"
```

### 3. check_in_backup
Emergency check-in without WillConfig record (uses on-chain owner hash).

**Parameters:**
- `will_id`: Your will identifier (public)

**Returns:** Future confirmation

**Example:**
```bash
leo run check_in_backup 1234field
```

### 4. add_beneficiary
Add a beneficiary with inheritance share.

**Parameters:**
- `config`: Your WillConfig record
- `beneficiary_address`: Beneficiary's Aleo address
- `share_bps`: Share in basis points (100 = 1%, 10000 = 100%)
- `priority`: Priority level (0-255)

**Returns:** Updated WillConfig, Beneficiary record

**Example:**
```bash
# Give 50% to beneficiary
leo run add_beneficiary "{config}" aleo1beneficiary... 5000u16 1u8
```

### 5. revoke_beneficiary
Remove a beneficiary from the will.

**Parameters:**
- `config`: Your WillConfig record
- `beneficiary_record`: The Beneficiary record to revoke

**Returns:** Updated WillConfig, revoked Beneficiary

**Example:**
```bash
leo run revoke_beneficiary "{config}" "{beneficiary_record}"
```

### 6. deposit
Deposit ALEO credits into the will (with credits.aleo integration).

**Parameters:**
- `config`: Your WillConfig record
- `user_credits`: Your credits.aleo/credits record
- `amount`: Amount in microcredits

**Returns:** WillConfig, remaining credits, LockedCredits record

**Example:**
```bash
leo run deposit "{config}" "{credits_record}" 1000000u64
```

### 7. withdraw
Withdraw credits before will is triggered.

**Parameters:**
- `config`: Your WillConfig record
- `locked_credits`: LockedCredits record to withdraw

**Returns:** WillConfig, credits.aleo/credits record

**Example:**
```bash
leo run withdraw "{config}" "{locked_credits}"
```

### 8. store_secret
Store an encrypted secret message for a beneficiary.

**Parameters:**
- `config`: Your WillConfig record
- `recipient`: Beneficiary address
- `data_0` through `data_7`: 8 field elements of encrypted data
- `nonce`: Encryption nonce

**Returns:** WillConfig, SecretMessage record

**Example:**
```bash
leo run store_secret "{config}" aleo1recipient... 123field 456field ...
```

### 9. transfer_secret
Transfer a secret message to beneficiary after will is triggered.

**Parameters:**
- `secret`: SecretMessage record
- `beneficiary_record`: Beneficiary record
- `will_id`: Will identifier (public)

**Returns:** Transferred SecretMessage

**Example:**
```bash
leo run transfer_secret "{secret}" "{beneficiary}" 1234field
```

### 10. trigger_will
Trigger the will after check-in deadline passes (anyone can call).

**Parameters:**
- `will_id`: Will identifier (public)

**Returns:** TriggerBounty record (0.1% bounty to caller)

**Example:**
```bash
leo run trigger_will 1234field
```

### 11. claim_inheritance
Beneficiary claims their inheritance share.

**Parameters:**
- `beneficiary_record`: Your Beneficiary record
- `locked_credits`: LockedCredits record from the will

**Returns:** ClaimableShare, InheritanceClaim proof

**Example:**
```bash
leo run claim_inheritance "{beneficiary_record}" "{locked_credits}"
```

### 12. finalize_claim_to_credits
Convert ClaimableShare to actual credits.aleo credits.

**Parameters:**
- `claimable`: ClaimableShare record

**Returns:** credits.aleo/credits record

**Example:**
```bash
leo run finalize_claim_to_credits "{claimable_share}"
```

### 13. emergency_recovery
Owner reclaims assets if accidentally triggered or still alive.

**Parameters:**
- `config`: Your WillConfig record
- `locked_credits`: LockedCredits to recover

**Returns:** Reactivated WillConfig, credits.aleo/credits

**Constraints:**
- Can only recover if less than 50% claimed

**Example:**
```bash
leo run emergency_recovery "{config}" "{locked_credits}"
```

### 14. update_check_in_period
Change the required check-in frequency.

**Parameters:**
- `config`: Your WillConfig record
- `new_period`: New period in blocks

**Returns:** Updated WillConfig

**Example:**
```bash
leo run update_check_in_period "{config}" 172800u64
```

### 15. deactivate_will / reactivate_will
Temporarily disable or re-enable the will.

**Parameters:**
- `config`: Your WillConfig record

**Returns:** Updated WillConfig

**Example:**
```bash
leo run deactivate_will "{config}"
leo run reactivate_will "{config}"
```

## Building and Testing Locally

### Prerequisites

1. Install Leo compiler:
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Leo
cargo install leo-lang
```

2. Verify installation:
```bash
leo --version
```

### Build the Contract

```bash
cd /Users/amansingh/digitalwill/contracts/digital_will

# Build the contract
leo build
```

This compiles `src/main.leo` and generates:
- `build/main.aleo` - Compiled Aleo instructions
- `build/program.json` - Program metadata

### Run Tests

```bash
# Run all tests
leo test

# Run specific test
leo test test_create_will
```

### Local Execution Examples

#### Example 1: Create a Will
```bash
leo run create_will \
    12345field \
    86400u64 \
    43200u64
```

#### Example 2: Add Two Beneficiaries (60% and 40%)
```bash
# First beneficiary - 60%
leo run add_beneficiary \
    "{owner:aleo1owner..., will_id:1234field, ...}" \
    aleo1beneficiary1... \
    6000u16 \
    1u8

# Second beneficiary - 40%
leo run add_beneficiary \
    "{owner:aleo1owner..., will_id:1234field, total_shares_bps:6000u16, ...}" \
    aleo1beneficiary2... \
    4000u16 \
    2u8
```

#### Example 3: Deposit Credits
```bash
leo run deposit \
    "{config}" \
    "{owner:aleo1owner..., microcredits:1000000000u64}" \
    500000000u64
```

#### Example 4: Trigger and Claim
```bash
# Anyone can trigger after deadline
leo run trigger_will 1234field

# Beneficiary claims their share
leo run claim_inheritance \
    "{beneficiary_record}" \
    "{locked_credits}"

# Convert to actual credits
leo run finalize_claim_to_credits "{claimable_share}"
```

## Credits.aleo Integration

The contract uses `credits.aleo` for real ALEO token transfers. The integration pattern is:

### Deposit Flow
```
User Credits → credits.aleo/transfer_private → Program Address
                                             ↓
                                    Create LockedCredits record
```

### Withdrawal Flow
```
LockedCredits → Verify ownership → credits.aleo/transfer_private → User Credits
```

### Claim Flow
```
Triggered Will → Beneficiary proves share → credits.aleo/transfer_private → Beneficiary Credits
```

**Note:** In `main_with_credits.leo`, actual credits.aleo calls are commented with `*** CREDITS.ALEO INTEGRATION ***` markers. For production deployment on Aleo network, uncomment and implement these integrations.

## Testing Without Full Network

For local testing without deploying to Aleo testnet/mainnet:

1. Use `main.leo` (current version) which simulates credits without requiring credits.aleo
2. Focus on testing logic flow, record management, and state transitions
3. Validate share calculations, timing logic, and access controls

For production deployment:

1. Use `main_with_credits.leo` with proper credits.aleo integration
2. Deploy to Aleo testnet first for thorough testing
3. Ensure credits.aleo is available and imported correctly

## Security Considerations

1. **Check-in Frequency**: Choose appropriate periods based on your lifestyle
2. **Grace Period**: Add buffer time for travel, emergencies, etc.
3. **Beneficiary Shares**: Must total exactly 10000 basis points (100%)
4. **Emergency Recovery**: Only works if less than 50% claimed
5. **Private Keys**: Beneficiaries need their private keys to claim
6. **Record Management**: Keep WillConfig and Beneficiary records secure

## Constants

```leo
MIN_CHECKIN_PERIOD: 4320 blocks     // ~1 day
MAX_CHECKIN_PERIOD: 1576800 blocks  // ~1 year
MAX_BENEFICIARIES: 10
TRIGGER_BOUNTY_BPS: 10              // 0.1% of locked value
```

## Status Codes

- `0` - Inactive (deactivated)
- `1` - Active (normal operation)
- `2` - Triggered (check-in deadline passed)
- `3` - Claimed (fully distributed)
- `4` - Recovered (emergency recovery completed)

## File Structure

```
contracts/digital_will/
├── src/
│   ├── main.leo                  # Original contract (simulated credits)
│   └── main_with_credits.leo     # Enhanced with credits.aleo integration
├── build/                        # Compiled output (after leo build)
├── inputs/                       # Test inputs
├── outputs/                      # Test outputs
└── README.md                     # This file
```

## Common Issues and Solutions

### Issue: Will ID collision
**Solution:** Use truly random nonce values for create_will

### Issue: Shares don't add to 100%
**Solution:** Ensure all beneficiary shares total exactly 10000 basis points

### Issue: Can't trigger will
**Solution:** Verify check-in period + grace period has elapsed

### Issue: Claim fails
**Solution:** Ensure will is triggered (status = 2) and beneficiary record is valid

### Issue: Emergency recovery blocked
**Solution:** Recovery only works if less than 50% of assets claimed

## Further Development

Potential enhancements:
- Multi-signature requirements for large wills
- Conditional inheritance (time-locked, condition-based)
- Integration with other Aleo programs (NFTs, custom tokens)
- Automated check-in via Oracle integration
- Legal document storage (IPFS hash storage)

## Resources

- [Leo Documentation](https://developer.aleo.org/leo/)
- [Aleo Documentation](https://developer.aleo.org/)
- [Credits.aleo Reference](https://github.com/AleoHQ/snarkVM/tree/mainnet/synthesizer/program/src/resources/credits.aleo)

## License

This contract is provided as-is for educational and personal use. Review thoroughly and audit before production deployment with real assets.

## Support

For issues or questions:
1. Check the Leo documentation
2. Review Aleo developer forums
3. Test thoroughly on Aleo testnet before mainnet deployment

---

**IMPORTANT DISCLAIMER**: This smart contract manages real digital assets. Always test thoroughly, conduct security audits, and understand the implications before deploying to mainnet. The authors are not responsible for any loss of funds.
