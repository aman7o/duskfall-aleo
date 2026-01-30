#!/bin/bash

################################################################################
# Digital Will dApp - Individual Test Runner
#
# This script runs a specific transition with a specified input file
# Provides colored output and logging
#
# Usage: ./scripts/run-test.sh <transition_name> [input_file]
#        ./scripts/run-test.sh create_will
#        ./scripts/run-test.sh add_beneficiary add_beneficiary.in
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="/Users/amansingh/digitalwill"
CONTRACT_DIR="$PROJECT_ROOT/contracts/digital_will"
INPUTS_DIR="$CONTRACT_DIR/inputs"
LOG_DIR="$PROJECT_ROOT/logs"

# Create log directory
mkdir -p "$LOG_DIR"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/test_${1}_$TIMESTAMP.log"

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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

show_usage() {
    echo "Usage: $0 <transition_name> [input_file]"
    echo ""
    echo "Available transitions:"
    echo "  create_will              - Create a new will"
    echo "  check_in                 - Regular check-in with WillConfig"
    echo "  check_in_backup          - Emergency check-in without record"
    echo "  add_beneficiary          - Add a beneficiary"
    echo "  revoke_beneficiary       - Revoke a beneficiary"
    echo "  update_check_in_period   - Update check-in frequency"
    echo "  deposit                  - Deposit ALEO credits"
    echo "  store_secret             - Store encrypted secret message"
    echo "  withdraw                 - Withdraw credits"
    echo "  deactivate_will          - Deactivate the will"
    echo "  reactivate_will          - Reactivate the will"
    echo "  trigger_will             - Trigger the will (after deadline)"
    echo "  claim_inheritance        - Claim beneficiary share"
    echo "  emergency_recovery       - Owner recovers assets"
    echo ""
    echo "Examples:"
    echo "  $0 create_will"
    echo "  $0 add_beneficiary"
    echo "  $0 add_beneficiary add_beneficiary_second.in"
    echo ""
}

################################################################################
# Main Script
################################################################################

# Check arguments
if [ $# -lt 1 ]; then
    print_error "Missing transition name"
    show_usage
    exit 1
fi

TRANSITION_NAME=$1
INPUT_FILE="${2:-${TRANSITION_NAME}.in}"

print_header "Digital Will Test Runner"
echo "Transition: $TRANSITION_NAME"
echo "Input file: $INPUT_FILE"
echo "Log file: $LOG_FILE"
echo ""

# Verify input file exists
if [ ! -f "$INPUTS_DIR/$INPUT_FILE" ]; then
    print_error "Input file not found: $INPUTS_DIR/$INPUT_FILE"
    echo ""
    print_info "Available input files:"
    ls -1 "$INPUTS_DIR"/*.in 2>/dev/null || echo "  No input files found"
    echo ""
    exit 1
fi

# Show input file content
print_info "Input file contents:"
echo "---"
cat "$INPUTS_DIR/$INPUT_FILE"
echo "---"
echo ""

# Confirm execution
read -p "Execute this transition? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Execution cancelled"
    exit 0
fi

# Change to contract directory
cd "$CONTRACT_DIR" || {
    print_error "Failed to change to contract directory"
    exit 1
}

# Execute the transition
print_info "Executing transition: $TRANSITION_NAME"
echo ""

if leo run "$TRANSITION_NAME" --file "inputs/$INPUT_FILE" 2>&1 | tee "$LOG_FILE"; then
    echo ""
    print_success "Transition executed successfully"
    print_info "Output saved to: $LOG_FILE"

    # Show summary
    echo ""
    print_header "Output Summary"

    # Try to extract key information from output
    if grep -q "Output" "$LOG_FILE"; then
        print_info "Generated outputs (records):"
        grep -A 20 "Output" "$LOG_FILE" | head -n 20
    fi

    echo ""
    print_info "Next steps:"

    case "$TRANSITION_NAME" in
        create_will)
            echo "  1. Copy the WillConfig record from the output above"
            echo "  2. Update other input files with this WillConfig"
            echo "  3. Note the will_id for public transitions"
            echo "  4. Run: ./scripts/run-test.sh check_in"
            ;;
        add_beneficiary)
            echo "  1. Copy the updated WillConfig record"
            echo "  2. Save the Beneficiary record for the beneficiary"
            echo "  3. Update subsequent input files with the new WillConfig"
            echo "  4. Add more beneficiaries or run: ./scripts/run-test.sh deposit"
            ;;
        deposit)
            echo "  1. Save the LockedCredits record"
            echo "  2. You can deposit more or proceed to check-in"
            echo "  3. Run: ./scripts/run-test.sh check_in"
            ;;
        trigger_will)
            echo "  1. Save the TriggerBounty record"
            echo "  2. Beneficiaries can now claim their shares"
            echo "  3. Run: ./scripts/run-test.sh claim_inheritance"
            ;;
        claim_inheritance)
            echo "  1. Save the ClaimableShare and InheritanceClaim records"
            echo "  2. Other beneficiaries can claim their shares"
            echo "  3. Check if will is fully claimed (status = 3)"
            ;;
        *)
            echo "  Review the output above and proceed with your test plan"
            ;;
    esac

    echo ""
    exit 0
else
    echo ""
    print_error "Transition execution failed"
    print_info "Error log: $LOG_FILE"

    echo ""
    print_warning "Common issues:"

    case "$TRANSITION_NAME" in
        check_in|add_beneficiary|deposit)
            echo "  - Ensure WillConfig record matches actual output from create_will"
            echo "  - Verify all record fields are correct (owner, will_id, etc.)"
            echo "  - Check that is_active is true"
            ;;
        claim_inheritance)
            echo "  - Ensure will has been triggered (run trigger_will first)"
            echo "  - Verify Beneficiary record is valid and active"
            echo "  - Check that LockedCredits matches the will_id"
            ;;
        trigger_will)
            echo "  - Ensure deadline has passed (last_checkin + period + grace)"
            echo "  - Verify will is still active (not already triggered)"
            echo "  - Check that will_id is correct"
            ;;
        *)
            echo "  - Review input file for correct values"
            echo "  - Check that prerequisites are met"
            echo "  - Verify record ownership and permissions"
            ;;
    esac

    echo ""
    exit 1
fi
