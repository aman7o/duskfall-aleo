# Digital Will dApp - Test Cases Documentation

## Test Suite Overview

This document outlines all test cases for the Digital Will dApp (digital_will_v2.aleo). Tests are organized by functional areas and include inputs, expected outputs, and current status.

**Program:** `digital_will_v2.aleo`
**Last Updated:** 2026-01-21
**Test Framework:** Leo CLI with manual input files

---

## Test Categories

1. [Will Creation & Management](#1-will-creation--management)
2. [Check-In Operations](#2-check-in-operations)
3. [Beneficiary Management](#3-beneficiary-management)
4. [Asset Management](#4-asset-management)
5. [Will Lifecycle](#5-will-lifecycle)
6. [Will Triggering & Claims](#6-will-triggering--claims)
7. [Emergency & Recovery](#7-emergency--recovery)
8. [Edge Cases & Validation](#8-edge-cases--validation)

---

## 1. Will Creation & Management

### TC-001: Create Will with Valid Parameters

| Field | Value |
|-------|-------|
| **Test ID** | TC-001 |
| **Description** | Create a new digital will with valid check-in and grace periods |
| **Transition** | `create_will` |
| **Input File** | `create_will.in` |
| **Preconditions** | None |
| **Input Parameters** | - nonce: 1234567890field<br>- check_in_period: 8640u64 (~2 days)<br>- grace_period: 4320u64 (~1 day) |
| **Expected Output** | - WillConfig record with:<br>&nbsp;&nbsp;- Unique will_id generated from owner + nonce<br>&nbsp;&nbsp;- is_active: true<br>&nbsp;&nbsp;- total_shares_bps: 0u16<br>&nbsp;&nbsp;- num_beneficiaries: 0u8<br>- Public mappings initialized |
| **Expected State Changes** | - will_status[will_id] = 1 (ACTIVE)<br>- last_checkin[will_id] = current block height<br>- checkin_periods[will_id] = 8640<br>- grace_periods[will_id] = 4320<br>- owner_hash[will_id] = hash(owner) |
| **Status** | ✅ Ready to Test |
| **Priority** | Critical |
| **Notes** | This is the foundation test - all other tests depend on this |

### TC-002: Create Will with Minimum Check-in Period

| Field | Value |
|-------|-------|
| **Test ID** | TC-002 |
| **Description** | Create will with minimum allowed check-in period (1 day) |
| **Transition** | `create_will` |
| **Input** | nonce: 111field, check_in_period: 4320u64 (MIN), grace_period: 4320u64 |
| **Expected Output** | WillConfig record created successfully |
| **Expected Behavior** | Should pass validation (check_in_period >= MIN_CHECKIN_PERIOD) |
| **Status** | ⏸️ Pending |

### TC-003: Create Will with Maximum Check-in Period

| Field | Value |
|-------|-------|
| **Test ID** | TC-003 |
| **Description** | Create will with maximum allowed check-in period (1 year) |
| **Transition** | `create_will` |
| **Input** | nonce: 222field, check_in_period: 1576800u64 (MAX), grace_period: 4320u64 |
| **Expected Output** | WillConfig record created successfully |
| **Expected Behavior** | Should pass validation (check_in_period <= MAX_CHECKIN_PERIOD) |
| **Status** | ⏸️ Pending |

### TC-004: Create Will with Too Short Check-in Period (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-004 |
| **Description** | Attempt to create will with check-in period below minimum |
| **Transition** | `create_will` |
| **Input** | nonce: 333field, check_in_period: 100u64, grace_period: 4320u64 |
| **Expected Output** | Transaction fails with assertion error |
| **Expected Behavior** | Should fail assertion: check_in_period >= MIN_CHECKIN_PERIOD |
| **Status** | ⏸️ Pending |

### TC-005: Create Will with Duplicate Nonce (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-005 |
| **Description** | Attempt to create will with same nonce twice from same owner |
| **Transition** | `create_will` |
| **Input** | Same nonce used in TC-001 |
| **Expected Output** | Transaction fails in finalize |
| **Expected Behavior** | Should fail: will_id collision detected |
| **Status** | ⏸️ Pending |

---

## 2. Check-In Operations

### TC-101: Standard Check-In with Valid Config

| Field | Value |
|-------|-------|
| **Test ID** | TC-101 |
| **Description** | Owner performs regular check-in with valid WillConfig record |
| **Transition** | `check_in` |
| **Input File** | `check_in.in` |
| **Preconditions** | Valid WillConfig record from create_will |
| **Input Parameters** | config: WillConfig record |
| **Expected Output** | Updated WillConfig record (unchanged structure) |
| **Expected State Changes** | - last_checkin[will_id] = current block height |
| **Status** | ✅ Ready to Test (requires TC-001 output) |
| **Priority** | Critical |
| **Notes** | Must use actual WillConfig record from TC-001 |

### TC-102: Backup Check-In without Config Record

| Field | Value |
|-------|-------|
| **Test ID** | TC-102 |
| **Description** | Owner performs emergency check-in using only will_id |
| **Transition** | `check_in_backup` |
| **Input File** | `check_in_backup.in` |
| **Preconditions** | Will exists, caller is owner |
| **Input Parameters** | will_id: field (public) |
| **Expected Output** | No record output (finalize-only) |
| **Expected State Changes** | - last_checkin[will_id] = current block height |
| **Status** | ✅ Ready to Test |
| **Priority** | High |
| **Notes** | Tests owner verification via hash comparison |

### TC-103: Check-In by Non-Owner (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-103 |
| **Description** | Non-owner attempts to check in |
| **Transition** | `check_in` |
| **Input** | WillConfig record with different owner |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: config.owner == self.caller |
| **Status** | ⏸️ Pending |

### TC-104: Check-In on Inactive Will (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-104 |
| **Description** | Attempt to check in on a deactivated will |
| **Transition** | `check_in` |
| **Input** | WillConfig with is_active: false |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: config.is_active |
| **Status** | ⏸️ Pending |

### TC-105: Backup Check-In with Wrong Owner (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-105 |
| **Description** | Non-owner attempts backup check-in |
| **Transition** | `check_in_backup` |
| **Input** | will_id from different owner |
| **Expected Output** | Transaction fails in finalize |
| **Expected Behavior** | Should fail: hash(caller) != owner_hash[will_id] |
| **Status** | ⏸️ Pending |

---

## 3. Beneficiary Management

### TC-201: Add First Beneficiary (50% Share)

| Field | Value |
|-------|-------|
| **Test ID** | TC-201 |
| **Description** | Add beneficiary with 50% inheritance share |
| **Transition** | `add_beneficiary` |
| **Input File** | `add_beneficiary.in` |
| **Preconditions** | Valid WillConfig with 0 beneficiaries |
| **Input Parameters** | - config: WillConfig<br>- beneficiary_address: aleo1beneficiary1...<br>- share_bps: 5000u16 (50%)<br>- priority: 1u8 |
| **Expected Output** | - Updated WillConfig (total_shares_bps: 5000, num_beneficiaries: 1)<br>- Beneficiary record for beneficiary_address |
| **Expected State Changes** | - beneficiary_commitment[will_id] updated |
| **Status** | ✅ Ready to Test |
| **Priority** | Critical |

### TC-202: Add Second Beneficiary (30% Share)

| Field | Value |
|-------|-------|
| **Test ID** | TC-202 |
| **Description** | Add second beneficiary with 30% share |
| **Transition** | `add_beneficiary` |
| **Input File** | `add_beneficiary_second.in` |
| **Preconditions** | WillConfig with 50% already allocated |
| **Input Parameters** | - beneficiary_address: aleo1beneficiary2...<br>- share_bps: 3000u16 (30%)<br>- priority: 2u8 |
| **Expected Output** | - Updated WillConfig (total_shares_bps: 8000, num_beneficiaries: 2)<br>- Beneficiary record |
| **Status** | ✅ Ready to Test |
| **Priority** | High |

### TC-203: Add Third Beneficiary (20% Share - Complete 100%)

| Field | Value |
|-------|-------|
| **Test ID** | TC-203 |
| **Description** | Add third beneficiary to complete 100% allocation |
| **Transition** | `add_beneficiary` |
| **Preconditions** | WillConfig with 80% allocated |
| **Input** | share_bps: 2000u16 (20%) |
| **Expected Output** | Updated WillConfig with total_shares_bps: 10000u16 (100%) |
| **Status** | ⏸️ Pending |

### TC-204: Add Beneficiary Exceeding 100% (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-204 |
| **Description** | Attempt to add beneficiary that would exceed 100% total |
| **Transition** | `add_beneficiary` |
| **Input** | WillConfig with 9000 bps allocated, new share: 2000u16 |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: new_total <= 10000u16 |
| **Status** | ⏸️ Pending |

### TC-205: Add Zero Share Beneficiary (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-205 |
| **Description** | Attempt to add beneficiary with 0% share |
| **Transition** | `add_beneficiary` |
| **Input** | share_bps: 0u16 |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: share_bps > 0u16 |
| **Status** | ⏸️ Pending |

### TC-206: Add Self as Beneficiary (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-206 |
| **Description** | Owner attempts to add themselves as beneficiary |
| **Transition** | `add_beneficiary` |
| **Input** | beneficiary_address = self.caller |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: beneficiary_address != self.caller |
| **Status** | ⏸️ Pending |

### TC-207: Add 11th Beneficiary (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-207 |
| **Description** | Attempt to exceed MAX_BENEFICIARIES limit |
| **Transition** | `add_beneficiary` |
| **Preconditions** | WillConfig with 10 beneficiaries already |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: num_beneficiaries < MAX_BENEFICIARIES |
| **Status** | ⏸️ Pending |

### TC-208: Revoke Beneficiary

| Field | Value |
|-------|-------|
| **Test ID** | TC-208 |
| **Description** | Owner revokes a beneficiary's inheritance rights |
| **Transition** | `revoke_beneficiary` |
| **Input File** | `revoke_beneficiary.in` |
| **Preconditions** | Valid WillConfig and active Beneficiary record |
| **Input Parameters** | - config: WillConfig<br>- beneficiary_record: Beneficiary |
| **Expected Output** | - Updated WillConfig (reduced shares and count)<br>- Revoked Beneficiary (is_active: false, share_bps: 0) |
| **Status** | ✅ Ready to Test |
| **Priority** | High |

### TC-209: Revoke Already Revoked Beneficiary (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-209 |
| **Description** | Attempt to revoke beneficiary twice |
| **Transition** | `revoke_beneficiary` |
| **Input** | Beneficiary record with is_active: false |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: beneficiary_record.is_active |
| **Status** | ⏸️ Pending |

---

## 4. Asset Management

### TC-301: Deposit 1 ALEO

| Field | Value |
|-------|-------|
| **Test ID** | TC-301 |
| **Description** | Owner deposits 1 ALEO (1,000,000 microcredits) into will |
| **Transition** | `deposit` |
| **Input File** | `deposit.in` |
| **Preconditions** | Valid active WillConfig |
| **Input Parameters** | - config: WillConfig<br>- amount: 1000000u64 |
| **Expected Output** | - WillConfig (unchanged)<br>- LockedCredits record |
| **Expected State Changes** | - total_locked[will_id] += 1000000 |
| **Status** | ✅ Ready to Test |
| **Priority** | Critical |

### TC-302: Deposit Multiple Times

| Field | Value |
|-------|-------|
| **Test ID** | TC-302 |
| **Description** | Deposit assets multiple times to accumulate value |
| **Transition** | `deposit` |
| **Input** | First: 1000000u64, Second: 500000u64 |
| **Expected Output** | Multiple LockedCredits records |
| **Expected State Changes** | - total_locked[will_id] = 1500000 |
| **Status** | ⏸️ Pending |

### TC-303: Deposit Zero Amount (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-303 |
| **Description** | Attempt to deposit 0 credits |
| **Transition** | `deposit` |
| **Input** | amount: 0u64 |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: amount > 0u64 |
| **Status** | ⏸️ Pending |

### TC-304: Deposit on Inactive Will (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-304 |
| **Description** | Attempt to deposit into deactivated will |
| **Transition** | `deposit` |
| **Input** | WillConfig with is_active: false |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: config.is_active |
| **Status** | ⏸️ Pending |

### TC-305: Withdraw 0.5 ALEO

| Field | Value |
|-------|-------|
| **Test ID** | TC-305 |
| **Description** | Owner withdraws portion of locked credits before trigger |
| **Transition** | `withdraw` |
| **Input File** | `withdraw.in` |
| **Preconditions** | LockedCredits exist, will is active |
| **Input Parameters** | - config: WillConfig<br>- locked_credits: LockedCredits (500000u64) |
| **Expected Output** | WillConfig (unchanged) |
| **Expected State Changes** | - total_locked[will_id] -= 500000 |
| **Status** | ✅ Ready to Test |
| **Priority** | Medium |

### TC-306: Withdraw More Than Locked (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-306 |
| **Description** | Attempt to withdraw more than is locked |
| **Transition** | `withdraw` |
| **Input** | LockedCredits amount > total_locked |
| **Expected Output** | Transaction fails in finalize |
| **Expected Behavior** | Should fail assertion: current >= amount |
| **Status** | ⏸️ Pending |

### TC-307: Withdraw After Will Triggered (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-307 |
| **Description** | Owner attempts to withdraw after will is triggered |
| **Transition** | `withdraw` |
| **Preconditions** | will_status = 2 (TRIGGERED) |
| **Expected Output** | Transaction fails in finalize |
| **Expected Behavior** | Should fail assertion: status == 1u8 |
| **Status** | ⏸️ Pending |

### TC-308: Store Secret Message

| Field | Value |
|-------|-------|
| **Test ID** | TC-308 |
| **Description** | Store encrypted secret message for beneficiary |
| **Transition** | `store_secret` |
| **Input File** | `store_secret.in` |
| **Preconditions** | Valid active WillConfig |
| **Input Parameters** | - config: WillConfig<br>- recipient: beneficiary address<br>- data_0 through data_7: field values<br>- nonce: field |
| **Expected Output** | - WillConfig (unchanged)<br>- SecretMessage record |
| **Status** | ✅ Ready to Test |
| **Priority** | Medium |
| **Notes** | 8 fields = ~250 bytes of encrypted data storage |

---

## 5. Will Lifecycle

### TC-401: Update Check-In Period

| Field | Value |
|-------|-------|
| **Test ID** | TC-401 |
| **Description** | Owner updates check-in period from 2 days to 4 days |
| **Transition** | `update_check_in_period` |
| **Input File** | `update_check_in_period.in` |
| **Preconditions** | Valid active WillConfig |
| **Input Parameters** | - config: WillConfig<br>- new_period: 17280u64 (~4 days) |
| **Expected Output** | Updated WillConfig with new check_in_period |
| **Expected State Changes** | - checkin_periods[will_id] = 17280<br>- last_checkin[will_id] = current block (refreshed) |
| **Status** | ✅ Ready to Test |
| **Priority** | Medium |

### TC-402: Update Period Below Minimum (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-402 |
| **Description** | Attempt to set check-in period below minimum |
| **Transition** | `update_check_in_period` |
| **Input** | new_period: 100u64 |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: new_period >= MIN_CHECKIN_PERIOD |
| **Status** | ⏸️ Pending |

### TC-403: Update Period Above Maximum (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-403 |
| **Description** | Attempt to set check-in period above maximum |
| **Transition** | `update_check_in_period` |
| **Input** | new_period: 9999999u64 |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: new_period <= MAX_CHECKIN_PERIOD |
| **Status** | ⏸️ Pending |

### TC-404: Deactivate Will

| Field | Value |
|-------|-------|
| **Test ID** | TC-404 |
| **Description** | Owner deactivates will temporarily |
| **Transition** | `deactivate_will` |
| **Input File** | `deactivate_will.in` |
| **Preconditions** | Active WillConfig |
| **Input Parameters** | config: WillConfig |
| **Expected Output** | WillConfig with is_active: false |
| **Expected State Changes** | - will_status[will_id] = 0 (INACTIVE) |
| **Status** | ✅ Ready to Test |
| **Priority** | Medium |

### TC-405: Deactivate Already Inactive Will (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-405 |
| **Description** | Attempt to deactivate already inactive will |
| **Transition** | `deactivate_will` |
| **Input** | WillConfig with is_active: false |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: config.is_active |
| **Status** | ⏸️ Pending |

### TC-406: Reactivate Will

| Field | Value |
|-------|-------|
| **Test ID** | TC-406 |
| **Description** | Owner reactivates previously deactivated will |
| **Transition** | `reactivate_will` |
| **Input File** | `reactivate_will.in` |
| **Preconditions** | Deactivated WillConfig (TC-404) |
| **Input Parameters** | config: WillConfig (is_active: false) |
| **Expected Output** | WillConfig with is_active: true |
| **Expected State Changes** | - will_status[will_id] = 1 (ACTIVE)<br>- last_checkin[will_id] = current block |
| **Status** | ✅ Ready to Test |
| **Priority** | Medium |

### TC-407: Reactivate Already Active Will (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-407 |
| **Description** | Attempt to reactivate already active will |
| **Transition** | `reactivate_will` |
| **Input** | WillConfig with is_active: true |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: !config.is_active |
| **Status** | ⏸️ Pending |

---

## 6. Will Triggering & Claims

### TC-501: Trigger Will After Deadline

| Field | Value |
|-------|-------|
| **Test ID** | TC-501 |
| **Description** | Anyone triggers will after check-in deadline + grace period passes |
| **Transition** | `trigger_will` |
| **Input File** | `trigger_will.in` |
| **Preconditions** | - Will is active<br>- block.height > (last_checkin + period + grace) |
| **Input Parameters** | will_id: field (public) |
| **Expected Output** | TriggerBounty record for caller |
| **Expected State Changes** | - will_status[will_id] = 2 (TRIGGERED)<br>- total_locked reduced by bounty (0.1%) |
| **Status** | ⚠️ Requires Time or Block Manipulation |
| **Priority** | Critical |
| **Notes** | In test env, may need to manipulate block height |

### TC-502: Trigger Will Before Deadline (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-502 |
| **Description** | Attempt to trigger will before deadline |
| **Transition** | `trigger_will` |
| **Preconditions** | block.height <= (last_checkin + period + grace) |
| **Expected Output** | Transaction fails in finalize |
| **Expected Behavior** | Should fail assertion: block.height > deadline |
| **Status** | ⏸️ Pending |

### TC-503: Trigger Already Triggered Will (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-503 |
| **Description** | Attempt to trigger will twice |
| **Transition** | `trigger_will` |
| **Preconditions** | will_status = 2 |
| **Expected Output** | Transaction fails in finalize |
| **Expected Behavior** | Should fail assertion: status == 1u8 |
| **Status** | ⏸️ Pending |

### TC-504: Beneficiary Claims 50% Inheritance

| Field | Value |
|-------|-------|
| **Test ID** | TC-504 |
| **Description** | First beneficiary claims their 50% share after trigger |
| **Transition** | `claim_inheritance` |
| **Input File** | `claim_inheritance.in` |
| **Preconditions** | - Will is triggered (status = 2)<br>- Valid Beneficiary record<br>- Valid LockedCredits |
| **Input Parameters** | - beneficiary_record: Beneficiary (50% share)<br>- locked_credits: LockedCredits |
| **Expected Output** | - ClaimableShare record (amount = 50% of locked)<br>- InheritanceClaim proof record |
| **Expected State Changes** | - total_claimed[will_id] += share_amount |
| **Status** | ⚠️ Requires TC-501 |
| **Priority** | Critical |

### TC-505: Beneficiary Claims 30% Inheritance

| Field | Value |
|-------|-------|
| **Test ID** | TC-505 |
| **Description** | Second beneficiary claims their 30% share |
| **Transition** | `claim_inheritance` |
| **Preconditions** | Will triggered, 50% already claimed |
| **Input** | Beneficiary record with 30% share |
| **Expected Output** | ClaimableShare and InheritanceClaim records |
| **Expected State Changes** | - total_claimed[will_id] += share_amount (now 80% total) |
| **Status** | ⏸️ Pending |

### TC-506: Final Beneficiary Claim Marks Will Complete

| Field | Value |
|-------|-------|
| **Test ID** | TC-506 |
| **Description** | Last beneficiary claims remaining 20%, completing distribution |
| **Transition** | `claim_inheritance` |
| **Preconditions** | 80% already claimed |
| **Expected Output** | ClaimableShare and InheritanceClaim records |
| **Expected State Changes** | - total_claimed[will_id] = 100% of total_locked<br>- will_status[will_id] = 3 (CLAIMED) |
| **Status** | ⏸️ Pending |

### TC-507: Claim Before Trigger (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-507 |
| **Description** | Beneficiary attempts to claim before will is triggered |
| **Transition** | `claim_inheritance` |
| **Preconditions** | will_status = 1 (ACTIVE) |
| **Expected Output** | Transaction fails in finalize |
| **Expected Behavior** | Should fail assertion: status == 2u8 |
| **Status** | ⏸️ Pending |

### TC-508: Revoked Beneficiary Claims (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-508 |
| **Description** | Revoked beneficiary attempts to claim |
| **Transition** | `claim_inheritance` |
| **Input** | Beneficiary record with is_active: false |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: beneficiary_record.is_active |
| **Status** | ⏸️ Pending |

### TC-509: Wrong Beneficiary Claims (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-509 |
| **Description** | Person who is not the beneficiary attempts to claim |
| **Transition** | `claim_inheritance` |
| **Input** | Beneficiary record where owner != self.caller |
| **Expected Output** | Transaction fails |
| **Expected Behavior** | Should fail assertion: beneficiary_record.owner == self.caller |
| **Status** | ⏸️ Pending |

---

## 7. Emergency & Recovery

### TC-601: Emergency Recovery with 0% Claimed

| Field | Value |
|-------|-------|
| **Test ID** | TC-601 |
| **Description** | Owner recovers all assets immediately after trigger (no claims yet) |
| **Transition** | `emergency_recovery` |
| **Input File** | `emergency_recovery.in` |
| **Preconditions** | - Will triggered (status = 2)<br>- No beneficiary claims yet (0% claimed) |
| **Input Parameters** | - config: WillConfig<br>- locked_credits: LockedCredits |
| **Expected Output** | - Reactivated WillConfig (is_active: true)<br>- Recovered LockedCredits |
| **Expected State Changes** | - will_status[will_id] = 1 (ACTIVE)<br>- last_checkin[will_id] = current block |
| **Status** | ⚠️ Requires TC-501 |
| **Priority** | High |

### TC-602: Emergency Recovery with 25% Claimed

| Field | Value |
|-------|-------|
| **Test ID** | TC-602 |
| **Description** | Owner recovers when less than 50% claimed |
| **Transition** | `emergency_recovery` |
| **Preconditions** | - Will triggered<br>- 25% of assets claimed |
| **Expected Output** | Successful recovery |
| **Expected Behavior** | Should pass: claimed < total / 2 |
| **Status** | ⏸️ Pending |

### TC-603: Emergency Recovery with 49% Claimed

| Field | Value |
|-------|-------|
| **Test ID** | TC-603 |
| **Description** | Owner recovers at edge case (just under 50%) |
| **Transition** | `emergency_recovery` |
| **Preconditions** | 49% claimed |
| **Expected Output** | Successful recovery |
| **Expected Behavior** | Should pass: claimed < total / 2 |
| **Status** | ⏸️ Pending |

### TC-604: Emergency Recovery with 50% Claimed (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-604 |
| **Description** | Owner attempts recovery when 50% or more claimed |
| **Transition** | `emergency_recovery` |
| **Preconditions** | 50% or more claimed |
| **Expected Output** | Transaction fails in finalize |
| **Expected Behavior** | Should fail assertion: claimed < total / 2 |
| **Status** | ⏸️ Pending |

### TC-605: Emergency Recovery from Active Will

| Field | Value |
|-------|-------|
| **Test ID** | TC-605 |
| **Description** | Owner recovers credits from active will (not triggered) |
| **Transition** | `emergency_recovery` |
| **Preconditions** | will_status = 1 (ACTIVE) |
| **Expected Output** | Successful recovery |
| **Expected Behavior** | Should pass: status == 1 or status == 2 |
| **Status** | ⏸️ Pending |

### TC-606: Emergency Recovery from Fully Claimed Will (Negative Test)

| Field | Value |
|-------|-------|
| **Test ID** | TC-606 |
| **Description** | Owner attempts recovery after 100% claimed |
| **Transition** | `emergency_recovery` |
| **Preconditions** | will_status = 3 (CLAIMED) |
| **Expected Output** | Transaction fails in finalize |
| **Expected Behavior** | Should fail assertion: status == 1 or status == 2 |
| **Status** | ⏸️ Pending |

---

## 8. Edge Cases & Validation

### TC-701: Create Multiple Wills Same Owner

| Field | Value |
|-------|-------|
| **Test ID** | TC-701 |
| **Description** | Owner creates multiple wills with different nonces |
| **Transition** | `create_will` |
| **Input** | Different nonces: 111field, 222field, 333field |
| **Expected Output** | Multiple distinct WillConfig records with unique will_ids |
| **Status** | ⏸️ Pending |
| **Notes** | Tests that one person can have multiple wills |

### TC-702: Beneficiary in Multiple Wills

| Field | Value |
|-------|-------|
| **Test ID** | TC-702 |
| **Description** | Same address is beneficiary in multiple wills |
| **Transition** | `add_beneficiary` |
| **Expected Output** | Multiple Beneficiary records for same address |
| **Status** | ⏸️ Pending |
| **Notes** | Tests that beneficiaries can inherit from multiple people |

### TC-703: Zero Grace Period

| Field | Value |
|-------|-------|
| **Test ID** | TC-703 |
| **Description** | Create will with 0 grace period (if allowed) |
| **Transition** | `create_will` |
| **Input** | grace_period: 0u64 |
| **Expected Output** | Depends on validation - currently no explicit check |
| **Status** | ⏸️ Pending |
| **Notes** | Code only validates grace >= MIN for check_in_period |

### TC-704: Maximum Value Deposit

| Field | Value |
|-------|-------|
| **Test ID** | TC-704 |
| **Description** | Deposit maximum u64 value |
| **Transition** | `deposit` |
| **Input** | amount: 18446744073709551615u64 (u64::MAX) |
| **Expected Output** | LockedCredits record created |
| **Status** | ⏸️ Pending |
| **Notes** | Tests overflow handling |

### TC-705: Bounty Calculation Accuracy

| Field | Value |
|-------|-------|
| **Test ID** | TC-705 |
| **Description** | Verify 0.1% bounty calculated correctly |
| **Transition** | `trigger_will` |
| **Preconditions** | total_locked = 1000000u64 (1 ALEO) |
| **Expected Output** | bounty = 1000u64 (0.001 ALEO) |
| **Expected State Changes** | total_locked reduced to 999000u64 |
| **Status** | ⏸️ Pending |

### TC-706: Share Calculation Accuracy

| Field | Value |
|-------|-------|
| **Test ID** | TC-706 |
| **Description** | Verify share percentage calculations |
| **Preconditions** | locked_credits.amount = 1000000u64, share_bps = 3333u16 (33.33%) |
| **Expected Output** | share_amount = 333300u64 |
| **Status** | ⏸️ Pending |
| **Notes** | Tests basis points math: (amount * bps) / 10000 |

### TC-707: Verification Hash Integrity

| Field | Value |
|-------|-------|
| **Test ID** | TC-707 |
| **Description** | Verify beneficiary verification hash generation |
| **Transition** | `add_beneficiary` |
| **Expected Output** | Beneficiary.verification_hash is deterministic |
| **Status** | ⏸️ Pending |
| **Notes** | Hash should be: BHP256::commit(hash(beneficiary) + hash(owner), nonce) |

### TC-708: Will ID Uniqueness

| Field | Value |
|-------|-------|
| **Test ID** | TC-708 |
| **Description** | Verify will_id is unique across different owners |
| **Preconditions** | Two different owners use same nonce |
| **Expected Output** | Different will_ids generated |
| **Status** | ⏸️ Pending |
| **Notes** | will_id = hash(hash(owner) + nonce) |

### TC-709: Record Ownership Verification

| Field | Value |
|-------|-------|
| **Test ID** | TC-709 |
| **Description** | Ensure records can only be used by their owners |
| **Status** | ⏸️ Pending |
| **Notes** | Intrinsic to Leo - records are private to owners |

### TC-710: Concurrent Claims by Multiple Beneficiaries

| Field | Value |
|-------|-------|
| **Test ID** | TC-710 |
| **Description** | Multiple beneficiaries claim simultaneously |
| **Expected Behavior** | All succeed if valid, total_claimed accumulates correctly |
| **Status** | ⏸️ Pending |
| **Notes** | Tests mapping state consistency |

---

## Test Execution Order

### Phase 1: Foundation Tests (Required First)
1. TC-001 - Create Will
2. TC-101 - Check In (Standard)
3. TC-102 - Check In (Backup)

### Phase 2: Configuration Tests
4. TC-201 - Add First Beneficiary
5. TC-202 - Add Second Beneficiary
6. TC-401 - Update Check-in Period
7. TC-404 - Deactivate Will
8. TC-406 - Reactivate Will

### Phase 3: Asset Tests
9. TC-301 - Deposit Assets
10. TC-308 - Store Secret
11. TC-305 - Withdraw Assets

### Phase 4: Trigger & Claim Tests (Time-Dependent)
12. TC-501 - Trigger Will (requires deadline passage)
13. TC-504 - Claim Inheritance (beneficiary 1)
14. TC-505 - Claim Inheritance (beneficiary 2)

### Phase 5: Recovery Tests
15. TC-601 - Emergency Recovery

### Phase 6: Negative Tests
16. All negative test cases (TC-xxx with "Negative Test" label)

### Phase 7: Edge Cases
17. All edge case tests (TC-7xx series)

---

## Test Data Requirements

### Test Addresses
```leo
// Owner Address
aleo1testowner00000000000000000000000000000000000000000000000

// Beneficiary 1 (50% share, priority 1)
aleo1beneficiary1000000000000000000000000000000000000000000000

// Beneficiary 2 (30% share, priority 2)
aleo1beneficiary2000000000000000000000000000000000000000000000

// Beneficiary 3 (20% share, priority 3)
aleo1beneficiary3000000000000000000000000000000000000000000000

// Trigger Caller (anyone)
aleo1triggercaller000000000000000000000000000000000000000000000
```

### Test Amounts
```leo
1 ALEO = 1000000u64 microcredits
0.5 ALEO = 500000u64 microcredits
0.1 ALEO = 100000u64 microcredits
0.001 ALEO = 1000u64 microcredits (typical bounty)
```

### Share Percentages (Basis Points)
```leo
100% = 10000u16
50% = 5000u16
33.33% = 3333u16
30% = 3000u16
20% = 2000u16
10% = 1000u16
1% = 100u16
0.1% = 10u16
```

### Time Periods (in blocks, assuming ~20s/block)
```leo
1 hour = 180 blocks
1 day = 4320 blocks (MIN_CHECKIN_PERIOD)
2 days = 8640 blocks
4 days = 17280 blocks
1 week = 30240 blocks
1 month = 129600 blocks
1 year = 1576800 blocks (MAX_CHECKIN_PERIOD)
```

---

## Test Environment Setup

### Prerequisites
1. Leo CLI installed and configured
2. Aleo development account with test credits
3. Contract built successfully: `leo build`

### Directory Structure
```
/Users/amansingh/digitalwill/
├── contracts/digital_will/
│   ├── src/main.leo
│   ├── inputs/
│   │   ├── create_will.in
│   │   ├── check_in.in
│   │   ├── add_beneficiary.in
│   │   └── ... (all test input files)
│   └── outputs/ (test results)
├── scripts/
│   └── test-local.sh
├── tests/
│   └── TEST_CASES.md (this file)
└── logs/
    └── test_run_*.log
```

### Running Tests

#### Run All Tests
```bash
cd /Users/amansingh/digitalwill
./scripts/test-local.sh
```

#### Run Individual Test
```bash
cd /Users/amansingh/digitalwill/contracts/digital_will
leo run <transition_name> --file inputs/<input_file>.in
```

#### Example: Test Create Will
```bash
cd /Users/amansingh/digitalwill/contracts/digital_will
leo run create_will --file inputs/create_will.in
```

---

## Test Status Legend

| Symbol | Status | Description |
|--------|--------|-------------|
| ✅ | Ready to Test | Input file created, can be executed |
| ⏸️ | Pending | Test case defined but input needs customization |
| ⚠️ | Blocked | Requires completion of prerequisite tests or special setup |
| ✔️ | Passed | Test executed successfully with expected results |
| ❌ | Failed | Test executed but failed |
| 🚧 | In Progress | Currently being tested |
| ⏭️ | Skipped | Intentionally not run in current test cycle |

---

## Notes & Recommendations

### Important Testing Considerations

1. **Record-Based Testing**: Most tests require using actual output records from previous transitions. The input files contain placeholder values that must be replaced.

2. **Time-Dependent Tests**: Tests involving `trigger_will` require simulating the passage of time (check-in period + grace period). In a local test environment, you may need to:
   - Use a test network with controlled block production
   - Manually advance block height
   - Use a test harness that can simulate time

3. **Multiple Account Testing**: Tests involving beneficiaries claiming inheritance should ideally be run with different Aleo accounts to properly test ownership and permissions.

4. **State Persistence**: Some tests build on previous state. Consider using snapshotting or state tracking to manage test dependencies.

5. **Negative Tests**: These are critical for ensuring the contract enforces security and validation rules. Don't skip them.

### Manual Testing Workflow

For tests requiring actual records:

1. Run `create_will` and save the output WillConfig
2. Copy the WillConfig output to subsequent input files
3. Run `add_beneficiary` and save both updated WillConfig and Beneficiary records
4. Continue chaining tests, updating input files with actual outputs
5. Document actual values used in each test run

### Automated Testing Considerations

To fully automate these tests, you would need:
- Leo SDK or API integration for programmatic transaction execution
- State management system to track record outputs
- Block height manipulation for time-dependent tests
- Multiple test accounts configured
- Assertion framework for validating outputs and state changes

---

## Test Results Tracking

| Test ID | Date Executed | Status | Notes | Executor |
|---------|---------------|--------|-------|----------|
| TC-001 | - | ⏸️ | Awaiting execution | - |
| TC-101 | - | ⏸️ | Needs TC-001 output | - |
| TC-102 | - | ⏸️ | Needs TC-001 output | - |
| TC-201 | - | ⏸️ | Needs TC-001 output | - |
| ... | - | ⏸️ | - | - |

---

## Known Issues & Limitations

1. **Grace Period Validation**: The contract validates `grace_period >= MIN_CHECKIN_PERIOD` only implicitly through the check-in period validation. A grace period of 0 might be allowed.

2. **Beneficiary Commitment**: The current implementation accumulates commitments by addition. This may need testing for collision scenarios.

3. **Credits Integration**: The contract includes placeholder comments for `credits.aleo` integration. Full testing will require that integration.

4. **Bounty Distribution**: The trigger bounty is calculated but the TriggerBounty record doesn't contain the calculated amount in its creation (set to 0u64). This may be by design for finalize calculation.

---

## Future Test Enhancements

1. **Integration Tests**: Test interaction with credits.aleo program
2. **Load Tests**: Test with maximum beneficiaries, large amounts, many concurrent operations
3. **Security Tests**: Attempt various attack vectors (reentrancy, overflow, etc.)
4. **Gas Optimization Tests**: Measure and optimize transaction costs
5. **Cross-Contract Tests**: Test interaction with other programs if applicable
6. **Upgrade Tests**: Test contract upgrade scenarios

---

**Document Version:** 1.0
**Last Updated:** 2026-01-21
**Maintained By:** Digital Will Test Team
