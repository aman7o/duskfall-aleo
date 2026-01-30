# Security Audit Report: Digital Will Smart Contract

**Contract:** `digital_will_v3.aleo`
**File:** `/Users/amansingh/digitalwill/contracts/digital_will/src/main.leo`
**Audit Date:** 2026-01-22
**Auditor:** Internal Security Review

---

## Executive Summary

This security audit examines the Digital Will smart contract, a privacy-preserving digital inheritance system built on Aleo. The contract implements a dead man's switch mechanism allowing users to create wills, add beneficiaries, deposit funds, and automatically distribute assets after a check-in deadline expires.

**Overall Risk Level: MEDIUM-HIGH**

The contract demonstrates good security practices in several areas but contains critical and high-severity vulnerabilities that could result in fund loss, unauthorized access, or economic exploitation.

| Severity | Count |
|----------|-------|
| Critical | 2     |
| High     | 4     |
| Medium   | 5     |
| Low      | 3     |
| Informational | 4 |

---

## Findings Summary

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| C-01 | Multiple Claims by Same Beneficiary | Critical | Open |
| C-02 | Emergency Recovery Fund Drainage | Critical | Open |
| H-01 | Beneficiary Record Not Consumed After Claim | High | Open |
| H-02 | Record-Mapping State Desynchronization | High | Open |
| H-03 | Arithmetic Overflow in Deadline Calculation | High | Open |
| H-04 | Self.signer vs Self.caller Confusion in Deposit | High | Open |
| M-01 | Revoke Beneficiary Does Not Update Mapping | Medium | Open |
| M-02 | Total Shares Can Exceed Locked Funds | Medium | Open |
| M-03 | Missing Upper Bound on Grace Period | Medium | Open |
| M-04 | Withdrawal Without Claim Verification | Medium | Open |
| M-05 | Trigger Bounty Can Drain More Than Available | Medium | Open |
| L-01 | Will ID Predictability | Low | Open |
| L-02 | No Minimum Deposit Amount | Low | Open |
| L-03 | Admin Annotation Hardcoded Address | Low | Open |
| I-01 | Unused Verification Hash | Informational | Open |
| I-02 | SecretMessage Owner Privacy Concern | Informational | Open |
| I-03 | Status Code Magic Numbers | Informational | Open |
| I-04 | Missing Event Emissions | Informational | Open |

---

## Detailed Findings

### Critical Severity

#### C-01: Multiple Claims by Same Beneficiary

**Location:** Lines 391-432 (`claim_inheritance` transition)

**Description:**
The `claim_inheritance` function does not consume or invalidate the beneficiary record after a claim is made. A beneficiary can repeatedly call this function with the same `Beneficiary` record to claim their share multiple times until the `total_locked` is drained.

**Vulnerable Code:**
```leo
async transition claim_inheritance(
    private beneficiary_record: Beneficiary,  // Record is not consumed
    public amount_to_claim: u64,
) -> (credits.aleo/credits, InheritanceClaim, Future) {
    assert_eq(beneficiary_record.owner, self.caller);
    assert(beneficiary_record.is_active);
    // ... claims funds but record remains usable
}
```

**Impact:**
A beneficiary can drain all locked funds by repeatedly claiming their share, effectively stealing funds from other beneficiaries.

**Proof of Concept:**
1. Beneficiary has 10% share (1000 bps) of 100,000 credits
2. Expected share: 10,000 credits
3. Beneficiary calls `claim_inheritance` 10 times with same record
4. Total claimed: 100,000 credits (entire fund drained)

**Recommendation:**
Either consume the beneficiary record or track claims per beneficiary:
```leo
// Option 1: Return invalidated beneficiary record
let claimed_beneficiary: Beneficiary = Beneficiary {
    owner: beneficiary_record.owner,
    // ... other fields
    is_active: false,  // Mark as claimed
};
return (payout, claim, claimed_beneficiary, finalize_claim(...));

// Option 2: Track claims per beneficiary in mapping
mapping beneficiary_claimed: field => bool;  // hash(will_id + beneficiary_addr) => claimed
```

---

#### C-02: Emergency Recovery Fund Drainage

**Location:** Lines 434-474 (`emergency_recovery` transition)

**Description:**
The emergency recovery function allows the will owner to recover funds and reactivate the will even after triggering. The check `claimed < total / 2u64` can be bypassed because the function does not actually transfer funds - it merely reissues a `LockedCredits` record.

**Vulnerable Code:**
```leo
async transition emergency_recovery(
    private config: WillConfig,
    private locked_credits: LockedCredits,
) -> (WillConfig, LockedCredits, Future) {
    // Only checks ownership, no actual fund transfer
    let recovered: LockedCredits = LockedCredits {
        owner: self.caller,
        will_id: locked_credits.will_id,
        amount: locked_credits.amount,  // Just reissues same amount
        depositor: locked_credits.depositor,
    };
    // ...
}
```

**Impact:**
1. If will owner "dies" and will is triggered
2. Owner recovers consciousness or was never dead
3. Owner can emergency recover, but this creates a race condition with beneficiaries
4. More critically: the function reissues LockedCredits without deducting from total_locked mapping

**Recommendation:**
Add proper fund transfer logic and stricter time-based restrictions:
```leo
// Add time lock for emergency recovery
mapping recovery_lockout: field => u32;  // will_id => earliest_recovery_block

// In finalize_recovery:
let lockout: u32 = Mapping::get_or_use(recovery_lockout, will_id, 0u32);
assert(block.height >= lockout);
```

---

### High Severity

#### H-01: Beneficiary Record Not Consumed After Claim

**Location:** Lines 391-432

**Description:**
In Aleo's record model, consuming a record should prevent its reuse. However, the `claim_inheritance` transition does not return a modified/consumed version of the beneficiary record, allowing the same record to be used multiple times.

**Impact:**
Enables the C-01 vulnerability and breaks the fundamental assumption of record consumption.

**Recommendation:**
Return a consumed/invalidated beneficiary record from the transition.

---

#### H-02: Record-Mapping State Desynchronization

**Location:** Multiple transitions

**Description:**
The contract maintains state in both private records (WillConfig, LockedCredits) and public mappings (total_locked, will_status). These can become desynchronized because:

1. Records are created/modified in the transition phase
2. Mappings are updated in the finalize phase
3. If finalize fails, records still exist but mappings are not updated

**Example Scenario:**
```leo
// In deposit transition:
let locked: LockedCredits = LockedCredits { ... };  // Record created
return (..., finalize_deposit(...));  // If finalize fails, record exists but total_locked not updated
```

**Impact:**
- Users may hold LockedCredits records that don't correspond to actual locked funds
- total_locked can undercount or overcount actual deposited amounts
- Withdrawal attempts may fail or succeed incorrectly

**Recommendation:**
Implement idempotent operations and add record-mapping reconciliation mechanisms. Consider using a nonce-based tracking system.

---

#### H-03: Arithmetic Overflow in Deadline Calculation

**Location:** Lines 171, 195, 378

**Description:**
The deadline calculation `last_check + period + grace` can overflow if the sum exceeds `u32::MAX` (4,294,967,295).

**Vulnerable Code:**
```leo
let deadline: u32 = last_check + period + grace;
```

**Impact:**
If `last_check` is near `u32::MAX` (which represents block height), adding period and grace could cause overflow, resulting in:
- Deadline wrapping to a small number
- Will becoming immediately triggerable
- Beneficiaries claiming prematurely

**Recommendation:**
Add overflow protection:
```leo
// Ensure no overflow
assert(last_check <= u32::MAX - period - grace);
let deadline: u32 = last_check + period + grace;
```

---

#### H-04: Self.signer vs Self.caller Confusion in Deposit

**Location:** Lines 294-298

**Description:**
The deposit function uses `self.signer` as the recipient for the credits transfer, but ownership checks use `self.caller`. In nested call scenarios, these can differ.

**Vulnerable Code:**
```leo
let (remaining, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_private_to_public(
    credits_record,
    self.signer,  // Uses signer, not caller
    amount
);
```

**Impact:**
In a scenario where a malicious contract calls `deposit` on behalf of a user:
- `self.caller` would be the malicious contract
- `self.signer` would be the original user
- Funds could be misdirected

**Recommendation:**
Use consistent address references throughout:
```leo
credits.aleo/transfer_private_to_public(credits_record, self.caller, amount)
```

---

### Medium Severity

#### M-01: Revoke Beneficiary Does Not Update Mapping

**Location:** Lines 251-281

**Description:**
The `revoke_beneficiary` function modifies the beneficiary record but has no finalize phase to update any public state. If beneficiary shares were tracked publicly, this would create inconsistency.

**Impact:**
Minor state inconsistency; could affect off-chain indexing.

**Recommendation:**
Add a finalize function or document that revocation is purely record-based.

---

#### M-02: Total Shares Can Exceed Locked Funds

**Location:** Lines 201-244, 391-432

**Description:**
Beneficiary shares are tracked in basis points (bps) summing to 10000 (100%). However, there's no enforcement that `total_shares_bps` cannot be reduced to below the originally allocated amounts after claims begin.

**Scenario:**
1. Will has 100,000 credits locked
2. Beneficiary A: 50%, Beneficiary B: 50%
3. A claims 50,000 credits
4. Owner revokes B (before B claims)
5. total_shares_bps reduced, but A already claimed based on original total

**Impact:**
Share calculations may not align with actual fund distribution.

**Recommendation:**
Prevent beneficiary revocation after will is triggered (status == 2u8).

---

#### M-03: Missing Upper Bound on Grace Period

**Location:** Lines 99-123

**Description:**
While `check_in_period` has MAX_CHECKIN_PERIOD validation, `grace_period` only has a minimum check:

```leo
assert(grace_period >= MIN_CHECKIN_PERIOD);
// No maximum check!
```

**Impact:**
A malicious or careless user could set grace_period to near `u32::MAX`, making the will effectively untriggerable.

**Recommendation:**
Add maximum validation:
```leo
assert(grace_period <= MAX_CHECKIN_PERIOD);
```

---

#### M-04: Withdrawal Without Claim Verification

**Location:** Lines 529-556

**Description:**
The `withdraw` function allows the owner to withdraw funds while the will is active (status == 1u8), but doesn't check if beneficiaries have any expectations based on existing shares.

**Impact:**
Owner could withdraw all funds after adding beneficiaries, leaving beneficiaries with nothing to claim.

**Recommendation:**
Either:
- Prevent withdrawal if beneficiaries exist
- Track "committed" vs "withdrawable" amounts separately

---

#### M-05: Trigger Bounty Can Drain More Than Available

**Location:** Lines 345-389

**Description:**
The bounty calculation is based on `expected_locked` provided by the caller. While verified in finalize, the transfer happens before verification:

```leo
let bounty_amount: u64 = (expected_locked * TRIGGER_BOUNTY_BPS) / 10000u64;
let (bounty_payout, transfer_future) = credits.aleo/transfer_public_to_private(...);
// ... finalize verifies expected_locked == actual locked
```

**Impact:**
If the program's public balance is less than the calculated bounty, the transaction will fail. This is by design but could lead to griefing where valid triggers fail.

**Recommendation:**
Add minimum balance requirements or handle insufficient balance gracefully.

---

### Low Severity

#### L-01: Will ID Predictability

**Location:** Lines 108

**Description:**
The will_id is computed as:
```leo
let will_id: field = BHP256::hash_to_field(BHP256::hash_to_field(self.caller) + nonce);
```

If the nonce is predictable or reused, will_id becomes predictable.

**Impact:**
Potential front-running or will ID collision attacks (though collision is cryptographically unlikely).

**Recommendation:**
Document that nonce must be unique and unpredictable. Consider using a counter-based approach.

---

#### L-02: No Minimum Deposit Amount

**Location:** Lines 283-319

**Description:**
The deposit function only checks `amount > 0u64` without a meaningful minimum:
```leo
assert(amount > 0u64);
```

**Impact:**
Dust attacks possible; users could create wills with 1 microcredit deposits.

**Recommendation:**
Add minimum deposit requirement:
```leo
const MIN_DEPOSIT: u64 = 1000000u64;  // 1 credit minimum
assert(amount >= MIN_DEPOSIT);
```

---

#### L-03: Admin Annotation Hardcoded Address

**Location:** Lines 8-10

**Description:**
The admin address is hardcoded in the contract:
```leo
@admin(address="aleo1z7fz8f3mz0mgm769uqpqhek34luq33y9dldqw4hp06nxurrrgc8sa7uyah")
async constructor() {}
```

**Impact:**
Admin capabilities are permanently tied to one address. If compromised, no recovery possible.

**Recommendation:**
Document admin capabilities and consider upgrade mechanisms.

---

### Informational

#### I-01: Unused Verification Hash

**Location:** Lines 218-229

**Description:**
The `verification_hash` field in Beneficiary records is computed but never validated anywhere:
```leo
let verification: field = BHP256::hash_to_field(...);
```

**Recommendation:**
Either use this field for verification or remove it to reduce complexity.

---

#### I-02: SecretMessage Owner Privacy Concern

**Location:** Lines 321-343

**Description:**
The `SecretMessage` record has `owner: self.caller` (the will owner), not the recipient:
```leo
let secret: SecretMessage = SecretMessage {
    owner: self.caller,  // Will owner, not recipient
    recipient: recipient,
    // ...
};
```

**Impact:**
The recipient cannot access the secret message directly; only the will owner holds it.

**Recommendation:**
Consider creating a separate record for the recipient or documenting intended usage.

---

#### I-03: Status Code Magic Numbers

**Location:** Throughout

**Description:**
Will status uses magic numbers:
- 0u8: Deactivated/Non-existent
- 1u8: Active
- 2u8: Triggered
- 3u8: Fully claimed

**Recommendation:**
Document status codes in comments or use named constants.

---

#### I-04: Missing Event Emissions

**Location:** Throughout

**Description:**
The contract lacks event emissions for critical state changes, making off-chain monitoring difficult.

**Recommendation:**
Add events for will creation, triggering, claims, etc.

---

## Access Control Analysis

| Transition | Access Control | Status |
|------------|---------------|--------|
| create_will | Anyone | OK |
| check_in | WillConfig owner (self.caller) | OK |
| check_in_backup | Owner hash verification | OK |
| add_beneficiary | WillConfig owner | OK |
| revoke_beneficiary | WillConfig owner | OK |
| deposit | WillConfig owner | OK |
| store_secret | WillConfig owner | OK |
| trigger_will | Anyone (by design) | OK |
| claim_inheritance | Beneficiary record owner | VULNERABLE - No consumption |
| emergency_recovery | WillConfig owner | VULNERABLE - Race condition |
| deactivate_will | WillConfig owner | OK |
| reactivate_will | WillConfig owner | OK |
| withdraw | WillConfig owner | OK |

---

## Arithmetic Operations Analysis

| Location | Operation | Overflow Risk |
|----------|-----------|---------------|
| Line 108 | hash + nonce | None (field type) |
| Line 171 | last_check + period + grace | HIGH |
| Line 195 | last_check + period + grace | HIGH |
| Line 212 | total_shares_bps + share_bps | Protected by <= 10000 check |
| Line 238 | num_beneficiaries + 1u8 | Protected by < MAX check |
| Line 274 | total_shares_bps - share_bps | Underflow possible if inconsistent |
| Line 275 | num_beneficiaries - 1u8 | Underflow possible if 0 |
| Line 318 | current + amount | Potential overflow |
| Line 350 | expected_locked * TRIGGER_BOUNTY_BPS | Potential overflow |
| Line 378 | last_check + period + grace | HIGH |
| Line 423 | total * share_bps | Potential overflow |
| Line 427 | current_claimed + amount | Potential overflow |

---

## Recommendations Summary

### Immediate Actions (Critical/High)

1. **Fix C-01:** Implement beneficiary claim tracking to prevent multiple claims
2. **Fix C-02:** Add proper fund transfer and time-locks for emergency recovery
3. **Fix H-03:** Add overflow protection for deadline calculations
4. **Fix H-04:** Use consistent self.caller throughout deposit

### Short-term Actions (Medium)

5. Add maximum grace period validation
6. Prevent beneficiary revocation after will triggering
7. Consider minimum deposit requirements
8. Add withdrawal restrictions when beneficiaries exist

### Long-term Improvements (Low/Informational)

9. Document status codes
10. Add event emissions
11. Review SecretMessage ownership model
12. Remove or utilize verification_hash field

---

## Test Coverage Recommendations

The following test cases should be implemented:

```
1. test_multiple_claim_prevention - Verify beneficiary cannot claim twice
2. test_emergency_recovery_race_condition - Test concurrent recovery and claims
3. test_deadline_overflow - Test with high block heights
4. test_share_calculation_accuracy - Verify shares sum correctly
5. test_withdrawal_with_beneficiaries - Test fund withdrawal scenarios
6. test_trigger_timing - Verify trigger only works after deadline
7. test_grace_period_bounds - Test extreme grace period values
8. test_reactivation_state_consistency - Verify mappings after reactivation
```

---

## Overall Security Assessment

**Security Score: 5/10**

The Digital Will smart contract implements a useful dead man's switch mechanism with privacy-preserving features using Aleo's record model. However, several critical and high-severity vulnerabilities must be addressed before production deployment:

**Strengths:**
- Good use of Aleo's record model for privacy
- Proper access control checks using self.caller
- Share validation prevents allocation over 100%
- Check-in deadline enforcement is sound
- Bounty mechanism incentivizes timely triggering

**Weaknesses:**
- Critical vulnerability allowing fund drainage through multiple claims
- Emergency recovery creates race conditions with beneficiaries
- Potential arithmetic overflows in deadline calculations
- Record-mapping synchronization issues
- Missing claim tracking mechanism

**Production Readiness: NOT READY**

This contract requires significant security improvements before handling real funds. The multiple-claim vulnerability (C-01) alone could result in complete fund loss for beneficiaries.

---

## Appendix A: File Structure

```
/Users/amansingh/digitalwill/contracts/digital_will/src/main.leo
- Lines 1-11: Program header and constructor
- Lines 12-20: Constants
- Lines 21-82: Record definitions
- Lines 83-94: Mapping definitions
- Lines 95-557: Transition and finalize functions
```

---

## Appendix B: Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 0u8 | Inactive | Will deactivated or not created |
| 1u8 | Active | Will is active, owner checking in |
| 2u8 | Triggered | Deadline passed, claims allowed |
| 3u8 | Completed | All funds claimed |

---

*This audit report is provided for informational purposes. A comprehensive audit should include formal verification, extensive testing, and review by multiple security experts.*
