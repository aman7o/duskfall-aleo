#!/bin/bash

# Utility functions for automated testing

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Load environment
load_env() {
    local env_file="${1:-.env.test}"
    if [ -f "$env_file" ]; then
        export $(cat "$env_file" | grep -v '^#' | xargs)
        echo -e "${GREEN}✓${NC} Loaded environment from $env_file"
    else
        echo -e "${RED}✗${NC} Environment file not found: $env_file"
        echo -e "${YELLOW}  Copy .env.test.example to .env.test and fill in your test keys${NC}"
        exit 1
    fi
}

# Print functions
print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"
}

print_test() {
    echo -e "${CYAN}▶ TEST:${NC} $1"
}

print_pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

print_fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    if [ -n "$2" ]; then
        echo -e "${RED}  Error: $2${NC}"
    fi
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

print_info() {
    echo -e "${YELLOW}ℹ INFO:${NC} $1"
}

print_summary() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  TEST SUMMARY${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "  Total:  $TOTAL_TESTS"
    echo -e "  ${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "  ${RED}Failed: $FAILED_TESTS${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        return 1
    fi
}

# Generate a random nonce for will creation
generate_nonce() {
    echo "${RANDOM}${RANDOM}${RANDOM}field"
}

# Query mapping value from testnet
query_mapping() {
    local program_id="$1"
    local mapping_name="$2"
    local key="$3"

    local url="${ENDPOINT}/testnet/program/${program_id}/mapping/${mapping_name}/${key}"
    local result=$(curl -s "$url")

    echo "$result"
}

# Get latest block height
get_block_height() {
    local url="${ENDPOINT}/testnet/block/height/latest"
    local result=$(curl -s "$url")
    echo "$result"
}

# Check if program is deployed
check_program_deployed() {
    local program_id="$1"
    local url="${ENDPOINT}/testnet/program/${program_id}"
    local result=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$result" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Execute a Leo transition and capture output
# Usage: execute_transition "transition_name" "arg1" "arg2" ...
execute_transition() {
    local transition="$1"
    shift
    local args="$@"

    print_info "Executing: $transition $args"

    # Create a temp file for output
    local output_file=$(mktemp)

    # Run leo execute with broadcast
    cd "$CONTRACT_DIR"

    if leo execute "$transition" $args \
        --network testnet \
        --broadcast "${ENDPOINT}/testnet/transaction/broadcast" \
        > "$output_file" 2>&1; then

        # Extract transaction ID from output
        local tx_id=$(grep -oE 'at[0-9a-z]+' "$output_file" | head -1)

        if [ -n "$tx_id" ]; then
            print_info "Transaction broadcast: $tx_id"
            echo "$tx_id"
            rm "$output_file"
            return 0
        else
            cat "$output_file"
            rm "$output_file"
            return 1
        fi
    else
        echo -e "${RED}Execution failed:${NC}"
        cat "$output_file"
        rm "$output_file"
        return 1
    fi
}

# Wait for transaction confirmation
wait_for_confirmation() {
    local tx_id="$1"
    local max_attempts="${2:-30}"
    local interval="${3:-5}"

    print_info "Waiting for transaction confirmation: $tx_id"

    for ((i=1; i<=max_attempts; i++)); do
        local url="${ENDPOINT}/testnet/transaction/${tx_id}"
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")

        if [ "$status" = "200" ]; then
            print_info "Transaction confirmed!"
            return 0
        fi

        echo -n "."
        sleep $interval
    done

    echo ""
    print_info "Transaction not confirmed after $max_attempts attempts"
    return 1
}

# Parse will_id from transaction output or mapping
parse_will_id() {
    local output="$1"
    # Extract will_id field value
    echo "$output" | grep -oE '[0-9]+field' | head -1
}

# Check will status from mapping
check_will_status() {
    local will_id="$1"
    local result=$(query_mapping "$PROGRAM_ID" "will_status" "$will_id")
    echo "$result"
}

# Check total locked amount
check_total_locked() {
    local will_id="$1"
    local result=$(query_mapping "$PROGRAM_ID" "total_locked" "$will_id")
    echo "$result"
}

# Check last check-in block
check_last_checkin() {
    local will_id="$1"
    local result=$(query_mapping "$PROGRAM_ID" "last_check_in" "$will_id")
    echo "$result"
}
