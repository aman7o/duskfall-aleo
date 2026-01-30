#!/bin/bash

################################################################################
# Digital Will dApp - Local Testing Script
#
# This script builds and tests all transitions of the digital_will_v2.aleo program
# Each transition is tested with predefined input files
#
# Usage: ./scripts/test-local.sh
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/amansingh/digitalwill"
CONTRACT_DIR="$PROJECT_ROOT/contracts/digital_will"
INPUTS_DIR="$CONTRACT_DIR/inputs"
OUTPUTS_DIR="$CONTRACT_DIR/outputs"
LOG_DIR="$PROJECT_ROOT/logs"
PROGRAM_NAME="digital_will_v2.aleo"

# Create necessary directories
mkdir -p "$OUTPUTS_DIR"
mkdir -p "$LOG_DIR"

# Timestamp for this test run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/test_run_$TIMESTAMP.log"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${CYAN}================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_step() {
    echo -e "\n${BLUE}>>> $1${NC}\n"
}

log() {
    echo "[$(date +%H:%M:%S)] $1" | tee -a "$LOG_FILE"
}

run_transition() {
    local transition_name=$1
    local input_file=$2
    local description=$3

    print_step "Testing: $transition_name"
    print_info "Description: $description"
    print_info "Input file: $input_file"

    if [ ! -f "$INPUTS_DIR/$input_file" ]; then
        print_error "Input file not found: $INPUTS_DIR/$input_file"
        return 1
    fi

    # Run the transition
    log "Running transition: $transition_name"

    if cd "$CONTRACT_DIR" && leo run "$transition_name" --file "inputs/$input_file" 2>&1 | tee -a "$LOG_FILE"; then
        print_success "Transition '$transition_name' executed successfully"
        echo "---" >> "$LOG_FILE"
        return 0
    else
        print_error "Transition '$transition_name' failed"
        echo "FAILED: $transition_name" >> "$LOG_FILE"
        echo "---" >> "$LOG_FILE"
        return 1
    fi
}

################################################################################
# Main Testing Flow
################################################################################

print_header "Digital Will dApp - Local Testing Suite"
echo "Timestamp: $TIMESTAMP"
echo "Log file: $LOG_FILE"
echo ""

# Counter for test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

################################################################################
# Step 1: Build the contract
################################################################################

print_header "Step 1: Building Contract"
print_step "Building $PROGRAM_NAME"

if cd "$CONTRACT_DIR" && leo build 2>&1 | tee -a "$LOG_FILE"; then
    print_success "Contract built successfully"
else
    print_error "Contract build failed. Exiting."
    exit 1
fi

################################################################################
# Step 2: Test Core Transitions
################################################################################

print_header "Step 2: Testing Core Transitions"

# Test 1: Create Will
print_step "Test 1: Create Will"
((TOTAL_TESTS++))
if run_transition "create_will" "create_will.in" "Create a new digital will with check-in period"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
    print_warning "Note: Save the WillConfig output for subsequent tests"
fi

# Test 2: Check In (Standard)
print_step "Test 2: Check In (Standard)"
print_warning "This test requires a valid WillConfig record from create_will"
print_info "Skipping automatic execution - requires manual record input"
# Uncomment to run with actual records:
# ((TOTAL_TESTS++))
# if run_transition "check_in" "check_in.in" "Owner performs regular check-in"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

# Test 3: Check In Backup
print_step "Test 3: Check In (Backup)"
print_warning "This test requires a valid will_id from create_will"
print_info "Skipping automatic execution - requires manual will_id input"
# Uncomment to run with actual will_id:
# ((TOTAL_TESTS++))
# if run_transition "check_in_backup" "check_in_backup.in" "Emergency check-in without WillConfig record"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

################################################################################
# Step 3: Test Beneficiary Management
################################################################################

print_header "Step 3: Testing Beneficiary Management"

# Test 4: Add First Beneficiary
print_step "Test 4: Add Beneficiary (50% share)"
print_warning "This test requires a valid WillConfig record from create_will"
print_info "Skipping automatic execution - requires manual record input"
# ((TOTAL_TESTS++))
# if run_transition "add_beneficiary" "add_beneficiary.in" "Add beneficiary with 50% share"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

# Test 5: Add Second Beneficiary
print_step "Test 5: Add Second Beneficiary (30% share)"
print_warning "This test requires an updated WillConfig record"
print_info "Skipping automatic execution - requires manual record input"
# ((TOTAL_TESTS++))
# if run_transition "add_beneficiary" "add_beneficiary_second.in" "Add second beneficiary with 30% share"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

# Test 6: Revoke Beneficiary
print_step "Test 6: Revoke Beneficiary"
print_warning "This test requires valid WillConfig and Beneficiary records"
print_info "Skipping automatic execution - requires manual record input"
# ((TOTAL_TESTS++))
# if run_transition "revoke_beneficiary" "revoke_beneficiary.in" "Revoke a beneficiary's rights"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

################################################################################
# Step 4: Test Configuration Updates
################################################################################

print_header "Step 4: Testing Configuration Updates"

# Test 7: Update Check-in Period
print_step "Test 7: Update Check-in Period"
print_warning "This test requires a valid WillConfig record"
print_info "Skipping automatic execution - requires manual record input"
# ((TOTAL_TESTS++))
# if run_transition "update_check_in_period" "update_check_in_period.in" "Update check-in frequency to 4 days"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

################################################################################
# Step 5: Test Asset Management
################################################################################

print_header "Step 5: Testing Asset Management"

# Test 8: Deposit Assets
print_step "Test 8: Deposit Assets"
print_warning "This test requires a valid WillConfig record"
print_info "Skipping automatic execution - requires manual record input"
# ((TOTAL_TESTS++))
# if run_transition "deposit" "deposit.in" "Deposit 1 ALEO into the will"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

# Test 9: Store Secret Message
print_step "Test 9: Store Secret Message"
print_warning "This test requires a valid WillConfig record"
print_info "Skipping automatic execution - requires manual record input"
# ((TOTAL_TESTS++))
# if run_transition "store_secret" "store_secret.in" "Store encrypted secret for beneficiary"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

# Test 10: Withdraw Assets
print_step "Test 10: Withdraw Assets"
print_warning "This test requires valid WillConfig and LockedCredits records"
print_info "Skipping automatic execution - requires manual record input"
# ((TOTAL_TESTS++))
# if run_transition "withdraw" "withdraw.in" "Owner withdraws 0.5 ALEO from will"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

################################################################################
# Step 6: Test Will Lifecycle
################################################################################

print_header "Step 6: Testing Will Lifecycle"

# Test 11: Deactivate Will
print_step "Test 11: Deactivate Will"
print_warning "This test requires a valid WillConfig record"
print_info "Skipping automatic execution - requires manual record input"
# ((TOTAL_TESTS++))
# if run_transition "deactivate_will" "deactivate_will.in" "Temporarily deactivate the will"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

# Test 12: Reactivate Will
print_step "Test 12: Reactivate Will"
print_warning "This test requires a deactivated WillConfig record"
print_info "Skipping automatic execution - requires manual record input"
# ((TOTAL_TESTS++))
# if run_transition "reactivate_will" "reactivate_will.in" "Reactivate a deactivated will"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

################################################################################
# Step 7: Test Will Triggering and Claims
################################################################################

print_header "Step 7: Testing Will Triggering and Claims"

# Test 13: Trigger Will
print_step "Test 13: Trigger Will"
print_warning "This test requires deadline to have passed (check-in + grace period)"
print_info "Skipping automatic execution - requires time passage or manual blockchain manipulation"
# ((TOTAL_TESTS++))
# if run_transition "trigger_will" "trigger_will.in" "Anyone triggers the will after deadline"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

# Test 14: Claim Inheritance
print_step "Test 14: Claim Inheritance"
print_warning "This test requires will to be triggered and valid Beneficiary + LockedCredits records"
print_info "Skipping automatic execution - requires manual record input"
# ((TOTAL_TESTS++))
# if run_transition "claim_inheritance" "claim_inheritance.in" "Beneficiary claims their 50% share"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

################################################################################
# Step 8: Test Emergency Recovery
################################################################################

print_header "Step 8: Testing Emergency Recovery"

# Test 15: Emergency Recovery
print_step "Test 15: Emergency Recovery"
print_warning "This test requires will to be triggered but less than 50% claimed"
print_info "Skipping automatic execution - requires specific state and manual record input"
# ((TOTAL_TESTS++))
# if run_transition "emergency_recovery" "emergency_recovery.in" "Owner recovers assets if still alive"; then
#     ((PASSED_TESTS++))
# else
#     ((FAILED_TESTS++))
# fi

################################################################################
# Test Summary
################################################################################

print_header "Test Summary"

echo -e "${CYAN}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"

if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    echo -e "${BLUE}Success Rate:${NC} $SUCCESS_RATE%"
fi

echo ""
echo -e "${BLUE}Log file:${NC} $LOG_FILE"
echo ""

# Print next steps
print_header "Next Steps"
echo "1. Review the output records from create_will transition"
echo "2. Update input files with actual record values"
echo "3. Uncomment tests in this script to run them with real data"
echo "4. For trigger_will tests, you'll need to wait for the deadline or use a test network"
echo "5. Run integration tests with multiple accounts for beneficiary scenarios"
echo ""

print_info "To run a specific transition manually:"
echo "  cd $CONTRACT_DIR"
echo "  leo run <transition_name> --file inputs/<input_file>.in"
echo ""

if [ $FAILED_TESTS -eq 0 ] && [ $TOTAL_TESTS -gt 0 ]; then
    print_success "All enabled tests passed!"
    exit 0
else
    if [ $TOTAL_TESTS -eq 0 ]; then
        print_warning "Most tests are skipped by default - they require actual record values"
        print_info "Start by running create_will and then update input files with the output"
        exit 0
    else
        print_warning "Some tests failed. Check the log file for details."
        exit 1
    fi
fi
