#!/bin/bash

# ============================================================================
# MASTER TEST RUNNER
# Runs all automated tests for Digital Will dApp
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/../.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          DIGITAL WILL - AUTOMATED TEST SUITE                 ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Layer 1: Smart Contract Tests (leo execute)                 ║"
echo "║  Layer 2: Frontend Unit Tests (jest)                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for .env.test
if [ ! -f "$SCRIPT_DIR/.env.test" ]; then
    echo -e "${RED}ERROR: .env.test not found${NC}"
    echo ""
    echo "Please create .env.test with your test wallet keys:"
    echo "  cp $SCRIPT_DIR/.env.test.example $SCRIPT_DIR/.env.test"
    echo "  # Then edit .env.test with your test wallet private key"
    echo ""
    exit 1
fi

# Parse arguments
RUN_LAYER1=true
RUN_LAYER2=true
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --layer1-only)
            RUN_LAYER2=false
            shift
            ;;
        --layer2-only)
            RUN_LAYER1=false
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./run-all.sh [options]"
            echo ""
            echo "Options:"
            echo "  --layer1-only    Run only smart contract tests"
            echo "  --layer2-only    Run only frontend unit tests"
            echo "  --verbose, -v    Show detailed output"
            echo "  --help, -h       Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

LAYER1_RESULT=0
LAYER2_RESULT=0

# ============================================================================
# LAYER 1: Smart Contract Tests
# ============================================================================
if [ "$RUN_LAYER1" = true ]; then
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  LAYER 1: SMART CONTRACT TESTS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

    if bash "$SCRIPT_DIR/test-will-lifecycle.sh"; then
        echo -e "\n${GREEN}✓ Layer 1 tests completed${NC}"
    else
        echo -e "\n${RED}✗ Layer 1 tests had failures${NC}"
        LAYER1_RESULT=1
    fi
fi

# ============================================================================
# LAYER 2: Frontend Unit Tests
# ============================================================================
if [ "$RUN_LAYER2" = true ]; then
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  LAYER 2: FRONTEND UNIT TESTS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

    cd "$ROOT_DIR/frontend"

    if npm test -- --passWithNoTests 2>&1; then
        echo -e "\n${GREEN}✓ Layer 2 tests completed${NC}"
    else
        echo -e "\n${RED}✗ Layer 2 tests had failures${NC}"
        LAYER2_RESULT=1
    fi
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  FINAL SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ "$RUN_LAYER1" = true ]; then
    if [ $LAYER1_RESULT -eq 0 ]; then
        echo -e "  Layer 1 (Contract): ${GREEN}PASSED${NC}"
    else
        echo -e "  Layer 1 (Contract): ${RED}FAILED${NC}"
    fi
fi

if [ "$RUN_LAYER2" = true ]; then
    if [ $LAYER2_RESULT -eq 0 ]; then
        echo -e "  Layer 2 (Frontend): ${GREEN}PASSED${NC}"
    else
        echo -e "  Layer 2 (Frontend): ${RED}FAILED${NC}"
    fi
fi

echo ""

# Exit with failure if any layer failed
if [ $LAYER1_RESULT -ne 0 ] || [ $LAYER2_RESULT -ne 0 ]; then
    exit 1
fi

echo -e "${GREEN}All tests passed!${NC}"
exit 0
