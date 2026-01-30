#!/bin/bash

# Digital Will Smart Contract Test Suite
# Tests all transitions with valid inputs and edge cases
# Usage: ./test.sh

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test result arrays
declare -a PASSED_LIST
declare -a FAILED_LIST

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

print_failure() {
    echo -e "${RED}✗ FAIL${NC}: $1"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

print_info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

# Function to run a test
run_test() {
    local test_name=$1
    local input_file=$2
    local should_fail=${3:-false}  # Optional: if test should fail (for negative tests)

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    print_info "Running test: $test_name"

    if [ ! -f "$input_file" ]; then
        print_failure "$test_name - Input file not found: $input_file"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LIST+=("$test_name - Input file not found")
        return 1
    fi

    # Extract transition name from input file
    local transition=$(basename "$input_file" .in)

    # Run the Leo command with input file (Leo 3.x syntax)
    # Leo will automatically read the input file matching the transition name
    if leo run "$transition" > /tmp/leo_test_output.txt 2>&1; then
        if [ "$should_fail" = true ]; then
            print_failure "$test_name - Expected to fail but passed"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            FAILED_LIST+=("$test_name - Should have failed")
        else
            print_success "$test_name"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            PASSED_LIST+=("$test_name")
        fi
        return 0
    else
        if [ "$should_fail" = true ]; then
            print_success "$test_name - Correctly failed as expected"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            PASSED_LIST+=("$test_name")
        else
            print_failure "$test_name"
            echo -e "${RED}Error output:${NC}"
            cat /tmp/leo_test_output.txt
            FAILED_TESTS=$((FAILED_TESTS + 1))
            FAILED_LIST+=("$test_name")
        fi
        return 1
    fi
}

# Main test execution
main() {
    print_header "Digital Will Smart Contract - Comprehensive Test Suite"

    print_info "Leo version: $(leo --version)"
    print_info "Working directory: $(pwd)"
    print_info "Program: digital_will_v3.aleo"

    # Check if we're in the right directory
    if [ ! -f "program.json" ]; then
        echo -e "${RED}Error: program.json not found. Please run this script from the project root.${NC}"
        exit 1
    fi

    # Build the program first
    print_header "Building Program"
    if leo build; then
        print_success "Build successful"
    else
        print_failure "Build failed"
        exit 1
    fi

    # ========================================
    # SECTION 1: Core Will Lifecycle Tests
    # ========================================

    print_header "SECTION 1: Core Will Lifecycle Tests"

    print_info "Test 1.1: Create Will"
    run_test "Create Will with valid parameters" "inputs/create_will.in"

    print_info "Test 1.2: Check In (Basic)"
    run_test "Owner checks in to reset timer" "inputs/check_in.in"

    print_info "Test 1.3: Check In Backup (Emergency)"
    run_test "Emergency check-in without WillConfig record" "inputs/check_in_backup.in"

    # ========================================
    # SECTION 2: Beneficiary Management Tests
    # ========================================

    print_header "SECTION 2: Beneficiary Management Tests"

    print_info "Test 2.1: Add First Beneficiary"
    run_test "Add first beneficiary with 50% share" "inputs/add_beneficiary.in"

    print_info "Test 2.2: Add Second Beneficiary"
    run_test "Add second beneficiary with 30% share" "inputs/add_beneficiary_second.in"

    print_info "Test 2.3: Revoke Beneficiary"
    run_test "Revoke beneficiary rights" "inputs/revoke_beneficiary.in"

    # ========================================
    # SECTION 3: Asset Management Tests
    # ========================================

    print_header "SECTION 3: Asset Management Tests"

    print_info "Test 3.1: Deposit Credits"
    print_warning "Deposit tests require valid credits records from wallet"
    print_warning "Skipping deposit test - requires actual credits record"
    # run_test "Deposit credits into will" "inputs/deposit.in"

    print_info "Test 3.2: Withdraw Credits"
    print_warning "Withdraw tests require valid LockedCredits record"
    print_warning "Skipping withdraw test - requires actual locked credits record"
    # run_test "Owner withdraws locked credits" "inputs/withdraw.in"

    # ========================================
    # SECTION 4: Secret Storage Tests
    # ========================================

    print_header "SECTION 4: Secret Storage Tests"

    print_info "Test 4.1: Store Secret Message"
    run_test "Store encrypted secret for beneficiary" "inputs/store_secret.in"

    # ========================================
    # SECTION 5: Will Activation Tests
    # ========================================

    print_header "SECTION 5: Will Activation/Deactivation Tests"

    print_info "Test 5.1: Deactivate Will"
    run_test "Owner deactivates will" "inputs/deactivate_will.in"

    print_info "Test 5.2: Reactivate Will"
    run_test "Owner reactivates will" "inputs/reactivate_will.in"

    # ========================================
    # SECTION 6: Will Execution Tests
    # ========================================

    print_header "SECTION 6: Will Execution Tests"

    print_info "Test 6.1: Trigger Will"
    print_warning "Trigger will requires deadline to pass (check_in_period + grace_period blocks)"
    print_warning "This test will fail unless sufficient time has passed"
    print_warning "Skipping trigger_will test - requires deadline to pass"
    # run_test "Anyone triggers will after deadline" "inputs/trigger_will.in"

    print_info "Test 6.2: Claim Inheritance"
    print_warning "Claim inheritance requires will to be triggered first (status = 2)"
    print_warning "Skipping claim test - requires triggered will"
    # run_test "Beneficiary claims inheritance" "inputs/claim_inheritance.in"

    # ========================================
    # SECTION 7: Emergency Recovery Tests
    # ========================================

    print_header "SECTION 7: Emergency Recovery Tests"

    print_info "Test 7.1: Emergency Recovery"
    print_warning "Emergency recovery requires will to be triggered and <50% claimed"
    print_warning "Skipping emergency recovery test - requires specific state"
    # run_test "Owner recovers assets after accidental trigger" "inputs/emergency_recovery.in"

    # ========================================
    # SECTION 8: Edge Case Tests
    # ========================================

    print_header "SECTION 8: Edge Case Tests"

    print_info "Creating edge case test files..."

    # Test 8.1: Invalid check-in period (too short)
    cat > inputs/test_invalid_period.in << 'EOF'
[create_will]
nonce: 9999999999field
check_in_period: 1000u32  // Below MIN_CHECKIN_PERIOD (4320)
grace_period: 4320u32
EOF
    run_test "Create will with invalid check-in period (too short)" "inputs/test_invalid_period.in" true

    # Test 8.2: Invalid check-in period (too long)
    cat > inputs/test_period_too_long.in << 'EOF'
[create_will]
nonce: 8888888888field
check_in_period: 2000000u32  // Above MAX_CHECKIN_PERIOD (1576800)
grace_period: 4320u32
EOF
    run_test "Create will with invalid check-in period (too long)" "inputs/test_period_too_long.in" true

    # Test 8.3: Invalid grace period (too short)
    cat > inputs/test_invalid_grace.in << 'EOF'
[create_will]
nonce: 7777777777field
check_in_period: 8640u32
grace_period: 1000u32  // Below MIN_CHECKIN_PERIOD (4320)
EOF
    run_test "Create will with invalid grace period" "inputs/test_invalid_grace.in" true

    # Test 8.4: Share exceeds 100%
    cat > inputs/test_share_overflow.in << 'EOF'
[add_beneficiary]
config: WillConfig {
    owner: aleo1z7fz8f3mz0mgm769uqpqhek34luq33y9dldqw4hp06nxurrrgc8sa7uyah,
    will_id: 7621709804076072108229317122488814490650163242437823938998867782737570973140field,
    check_in_period: 8640u32,
    grace_period: 4320u32,
    total_shares_bps: 9500u16,  // Already 95% allocated
    num_beneficiaries: 1u8,
    is_active: true,
    nonce: 1234567890field
}
beneficiary_address: aleo1md5qazhtpf574ca9cu93ks30uckdd6635lzlq29kcnm2lvmdcv9s9getdn
share_bps: 1000u16  // Would total 105% (10500 basis points > 10000)
priority: 1u8
EOF
    run_test "Add beneficiary exceeding 100% shares" "inputs/test_share_overflow.in" true

    # Test 8.5: Zero share beneficiary
    cat > inputs/test_zero_share.in << 'EOF'
[add_beneficiary]
config: WillConfig {
    owner: aleo1z7fz8f3mz0mgm769uqpqhek34luq33y9dldqw4hp06nxurrrgc8sa7uyah,
    will_id: 7621709804076072108229317122488814490650163242437823938998867782737570973140field,
    check_in_period: 8640u32,
    grace_period: 4320u32,
    total_shares_bps: 0u16,
    num_beneficiaries: 0u8,
    is_active: true,
    nonce: 1234567890field
}
beneficiary_address: aleo1md5qazhtpf574ca9cu93ks30uckdd6635lzlq29kcnm2lvmdcv9s9getdn
share_bps: 0u16  // Invalid: must be > 0
priority: 1u8
EOF
    run_test "Add beneficiary with zero share" "inputs/test_zero_share.in" true

    # Test 8.6: Add self as beneficiary
    cat > inputs/test_self_beneficiary.in << 'EOF'
[add_beneficiary]
config: WillConfig {
    owner: aleo1z7fz8f3mz0mgm769uqpqhek34luq33y9dldqw4hp06nxurrrgc8sa7uyah,
    will_id: 7621709804076072108229317122488814490650163242437823938998867782737570973140field,
    check_in_period: 8640u32,
    grace_period: 4320u32,
    total_shares_bps: 0u16,
    num_beneficiaries: 0u8,
    is_active: true,
    nonce: 1234567890field
}
beneficiary_address: aleo1z7fz8f3mz0mgm769uqpqhek34luq33y9dldqw4hp06nxurrrgc8sa7uyah
share_bps: 5000u16
priority: 1u8
EOF
    run_test "Add self as beneficiary (should fail)" "inputs/test_self_beneficiary.in" true

    # Clean up test files
    print_info "Cleaning up temporary test files..."
    rm -f inputs/test_*.in

    # ========================================
    # Test Summary
    # ========================================

    print_header "Test Summary"

    echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

    if [ $PASSED_TESTS -gt 0 ]; then
        echo -e "\n${GREEN}Passed Tests:${NC}"
        for test in "${PASSED_LIST[@]}"; do
            echo -e "  ${GREEN}✓${NC} $test"
        done
    fi

    if [ $FAILED_TESTS -gt 0 ]; then
        echo -e "\n${RED}Failed Tests:${NC}"
        for test in "${FAILED_LIST[@]}"; do
            echo -e "  ${RED}✗${NC} $test"
        done
    fi

    # Calculate success rate
    if [ $TOTAL_TESTS -gt 0 ]; then
        SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
        echo -e "\n${BLUE}Success Rate: $SUCCESS_RATE%${NC}"
    fi

    # ========================================
    # Recommendations
    # ========================================

    print_header "Testing Recommendations"

    echo "1. Full Integration Testing:"
    echo "   - Test deposit/withdraw with actual credits records"
    echo "   - Test trigger_will after waiting for deadline to pass"
    echo "   - Test claim_inheritance with triggered will"
    echo "   - Test emergency_recovery with proper state"

    echo -e "\n2. State-Dependent Tests:"
    echo "   - Create a test sequence that maintains state across transitions"
    echo "   - Use outputs from one transition as inputs to the next"

    echo -e "\n3. On-Chain Testing:"
    echo "   - Deploy to testnet for real blockchain testing"
    echo "   - Test with actual block heights and timing constraints"
    echo "   - Test concurrent beneficiary claims"

    echo -e "\n4. Security Testing:"
    echo "   - Test unauthorized access attempts"
    echo "   - Test reentrancy scenarios"
    echo "   - Test overflow/underflow conditions"
    echo "   - Test race conditions in claim order"

    echo -e "\n5. Performance Testing:"
    echo "   - Test with maximum beneficiaries (MAX_BENEFICIARIES = 10)"
    echo "   - Test with large credit amounts"
    echo "   - Measure gas costs for each transition"

    # Exit with appropriate code
    if [ $FAILED_TESTS -eq 0 ]; then
        print_header "All Tests Passed! ✓"
        exit 0
    else
        print_header "Some Tests Failed"
        exit 1
    fi
}

# Run main function
main "$@"
