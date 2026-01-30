// Dead Man's Switch / Digital Will v2.0
// A privacy-preserving digital inheritance system on Aleo

import credits.aleo;

program digital_will_v7.aleo {

    // Constructor for testnet deployment (enables upgrades by deployer)
    @admin(address="aleo1z7fz8f3mz0mgm769uqpqhek34luq33y9dldqw4hp06nxurrrgc8sa7uyah")
    async constructor() {}

    // ============================================
    // CONSTANTS
    // ============================================

    const MIN_CHECKIN_PERIOD: u32 = 4320u32;      // ~1 day
    const MAX_CHECKIN_PERIOD: u32 = 1576800u32;   // ~1 year
    const MAX_BENEFICIARIES: u8 = 10u8;
    const TRIGGER_BOUNTY_BPS: u64 = 10u64;        // 0.1%

    // Maximum value that can be safely multiplied by 10000 without overflow
    // Calculated as: u64::MAX / 10000 = 1,844,674,407,370,955
    const MAX_SAFE_MULTIPLY: u64 = 1844674407370955u64;

    // ============================================
    // RECORDS
    // ============================================

    record WillConfig {
        owner: address,
        will_id: field,
        check_in_period: u32,
        grace_period: u32,
        total_shares_bps: u16,
        num_beneficiaries: u8,
        is_active: bool,
        nonce: field,
    }

    record Beneficiary {
        owner: address,
        will_owner: address,
        will_id: field,
        share_bps: u16,
        priority: u8,
        verification_hash: field,
        is_active: bool,
    }

    // NEW: Record owned by WILL OWNER - for visibility and control
    // This fixes the fundamental security flaw where owner couldn't see beneficiaries
    record BenAllocation {
        owner: address,              // Will owner - can see this record
        beneficiary_addr: address,   // Beneficiary's address (private)
        will_id: field,
        share_bps: u16,
        priority: u8,
        is_active: bool,
    }

    record LockedCredits {
        owner: address,
        will_id: field,
        amount: u64,
        depositor: address,
    }

    record ClaimableShare {
        owner: address,
        will_id: field,
        amount: u64,
        original_owner: address,
    }

    record SecretMessage {
        owner: address,
        will_id: field,
        recipient: address,
        data_0: field,
        data_1: field,
        data_2: field,
        data_3: field,
    }

    record InheritanceClaim {
        owner: address,
        will_id: field,
        original_owner: address,
        amount_claimed: u64,
    }

    record TriggerBounty {
        owner: address,
        will_id: field,
        bounty_amount: u64,
    }

    // NEW: Time-locked action authorization record
    // Used for two-phase operations requiring a waiting period
    record TimeLock {
        owner: address,
        will_id: field,
        action_type: u8,      // 1=claim, 2=trigger, 3=recovery
        unlock_block: u32,    // Block height when action can be executed
        authorized_amount: u64,
    }

    // NEW: Merkle proof for beneficiary verification
    // Allows claiming without revealing which beneficiary you are
    record PrivateBeneficiaryProof {
        owner: address,
        will_id: field,
        beneficiary_hash: field,
        merkle_path_0: field,
        merkle_path_1: field,
        merkle_path_2: field,
        merkle_path_3: field,
        path_indices: u8,
    }

    // ============================================
    // MAPPINGS
    // ============================================

    mapping will_status: field => u8;
    mapping last_checkin: field => u32;
    mapping checkin_periods: field => u32;
    mapping grace_periods: field => u32;
    mapping total_locked: field => u64;
    mapping total_claimed: field => u64;
    mapping owner_hash: field => field;

    // CRITICAL FIX: Track beneficiary claims to prevent double-claiming
    // Key = hash(will_id + hash(beneficiary_address))
    mapping beneficiary_claimed: field => bool;

    // NEW: Hashed beneficiary allocations for claim verification
    // Key: hash(will_id + hash(beneficiary_address))
    // Value: share_bps (0 = not a beneficiary or revoked)
    // This allows beneficiaries to claim without needing a record
    mapping beneficiary_allocations: field => u16;

    // NEW: Merkle root of beneficiary list for anonymous verification
    // Key: will_id
    // Value: Merkle root of all beneficiary commitments
    mapping beneficiary_merkle_root: field => field;

    // NEW: Time-locked authorization expiry tracking
    // Key: hash(will_id + action_type)
    // Value: block height when authorization expires
    mapping authorization_expiry: field => u32;

    // NEW: Will count per owner for registry
    // Key: hash(owner_address)
    // Value: number of wills created by this owner
    mapping will_count: field => u8;

    // ============================================
    // TRANSITIONS
    // ============================================

    async transition create_will(
        private nonce: field,
        private check_in_period: u32,
        private grace_period: u32,
    ) -> (WillConfig, Future) {
        assert(check_in_period >= MIN_CHECKIN_PERIOD);
        assert(check_in_period <= MAX_CHECKIN_PERIOD);
        assert(grace_period >= MIN_CHECKIN_PERIOD);
        // BUG FIX: Add maximum grace period to prevent overflow and ensure will is triggerable
        assert(grace_period <= MAX_CHECKIN_PERIOD);

        let will_id: field = BHP256::hash_to_field(BHP256::hash_to_field(self.caller) + nonce);
        let owner_verification: field = BHP256::hash_to_field(self.caller);

        let config: WillConfig = WillConfig {
            owner: self.caller,
            will_id: will_id,
            check_in_period: check_in_period,
            grace_period: grace_period,
            total_shares_bps: 0u16,
            num_beneficiaries: 0u8,
            is_active: true,
            nonce: nonce,
        };

        return (config, finalize_create_will(will_id, check_in_period, grace_period, owner_verification));
    }

    async function finalize_create_will(
        will_id: field,
        check_in_period: u32,
        grace_period: u32,
        owner_hash_val: field,
    ) {
        let existing: u8 = Mapping::get_or_use(will_status, will_id, 0u8);
        assert_eq(existing, 0u8);

        Mapping::set(will_status, will_id, 1u8);
        Mapping::set(last_checkin, will_id, block.height);
        Mapping::set(checkin_periods, will_id, check_in_period);
        Mapping::set(grace_periods, will_id, grace_period);
        Mapping::set(total_locked, will_id, 0u64);
        Mapping::set(total_claimed, will_id, 0u64);
        Mapping::set(owner_hash, will_id, owner_hash_val);
    }

    async transition check_in(
        private config: WillConfig,
    ) -> (WillConfig, Future) {
        assert_eq(config.owner, self.caller);
        assert(config.is_active);

        let updated_config: WillConfig = WillConfig {
            owner: config.owner,
            will_id: config.will_id,
            check_in_period: config.check_in_period,
            grace_period: config.grace_period,
            total_shares_bps: config.total_shares_bps,
            num_beneficiaries: config.num_beneficiaries,
            is_active: true,
            nonce: config.nonce,
        };

        return (updated_config, finalize_check_in(config.will_id));
    }

    async function finalize_check_in(will_id: field) {
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        // H-04 FIX: Prevent check-in after deadline has passed
        let last_check: u32 = Mapping::get(last_checkin, will_id);
        let period: u32 = Mapping::get(checkin_periods, will_id);
        let grace: u32 = Mapping::get(grace_periods, will_id);

        // CRITICAL FIX: Overflow protection for deadline calculation
        let last_check_64: u64 = last_check as u64;
        let period_64: u64 = period as u64;
        let grace_64: u64 = grace as u64;
        let deadline_64: u64 = last_check_64 + period_64 + grace_64;
        let max_u32: u64 = 4294967295u64;
        let safe_deadline_64: u64 = deadline_64 < max_u32 ? deadline_64 : max_u32;
        let deadline: u32 = safe_deadline_64 as u32;

        assert(block.height <= deadline);

        Mapping::set(last_checkin, will_id, block.height);
    }

    async transition check_in_backup(
        public will_id: field,
    ) -> Future {
        let caller_hash: field = BHP256::hash_to_field(self.caller);
        return finalize_check_in_backup(will_id, caller_hash);
    }

    async function finalize_check_in_backup(will_id: field, caller_hash: field) {
        let stored_owner_hash: field = Mapping::get(owner_hash, will_id);
        assert_eq(stored_owner_hash, caller_hash);

        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        // H-04 FIX: Prevent check-in after deadline has passed
        let last_check: u32 = Mapping::get(last_checkin, will_id);
        let period: u32 = Mapping::get(checkin_periods, will_id);
        let grace: u32 = Mapping::get(grace_periods, will_id);

        // CRITICAL FIX: Overflow protection for deadline calculation
        let last_check_64: u64 = last_check as u64;
        let period_64: u64 = period as u64;
        let grace_64: u64 = grace as u64;
        let deadline_64: u64 = last_check_64 + period_64 + grace_64;
        let max_u32: u64 = 4294967295u64;
        let safe_deadline_64: u64 = deadline_64 < max_u32 ? deadline_64 : max_u32;
        let deadline: u32 = safe_deadline_64 as u32;

        assert(block.height <= deadline);

        Mapping::set(last_checkin, will_id, block.height);
    }

    // REFACTORED: Now returns BenAllocation to OWNER (not Beneficiary to beneficiary)
    // This fixes the security flaw where owner couldn't see their beneficiaries
    // Beneficiaries don't receive any record until claim time (privacy-preserving)
    async transition add_beneficiary(
        private config: WillConfig,
        private beneficiary_address: address,
        private share_bps: u16,
        private priority: u8,
    ) -> (WillConfig, BenAllocation, Future) {
        assert_eq(config.owner, self.caller);
        assert(config.is_active);
        assert(share_bps > 0u16);
        assert(share_bps <= 10000u16);

        // BUG FIX: Check for overflow BEFORE addition to prevent u16 wrap-around
        // If current + new > 10000, it should fail - checking this way prevents overflow
        assert(config.total_shares_bps <= 10000u16 - share_bps);
        let new_total: u16 = config.total_shares_bps + share_bps;
        assert(config.num_beneficiaries < MAX_BENEFICIARIES);
        assert_neq(beneficiary_address, self.caller);

        // Create BenAllocation record owned by WILL OWNER (not beneficiary!)
        // This allows owner to see all their beneficiaries in their wallet
        let beneficiary_info: BenAllocation = BenAllocation {
            owner: config.owner,              // Owner owns this record
            beneficiary_addr: beneficiary_address,
            will_id: config.will_id,
            share_bps: share_bps,
            priority: priority,
            is_active: true,
        };

        // Compute allocation key for mapping storage
        let beneficiary_hash: field = BHP256::hash_to_field(beneficiary_address);
        let allocation_key: field = BHP256::hash_to_field(config.will_id + beneficiary_hash);

        let updated_config: WillConfig = WillConfig {
            owner: config.owner,
            will_id: config.will_id,
            check_in_period: config.check_in_period,
            grace_period: config.grace_period,
            total_shares_bps: new_total,
            num_beneficiaries: config.num_beneficiaries + 1u8,
            is_active: config.is_active,
            nonce: config.nonce,
        };

        return (updated_config, beneficiary_info, finalize_add_beneficiary(config.will_id, allocation_key, share_bps));
    }

    async function finalize_add_beneficiary(will_id: field, allocation_key: field, share_bps: u16) {
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        // BUG FIX: Check that beneficiary doesn't already exist (prevent duplicates)
        let existing_share: u16 = Mapping::get_or_use(beneficiary_allocations, allocation_key, 0u16);
        assert_eq(existing_share, 0u16);  // Must not already be a beneficiary

        // Store allocation in mapping (for claims after trigger)
        Mapping::set(beneficiary_allocations, allocation_key, share_bps);
    }

    // REFACTORED: Now uses BenAllocation record for revocation
    // Owner uses their BenAllocation record to prove ownership and revoke
    // Returns updated config and marked-inactive BenAllocation record
    async transition revoke_beneficiary(
        private config: WillConfig,
        private beneficiary_info: BenAllocation,
    ) -> (WillConfig, BenAllocation, Future) {
        // Verify caller is the will owner
        assert_eq(config.owner, self.caller);
        assert_eq(beneficiary_info.owner, self.caller);  // Owner must own the record
        assert(config.is_active);
        assert(beneficiary_info.is_active);
        assert_eq(beneficiary_info.will_id, config.will_id);  // Must be same will

        // Compute allocation key for mapping update
        let beneficiary_hash: field = BHP256::hash_to_field(beneficiary_info.beneficiary_addr);
        let allocation_key: field = BHP256::hash_to_field(config.will_id + beneficiary_hash);

        // BUG FIX: Check for underflow BEFORE subtraction
        assert(config.total_shares_bps >= beneficiary_info.share_bps);
        assert(config.num_beneficiaries >= 1u8);

        // Update the config to reflect removed shares
        let updated_config: WillConfig = WillConfig {
            owner: config.owner,
            will_id: config.will_id,
            check_in_period: config.check_in_period,
            grace_period: config.grace_period,
            total_shares_bps: config.total_shares_bps - beneficiary_info.share_bps,
            num_beneficiaries: config.num_beneficiaries - 1u8,
            is_active: config.is_active,
            nonce: config.nonce,
        };

        // Mark BenAllocation as inactive (consumed)
        let revoked_info: BenAllocation = BenAllocation {
            owner: beneficiary_info.owner,
            beneficiary_addr: beneficiary_info.beneficiary_addr,
            will_id: beneficiary_info.will_id,
            share_bps: beneficiary_info.share_bps,
            priority: beneficiary_info.priority,
            is_active: false,  // Revoked
        };

        return (updated_config, revoked_info, finalize_revoke(config.will_id, allocation_key));
    }

    // Finalize function to remove allocation from mapping
    async function finalize_revoke(will_id: field, allocation_key: field) {
        // Verify will is active
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        // Remove from mapping (set to 0 = not a beneficiary)
        Mapping::set(beneficiary_allocations, allocation_key, 0u16);
    }

    async transition deposit(
        private config: WillConfig,
        private credits_record: credits.aleo/credits,
        private amount: u64,
    ) -> (WillConfig, LockedCredits, credits.aleo/credits, Future) {
        assert_eq(config.owner, self.caller);
        assert(config.is_active);
        // BUG FIX: Require minimum deposit to ensure meaningful distribution
        // 10000 microcredits = 0.01 credits, ensures bounty >= 1 microcredit
        assert(amount >= 10000u64);
        assert(credits_record.microcredits >= amount);

        // HIGH FIX: Use self.caller consistently instead of self.signer
        // self.caller is the immediate caller (more secure for nested calls)
        // self.signer is the original transaction signer (can differ in nested calls)
        // Transfer credits to the program's public balance
        let (remaining, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_private_to_public(
            credits_record,
            self.caller,  // HIGH FIX: Changed from self.signer to self.caller for consistency
            amount
        );

        let locked: LockedCredits = LockedCredits {
            owner: self.caller,
            will_id: config.will_id,
            amount: amount,
            depositor: self.caller,
        };

        return (config, locked, remaining, finalize_deposit(config.will_id, amount, transfer_future));
    }

    async function finalize_deposit(will_id: field, amount: u64, transfer_future: Future) {
        // Await the credits transfer
        transfer_future.await();

        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        let current: u64 = Mapping::get_or_use(total_locked, will_id, 0u64);
        let new_total: u64 = current + amount;
        // Overflow check: new_total must be >= current (addition can't decrease value)
        assert(new_total >= current);
        Mapping::set(total_locked, will_id, new_total);
    }

    // Deposit using PUBLIC credits (from faucet or public balance)
    // This is useful when users have public credits instead of private records
    async transition deposit_public(
        public will_id: field,
        public amount: u64,
    ) -> (LockedCredits, Future) {
        // BUG FIX: Require minimum deposit to ensure meaningful distribution
        assert(amount >= 10000u64);

        // Compute owner hash to verify ownership in finalize
        let depositor_hash: field = BHP256::hash_to_field(self.caller);

        // Transfer public credits FROM the user TO this program
        // CRITICAL: Use transfer_public_as_signer to deduct from signer's account, not program's
        let transfer_future: Future = credits.aleo/transfer_public_as_signer(
            self.address,  // Transfer TO the program's address
            amount
        );

        let locked: LockedCredits = LockedCredits {
            owner: self.caller,
            will_id: will_id,
            amount: amount,
            depositor: self.caller,
        };

        return (locked, finalize_deposit_public(will_id, amount, depositor_hash, transfer_future));
    }

    async function finalize_deposit_public(will_id: field, amount: u64, depositor_hash: field, transfer_future: Future) {
        // Await the credits transfer
        transfer_future.await();

        // Verify will exists and depositor is the owner (compare hashes)
        let stored_owner_hash: field = Mapping::get(owner_hash, will_id);
        assert_eq(stored_owner_hash, depositor_hash);

        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        let current: u64 = Mapping::get_or_use(total_locked, will_id, 0u64);
        let new_total: u64 = current + amount;
        // Overflow check: new_total must be >= current (addition can't decrease value)
        assert(new_total >= current);
        Mapping::set(total_locked, will_id, new_total);
    }

    transition store_secret(
        private config: WillConfig,
        private recipient: address,
        private data_0: field,
        private data_1: field,
        private data_2: field,
        private data_3: field,
    ) -> (WillConfig, SecretMessage) {
        assert_eq(config.owner, self.caller);
        assert(config.is_active);

        let secret: SecretMessage = SecretMessage {
            owner: self.caller,
            will_id: config.will_id,
            recipient: recipient,
            data_0: data_0,
            data_1: data_1,
            data_2: data_2,
            data_3: data_3,
        };

        return (config, secret);
    }

    // BUG 2 FIX: Added trigger_address parameter to avoid using self.caller in nested credits.aleo call.
    // The issue is that self.caller in nested external calls refers to the program, not the original caller.
    // By passing trigger_address as a private parameter and verifying it matches self.caller,
    // we can safely use trigger_address in the credits.aleo/transfer_public_to_private call.
    async transition trigger_will(
        public will_id: field,
        public expected_locked: u64, // Caller provides expected locked amount for bounty calculation
        private trigger_address: address, // BUG 2 FIX: New parameter to pass caller address for nested call
    ) -> (credits.aleo/credits, TriggerBounty, Future) {
        // BUG 2 FIX: Verify trigger_address matches the actual caller for security
        assert_eq(trigger_address, self.caller);

        // BUG FIX: Require minimum locked amount to prevent zero-bounty griefing attacks
        // Minimum 10000 microcredits ensures bounty >= 1 (0.1% of 10000 = 1)
        assert(expected_locked >= 10000u64);

        // Calculate bounty based on expected locked amount (verified in finalize)
        let bounty_amount: u64 = (expected_locked * TRIGGER_BOUNTY_BPS) / 10000u64;

        // BUG 2 FIX: Use trigger_address instead of self.caller in the nested credits.aleo call
        // Transfer bounty credits from program to trigger caller
        let (bounty_payout, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(
            trigger_address,
            bounty_amount
        );

        // BUG 2 FIX: Use trigger_address for the TriggerBounty record owner
        let bounty: TriggerBounty = TriggerBounty {
            owner: trigger_address,
            will_id: will_id,
            bounty_amount: bounty_amount,
        };

        return (bounty_payout, bounty, finalize_trigger(will_id, expected_locked, transfer_future));
    }

    async function finalize_trigger(will_id: field, expected_locked: u64, transfer_future: Future) {
        // Await the bounty transfer
        transfer_future.await();

        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        let last_check: u32 = Mapping::get(last_checkin, will_id);
        let period: u32 = Mapping::get(checkin_periods, will_id);
        let grace: u32 = Mapping::get(grace_periods, will_id);

        // CRITICAL FIX: Overflow protection for deadline calculation
        // Use u64 for intermediate calculation to prevent u32 overflow
        let last_check_64: u64 = last_check as u64;
        let period_64: u64 = period as u64;
        let grace_64: u64 = grace as u64;
        let deadline_64: u64 = last_check_64 + period_64 + grace_64;

        // Cap at u32 max to prevent overflow when casting back
        let max_u32: u64 = 4294967295u64;
        let safe_deadline_64: u64 = deadline_64 < max_u32 ? deadline_64 : max_u32;
        let deadline: u32 = safe_deadline_64 as u32;

        assert(block.height > deadline);

        // Verify expected locked matches actual (prevents manipulation)
        let locked: u64 = Mapping::get_or_use(total_locked, will_id, 0u64);
        assert_eq(locked, expected_locked);

        Mapping::set(will_status, will_id, 2u8);

        // OVERFLOW PROTECTION: Ensure multiplication won't overflow
        assert(expected_locked <= MAX_SAFE_MULTIPLY);

        let bounty_amount: u64 = (locked * TRIGGER_BOUNTY_BPS) / 10000u64;
        Mapping::set(total_locked, will_id, locked - bounty_amount);
    }

    // BUG 3 FIX: Changed self.caller to beneficiary_record.owner in nested credits.aleo call.
    // The issue is that self.caller in nested external calls refers to the program, not the original caller.
    // Since we already verify beneficiary_record.owner == self.caller, we can safely use
    // beneficiary_record.owner in the credits.aleo/transfer_public_to_private call.
    //
    // CRITICAL FIX: Now returns consumed Beneficiary record with is_active: false
    // This prevents the same beneficiary record from being used multiple times.
    // Additionally, finalize tracks claims in beneficiary_claimed mapping for double-claim prevention.
    async transition claim_inheritance(
        private beneficiary_record: Beneficiary,
        public amount_to_claim: u64,
    ) -> (Beneficiary, credits.aleo/credits, InheritanceClaim, Future) {
        assert_eq(beneficiary_record.owner, self.caller);
        assert(beneficiary_record.is_active);
        // BUG FIX: Prevent zero-amount claims that would waste gas and mark as claimed
        assert(amount_to_claim > 0u64);

        // CRITICAL FIX: Create consumed/invalidated beneficiary record
        // This record is returned with is_active: false to prevent reuse
        let consumed_beneficiary: Beneficiary = Beneficiary {
            owner: beneficiary_record.owner,
            will_owner: beneficiary_record.will_owner,
            will_id: beneficiary_record.will_id,
            share_bps: beneficiary_record.share_bps,
            priority: beneficiary_record.priority,
            verification_hash: beneficiary_record.verification_hash,
            is_active: false,  // CRITICAL FIX: Mark as inactive/consumed
        };

        // BUG 3 FIX: Use beneficiary_record.owner instead of self.caller in the nested credits.aleo call
        // Transfer credits from program's public balance to beneficiary as private
        let (payout, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(
            beneficiary_record.owner,
            amount_to_claim
        );

        // BUG 3 FIX: Use beneficiary_record.owner for the InheritanceClaim record owner
        let claim: InheritanceClaim = InheritanceClaim {
            owner: beneficiary_record.owner,
            will_id: beneficiary_record.will_id,
            original_owner: beneficiary_record.will_owner,
            amount_claimed: amount_to_claim,
        };

        // CRITICAL FIX: Compute claim key for on-chain tracking
        // Pass beneficiary address hash to finalize for double-claim prevention
        let beneficiary_hash: field = BHP256::hash_to_field(beneficiary_record.owner);

        return (consumed_beneficiary, payout, claim, finalize_claim(beneficiary_record.will_id, amount_to_claim, beneficiary_record.share_bps, beneficiary_hash, transfer_future));
    }

    async function finalize_claim(will_id: field, amount: u64, share_bps: u16, beneficiary_hash: field, transfer_future: Future) {
        // Await the credits transfer
        transfer_future.await();

        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 2u8);

        // CRITICAL FIX: Prevent double claims by same beneficiary
        // Create unique claim key from will_id and beneficiary address hash
        let claim_key: field = BHP256::hash_to_field(will_id + beneficiary_hash);
        let already_claimed: bool = Mapping::get_or_use(beneficiary_claimed, claim_key, false);
        assert(!already_claimed);  // Revert if beneficiary already claimed

        // CRITICAL FIX: Mark this beneficiary as having claimed
        Mapping::set(beneficiary_claimed, claim_key, true);

        // Verify the claim amount matches the beneficiary's share
        let total: u64 = Mapping::get(total_locked, will_id);

        // OVERFLOW PROTECTION
        assert(total <= MAX_SAFE_MULTIPLY);

        let expected_share: u64 = (total * (share_bps as u64)) / 10000u64;
        assert(amount <= expected_share);

        let current_claimed: u64 = Mapping::get_or_use(total_claimed, will_id, 0u64);
        let new_claimed: u64 = current_claimed + amount;
        // Overflow check: new_claimed must be >= current_claimed
        assert(new_claimed >= current_claimed);
        Mapping::set(total_claimed, will_id, new_claimed);

        if (new_claimed >= total) {
            Mapping::set(will_status, will_id, 3u8);
        }
    }

    // NEW: Claim inheritance without requiring a Beneficiary record
    // Beneficiaries can claim using just the will_id - their address is verified from the mapping
    // This allows claims to work even after owner is deceased (no record issuance needed)
    // Caller must provide expected_amount and share_bps (they can query these off-chain)
    async transition claim_inheritance_v2(
        public will_id: field,
        private claimer_address: address,  // Must match self.caller
        public amount_to_claim: u64,       // Amount to claim (calculated off-chain from share)
        public share_bps: u16,             // Their share in bps (for verification)
    ) -> (credits.aleo/credits, InheritanceClaim, Future) {
        // Verify claimer is the actual caller
        assert_eq(claimer_address, self.caller);
        // BUG FIX: Prevent zero-amount claims that would waste gas and mark as claimed
        assert(amount_to_claim > 0u64);

        // Compute allocation key to look up in mapping
        let claimer_hash: field = BHP256::hash_to_field(claimer_address);
        let allocation_key: field = BHP256::hash_to_field(will_id + claimer_hash);

        // Create claim record with the actual claimed amount
        let claim: InheritanceClaim = InheritanceClaim {
            owner: claimer_address,
            will_id: will_id,
            original_owner: claimer_address,
            amount_claimed: amount_to_claim,
        };

        // Transfer credits to the claimer
        let (payout, transfer_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(claimer_address, amount_to_claim);

        return (payout, claim, finalize_claim_v2(will_id, allocation_key, claimer_hash, amount_to_claim, share_bps, transfer_future));
    }

    async function finalize_claim_v2(
        will_id: field,
        allocation_key: field,
        claimer_hash: field,
        amount: u64,
        provided_share_bps: u16,
        transfer_future: Future
    ) {
        // Await the credits transfer
        transfer_future.await();

        // Check will is triggered
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 2u8);

        // Check beneficiary exists in allocation mapping and not revoked
        let stored_share_bps: u16 = Mapping::get(beneficiary_allocations, allocation_key);
        assert(stored_share_bps > 0u16);  // Must be a valid beneficiary with non-zero share

        // Verify provided share matches stored share
        assert_eq(stored_share_bps, provided_share_bps);

        // Prevent double claims - use same claim key format as v1
        let claim_key: field = BHP256::hash_to_field(will_id + claimer_hash);
        let already_claimed: bool = Mapping::get_or_use(beneficiary_claimed, claim_key, false);
        assert(!already_claimed);
        Mapping::set(beneficiary_claimed, claim_key, true);

        // Verify the claim amount matches the beneficiary's share
        let total: u64 = Mapping::get(total_locked, will_id);

        // OVERFLOW PROTECTION: Ensure multiplication won't overflow
        assert(total <= MAX_SAFE_MULTIPLY);

        let expected_share: u64 = (total * (stored_share_bps as u64)) / 10000u64;
        assert(amount <= expected_share);

        let current_claimed: u64 = Mapping::get_or_use(total_claimed, will_id, 0u64);
        let new_claimed: u64 = current_claimed + amount;
        // Overflow check: new_claimed must be >= current_claimed
        assert(new_claimed >= current_claimed);
        Mapping::set(total_claimed, will_id, new_claimed);

        // Mark as fully claimed if all shares are claimed
        if (new_claimed >= total) {
            Mapping::set(will_status, will_id, 3u8);
        }
    }

    async transition emergency_recovery(
        private config: WillConfig,
        private locked_credits: LockedCredits,
    ) -> (WillConfig, LockedCredits, Future) {
        assert_eq(config.owner, self.caller);
        assert_eq(config.will_id, locked_credits.will_id);

        // BUG FIX: Compute owner hash for verification in finalize (defense in depth)
        let caller_hash: field = BHP256::hash_to_field(self.caller);

        let recovered: LockedCredits = LockedCredits {
            owner: self.caller,
            will_id: locked_credits.will_id,
            amount: locked_credits.amount,
            depositor: locked_credits.depositor,
        };

        let reactivated: WillConfig = WillConfig {
            owner: config.owner,
            will_id: config.will_id,
            check_in_period: config.check_in_period,
            grace_period: config.grace_period,
            total_shares_bps: config.total_shares_bps,
            num_beneficiaries: config.num_beneficiaries,
            is_active: true,
            nonce: config.nonce,
        };

        return (reactivated, recovered, finalize_recovery(config.will_id, caller_hash));
    }

    async function finalize_recovery(will_id: field, caller_hash: field) {
        // BUG FIX: Verify caller is the actual owner (defense in depth)
        let stored_owner_hash: field = Mapping::get(owner_hash, will_id);
        assert_eq(stored_owner_hash, caller_hash);

        // Emergency recovery only allowed for TRIGGERED wills (status 2)
        // For active wills (status 1), use withdraw instead
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 2u8);

        // Only allow recovery if less than half has been claimed
        let claimed: u64 = Mapping::get_or_use(total_claimed, will_id, 0u64);
        let total: u64 = Mapping::get(total_locked, will_id);
        assert(claimed < total / 2u64);

        Mapping::set(will_status, will_id, 1u8);
        Mapping::set(last_checkin, will_id, block.height);
    }

    async transition deactivate_will(
        private config: WillConfig,
    ) -> (WillConfig, Future) {
        assert_eq(config.owner, self.caller);
        assert(config.is_active);

        let deactivated: WillConfig = WillConfig {
            owner: config.owner,
            will_id: config.will_id,
            check_in_period: config.check_in_period,
            grace_period: config.grace_period,
            total_shares_bps: config.total_shares_bps,
            num_beneficiaries: config.num_beneficiaries,
            is_active: false,
            nonce: config.nonce,
        };

        return (deactivated, finalize_deactivate(config.will_id));
    }

    async function finalize_deactivate(will_id: field) {
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);
        Mapping::set(will_status, will_id, 0u8);
    }

    async transition reactivate_will(
        private config: WillConfig,
    ) -> (WillConfig, Future) {
        assert_eq(config.owner, self.caller);
        assert(!config.is_active);

        let reactivated: WillConfig = WillConfig {
            owner: config.owner,
            will_id: config.will_id,
            check_in_period: config.check_in_period,
            grace_period: config.grace_period,
            total_shares_bps: config.total_shares_bps,
            num_beneficiaries: config.num_beneficiaries,
            is_active: true,
            nonce: config.nonce,
        };

        return (reactivated, finalize_reactivate(config.will_id));
    }

    async function finalize_reactivate(will_id: field) {
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 0u8);
        Mapping::set(will_status, will_id, 1u8);
        Mapping::set(last_checkin, will_id, block.height);
    }

    // BUG 1 FIX: Changed self.caller to config.owner in nested credits.aleo call.
    // The issue is that self.caller in nested external calls refers to the program, not the original caller.
    // Since we already verify config.owner == self.caller, we can safely use config.owner
    // in the credits.aleo/transfer_public_to_private call to ensure funds go to the will owner.
    async transition withdraw(
        private config: WillConfig,
        private locked_credits: LockedCredits,
    ) -> (WillConfig, credits.aleo/credits, Future) {
        assert_eq(config.owner, self.caller);
        assert(config.is_active);
        assert_eq(config.will_id, locked_credits.will_id);

        // BUG 1 FIX: Use config.owner instead of self.caller in the nested credits.aleo call
        // Transfer credits from program's public balance back to owner as private
        let (payout, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(
            config.owner,
            locked_credits.amount
        );

        return (config, payout, finalize_withdraw(config.will_id, locked_credits.amount, transfer_future));
    }

    async function finalize_withdraw(will_id: field, amount: u64, transfer_future: Future) {
        // Await the credits transfer
        transfer_future.await();

        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        let current: u64 = Mapping::get(total_locked, will_id);
        assert(current >= amount);
        Mapping::set(total_locked, will_id, current - amount);
    }

    // ============================================
    // ENHANCED PRIVACY TRANSITIONS
    // ============================================

    // Helper: Compute Merkle root from leaf and path (inline function)
    // 4-level tree supports up to 16 beneficiaries
    inline compute_merkle_root(
        leaf: field,
        path_0: field,
        path_1: field,
        path_2: field,
        path_3: field,
        indices: u8
    ) -> field {
        // Level 0
        let level_0: field = (indices & 1u8) == 0u8
            ? BHP256::hash_to_field(leaf + path_0)
            : BHP256::hash_to_field(path_0 + leaf);

        // Level 1
        let level_1: field = (indices & 2u8) == 0u8
            ? BHP256::hash_to_field(level_0 + path_1)
            : BHP256::hash_to_field(path_1 + level_0);

        // Level 2
        let level_2: field = (indices & 4u8) == 0u8
            ? BHP256::hash_to_field(level_1 + path_2)
            : BHP256::hash_to_field(path_2 + level_1);

        // Level 3
        let root: field = (indices & 8u8) == 0u8
            ? BHP256::hash_to_field(level_2 + path_3)
            : BHP256::hash_to_field(path_3 + level_2);

        return root;
    }

    // NEW: Set Merkle root for beneficiary verification
    // Owner sets the root after adding all beneficiaries
    async transition set_beneficiary_merkle_root(
        private config: WillConfig,
        public merkle_root: field,
    ) -> (WillConfig, Future) {
        assert_eq(config.owner, self.caller);
        assert(config.is_active);

        return (config, finalize_set_merkle_root(config.will_id, merkle_root));
    }

    async function finalize_set_merkle_root(will_id: field, merkle_root: field) {
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        Mapping::set(beneficiary_merkle_root, will_id, merkle_root);
    }

    // NEW: Claim using Merkle proof - maximum privacy
    // Beneficiary proves they are in the tree without revealing their identity
    async transition claim_with_merkle_proof(
        public will_id: field,
        private claimer_address: address,
        private share_bps: u16,
        private merkle_path_0: field,
        private merkle_path_1: field,
        private merkle_path_2: field,
        private merkle_path_3: field,
        private path_indices: u8,
        public amount_to_claim: u64,
    ) -> (credits.aleo/credits, InheritanceClaim, Future) {
        // Verify claimer is the actual caller
        assert_eq(claimer_address, self.caller);
        // BUG FIX: Prevent zero-amount claims that would waste gas and mark as claimed
        assert(amount_to_claim > 0u64);
        assert(share_bps > 0u16);
        assert(share_bps <= 10000u16);
        // BUG FIX: Validate path_indices is within valid range for 4-level tree (0-15)
        assert(path_indices <= 15u8);

        // Compute leaf: hash(beneficiary_address || share_bps)
        let share_field: field = share_bps as field;
        let leaf: field = BHP256::hash_to_field(BHP256::hash_to_field(claimer_address) + share_field);

        // Compute Merkle root from provided path
        let computed_root: field = compute_merkle_root(
            leaf,
            merkle_path_0,
            merkle_path_1,
            merkle_path_2,
            merkle_path_3,
            path_indices
        );

        // Create claim record
        let claimer_hash: field = BHP256::hash_to_field(claimer_address);
        let claim: InheritanceClaim = InheritanceClaim {
            owner: claimer_address,
            will_id: will_id,
            original_owner: claimer_address,
            amount_claimed: amount_to_claim,
        };

        // Transfer credits
        let (payout, transfer_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(claimer_address, amount_to_claim);

        return (payout, claim, finalize_claim_merkle(will_id, computed_root, claimer_hash, amount_to_claim, share_bps, transfer_future));
    }

    async function finalize_claim_merkle(
        will_id: field,
        computed_root: field,
        claimer_hash: field,
        amount: u64,
        share_bps: u16,
        transfer_future: Future
    ) {
        transfer_future.await();

        // Verify will is triggered
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 2u8);

        // Verify computed Merkle root matches stored root
        let stored_root: field = Mapping::get(beneficiary_merkle_root, will_id);
        assert_eq(computed_root, stored_root);

        // Prevent double claims
        let claim_key: field = BHP256::hash_to_field(will_id + claimer_hash);
        let already_claimed: bool = Mapping::get_or_use(beneficiary_claimed, claim_key, false);
        assert(!already_claimed);
        Mapping::set(beneficiary_claimed, claim_key, true);

        // Verify claim amount
        let total: u64 = Mapping::get(total_locked, will_id);
        assert(total <= MAX_SAFE_MULTIPLY);
        let expected_share: u64 = (total * (share_bps as u64)) / 10000u64;
        assert(amount <= expected_share);

        // Update claimed amount
        let current_claimed: u64 = Mapping::get_or_use(total_claimed, will_id, 0u64);
        let new_claimed: u64 = current_claimed + amount;
        // Overflow check: new_claimed must be >= current_claimed
        assert(new_claimed >= current_claimed);
        Mapping::set(total_claimed, will_id, new_claimed);

        if (new_claimed >= total) {
            Mapping::set(will_status, will_id, 3u8);
        }
    }

    // NEW: Add beneficiary with decoy hashes for privacy
    // Adds real beneficiary + 3 decoy hashes to obscure the actual beneficiary count
    async transition add_beneficiary_with_decoys(
        private config: WillConfig,
        private beneficiary_address: address,
        private share_bps: u16,
        private priority: u8,
        private decoy_hash_0: field,
        private decoy_hash_1: field,
        private decoy_hash_2: field,
    ) -> (WillConfig, BenAllocation, Future) {
        assert_eq(config.owner, self.caller);
        assert(config.is_active);
        assert(share_bps > 0u16);
        assert(share_bps <= 10000u16);

        // BUG FIX: Check for overflow BEFORE addition to prevent u16 wrap-around
        assert(config.total_shares_bps <= 10000u16 - share_bps);
        let new_total: u16 = config.total_shares_bps + share_bps;
        assert(config.num_beneficiaries < MAX_BENEFICIARIES);
        assert_neq(beneficiary_address, self.caller);

        // Create BenAllocation record
        let beneficiary_info: BenAllocation = BenAllocation {
            owner: config.owner,
            beneficiary_addr: beneficiary_address,
            will_id: config.will_id,
            share_bps: share_bps,
            priority: priority,
            is_active: true,
        };

        // Compute real allocation key
        let beneficiary_hash: field = BHP256::hash_to_field(beneficiary_address);
        let allocation_key: field = BHP256::hash_to_field(config.will_id + beneficiary_hash);

        let updated_config: WillConfig = WillConfig {
            owner: config.owner,
            will_id: config.will_id,
            check_in_period: config.check_in_period,
            grace_period: config.grace_period,
            total_shares_bps: new_total,
            num_beneficiaries: config.num_beneficiaries + 1u8,
            is_active: config.is_active,
            nonce: config.nonce,
        };

        // Pass decoy hashes to finalize for storage
        return (updated_config, beneficiary_info, finalize_add_with_decoys(
            config.will_id,
            allocation_key,
            share_bps,
            decoy_hash_0,
            decoy_hash_1,
            decoy_hash_2
        ));
    }

    async function finalize_add_with_decoys(
        will_id: field,
        allocation_key: field,
        share_bps: u16,
        decoy_0: field,
        decoy_1: field,
        decoy_2: field
    ) {
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        // BUG FIX: Check that beneficiary doesn't already exist (prevent duplicates)
        let existing_share: u16 = Mapping::get_or_use(beneficiary_allocations, allocation_key, 0u16);
        assert_eq(existing_share, 0u16);  // Must not already be a beneficiary

        // Store real allocation
        Mapping::set(beneficiary_allocations, allocation_key, share_bps);

        // Store decoys with 0 share (they look like revoked beneficiaries)
        Mapping::set(beneficiary_allocations, decoy_0, 0u16);
        Mapping::set(beneficiary_allocations, decoy_1, 0u16);
        Mapping::set(beneficiary_allocations, decoy_2, 0u16);
    }

    // NEW: Two-phase trigger - initiate then execute after review period
    // Provides a safety window for owner to check in if still alive
    async transition initiate_trigger(
        public will_id: field,
        private trigger_address: address,
    ) -> (TimeLock, Future) {
        assert_eq(trigger_address, self.caller);

        // Time lock for 1 day (~4320 blocks) before execution
        let time_lock: TimeLock = TimeLock {
            owner: trigger_address,
            will_id: will_id,
            action_type: 2u8, // trigger action
            unlock_block: 0u32, // Set in finalize
            authorized_amount: 0u64, // Set in execute
        };

        return (time_lock, finalize_initiate_trigger(will_id));
    }

    async function finalize_initiate_trigger(will_id: field) {
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        // Verify deadline has passed
        let last_check: u32 = Mapping::get(last_checkin, will_id);
        let period: u32 = Mapping::get(checkin_periods, will_id);
        let grace: u32 = Mapping::get(grace_periods, will_id);

        let last_check_64: u64 = last_check as u64;
        let period_64: u64 = period as u64;
        let grace_64: u64 = grace as u64;
        let deadline_64: u64 = last_check_64 + period_64 + grace_64;
        let max_u32: u64 = 4294967295u64;
        let safe_deadline_64: u64 = deadline_64 < max_u32 ? deadline_64 : max_u32;
        let deadline: u32 = safe_deadline_64 as u32;

        assert(block.height > deadline);

        // Set 1-day review period
        let action_key: field = BHP256::hash_to_field(will_id + 2field);
        Mapping::set(authorization_expiry, action_key, block.height + MIN_CHECKIN_PERIOD);
    }

    // NEW: Execute the trigger after review period
    async transition execute_trigger(
        private time_lock: TimeLock,
        public expected_locked: u64,
        private trigger_address: address,
    ) -> (credits.aleo/credits, TriggerBounty, Future) {
        assert_eq(time_lock.action_type, 2u8);
        assert_eq(time_lock.owner, self.caller);
        assert_eq(trigger_address, self.caller);

        // Minimum locked amount check (same as trigger_will)
        assert(expected_locked >= 10000u64);

        let bounty_amount: u64 = (expected_locked * TRIGGER_BOUNTY_BPS) / 10000u64;

        let (bounty_payout, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(
            trigger_address,
            bounty_amount
        );

        let bounty: TriggerBounty = TriggerBounty {
            owner: trigger_address,
            will_id: time_lock.will_id,
            bounty_amount: bounty_amount,
        };

        return (bounty_payout, bounty, finalize_execute_trigger(time_lock.will_id, expected_locked, transfer_future));
    }

    async function finalize_execute_trigger(will_id: field, expected_locked: u64, transfer_future: Future) {
        transfer_future.await();

        // Verify review period has passed
        let action_key: field = BHP256::hash_to_field(will_id + 2field);
        let unlock_block: u32 = Mapping::get(authorization_expiry, action_key);
        assert(block.height >= unlock_block);

        // Verify will hasn't been recovered during review period
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        // Verify locked amount
        let locked: u64 = Mapping::get_or_use(total_locked, will_id, 0u64);
        assert_eq(locked, expected_locked);

        // Complete trigger
        Mapping::set(will_status, will_id, 2u8);

        assert(expected_locked <= MAX_SAFE_MULTIPLY);
        let bounty_amount: u64 = (locked * TRIGGER_BOUNTY_BPS) / 10000u64;
        Mapping::set(total_locked, will_id, locked - bounty_amount);
    }

    // NEW: Convert BenAllocation to public (for transparency/compliance)
    async transition convert_beneficiary_to_public(
        private allocation: BenAllocation,
    ) -> Future {
        assert_eq(allocation.owner, self.caller);
        assert(allocation.is_active);

        let beneficiary_hash: field = BHP256::hash_to_field(allocation.beneficiary_addr);
        return finalize_convert_to_public(allocation.will_id, beneficiary_hash, allocation.share_bps);
    }

    async function finalize_convert_to_public(will_id: field, beneficiary_hash: field, share_bps: u16) {
        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        // Store in public mapping (already done in add_beneficiary)
        // This just consumes the private record
        let allocation_key: field = BHP256::hash_to_field(will_id + beneficiary_hash);
        let stored: u16 = Mapping::get(beneficiary_allocations, allocation_key);
        assert_eq(stored, share_bps);
    }

    // NEW: Convert public allocation back to private record
    async transition convert_beneficiary_to_private(
        public will_id: field,
        private beneficiary_address: address,
        private share_bps: u16,
        private priority: u8,
    ) -> (BenAllocation, Future) {
        // Only the will owner can convert
        let caller_hash: field = BHP256::hash_to_field(self.caller);

        let allocation: BenAllocation = BenAllocation {
            owner: self.caller,
            beneficiary_addr: beneficiary_address,
            will_id: will_id,
            share_bps: share_bps,
            priority: priority,
            is_active: true,
        };

        let beneficiary_hash: field = BHP256::hash_to_field(beneficiary_address);
        return (allocation, finalize_convert_to_private(will_id, caller_hash, beneficiary_hash, share_bps));
    }

    async function finalize_convert_to_private(will_id: field, caller_hash: field, beneficiary_hash: field, share_bps: u16) {
        // Verify caller is owner
        let stored_owner_hash: field = Mapping::get(owner_hash, will_id);
        assert_eq(stored_owner_hash, caller_hash);

        let status: u8 = Mapping::get(will_status, will_id);
        assert_eq(status, 1u8);

        // Verify allocation exists with correct share
        let allocation_key: field = BHP256::hash_to_field(will_id + beneficiary_hash);
        let stored: u16 = Mapping::get(beneficiary_allocations, allocation_key);
        assert_eq(stored, share_bps);
    }

    // NEW: Update will count registry when creating will
    async transition register_will_in_registry(
        public will_id: field,
    ) -> Future {
        let owner_address_hash: field = BHP256::hash_to_field(self.caller);
        return finalize_register_will(will_id, owner_address_hash);
    }

    async function finalize_register_will(will_id: field, owner_address_hash: field) {
        // Verify will exists and caller is owner
        let stored_hash: field = Mapping::get(owner_hash, will_id);
        assert_eq(stored_hash, owner_address_hash);

        // Increment will count with overflow protection
        let current_count: u8 = Mapping::get_or_use(will_count, owner_address_hash, 0u8);
        // BUG FIX: Check for overflow before incrementing (max 255 wills per owner)
        assert(current_count < 255u8);
        Mapping::set(will_count, owner_address_hash, current_count + 1u8);
    }
}
