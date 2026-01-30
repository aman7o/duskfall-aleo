/**
 * Advanced Usage Examples for Digital Will SDK
 *
 * Demonstrates advanced patterns and edge cases
 */

import {
  DigitalWillClient,
  generateNonce,
  daysToBlocks,
  blocksToDays,
  aleoToMicrocredits,
  calculateShare,
  percentToBps,
  validateSharesTotal,
  formatAleo,
  formatTimeRemaining,
  type WillConfig,
} from '../src';

/**
 * Example: Complete will lifecycle
 */
async function completeWillLifecycle() {
  console.log('Advanced Example: Complete Will Lifecycle\n');
  console.log('='.repeat(60));

  const client = new DigitalWillClient({ network: 'testnet' });

  // Step 1: Create will
  console.log('\n1. Creating will...');
  const { config: initialConfig } = await client.createWill({
    nonce: generateNonce(),
    checkInPeriod: daysToBlocks(30),
    gracePeriod: daysToBlocks(7),
  });
  console.log('   Will ID:', initialConfig.willId);

  // Step 2: Add multiple beneficiaries with different shares
  console.log('\n2. Adding beneficiaries...');
  const beneficiaryShares = [
    { address: 'aleo1beneficiary1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq', percent: 50, priority: 1 },
    { address: 'aleo1beneficiary2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq', percent: 30, priority: 2 },
    { address: 'aleo1beneficiary3qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq', percent: 20, priority: 3 },
  ];

  let currentConfig = initialConfig;
  const beneficiaryRecords = [];

  for (const beneficiary of beneficiaryShares) {
    const result = await client.addBeneficiary({
      config: currentConfig,
      beneficiaryAddress: beneficiary.address,
      shareBps: percentToBps(beneficiary.percent),
      priority: beneficiary.priority,
    });

    currentConfig = result.config;
    beneficiaryRecords.push(result.beneficiary);

    console.log(`   Added beneficiary ${beneficiary.priority}: ${beneficiary.percent}%`);
  }

  // Verify total shares
  const shares = beneficiaryShares.map(b => percentToBps(b.percent));
  const isValid = validateSharesTotal(shares);
  console.log(`   Total shares valid: ${isValid} (${currentConfig.totalSharesBps / 100}%)`);

  // Step 3: Deposit assets
  console.log('\n3. Depositing assets...');
  const deposits = [
    aleoToMicrocredits(100),
    aleoToMicrocredits(50),
    aleoToMicrocredits(150),
  ];

  const lockedCreditsRecords = [];
  for (let i = 0; i < deposits.length; i++) {
    const result = await client.deposit({
      config: currentConfig,
      amount: deposits[i]!,
    });
    lockedCreditsRecords.push(result.lockedCredits);
    console.log(`   Deposit ${i + 1}: ${formatAleo(deposits[i]!)}`);
  }

  const totalDeposited = deposits.reduce((sum, amount) => sum + amount, 0n);
  console.log(`   Total deposited: ${formatAleo(totalDeposited)}`);

  // Step 4: Store secrets for each beneficiary
  console.log('\n4. Storing secret messages...');
  for (let i = 0; i < beneficiaryRecords.length; i++) {
    await client.storeSecret({
      config: currentConfig,
      recipient: beneficiaryRecords[i]!.owner,
      data0: `${1000 + i}field`,
      data1: `${2000 + i}field`,
      data2: '0field',
      data3: '0field',
      data4: '0field',
      data5: '0field',
      data6: '0field',
      data7: '0field',
      nonce: generateNonce(),
    });
    console.log(`   Secret stored for beneficiary ${i + 1}`);
  }

  // Step 5: Perform several check-ins
  console.log('\n5. Performing check-ins...');
  for (let i = 0; i < 3; i++) {
    await client.checkIn({ config: currentConfig });
    console.log(`   Check-in ${i + 1} completed`);
  }

  // Step 6: Update check-in period
  console.log('\n6. Updating check-in period...');
  const oldPeriod = currentConfig.checkInPeriod;
  const { config: updatedConfig } = await client.updateCheckInPeriod({
    config: currentConfig,
    newPeriod: daysToBlocks(45),
  });
  console.log(`   Changed from ${blocksToDays(oldPeriod)} to ${blocksToDays(updatedConfig.checkInPeriod)} days`);

  currentConfig = updatedConfig;

  // Step 7: Get current status
  console.log('\n7. Checking will status...');
  const status = await client.getWillStatus(currentConfig.willId);
  console.log(`   Status: Active`);
  console.log(`   Last check-in: Block ${status.lastCheckin}`);
  console.log(`   Time remaining: ${formatTimeRemaining(status.blocksUntilDeadline)}`);
  console.log(`   Is overdue: ${status.isOverdue}`);

  console.log('\n' + '='.repeat(60));
  console.log('Will lifecycle setup complete!');

  return {
    config: currentConfig,
    beneficiaries: beneficiaryRecords,
    lockedCredits: lockedCreditsRecords,
    totalDeposited,
  };
}

/**
 * Example: Share calculation and distribution
 */
async function demonstrateShareCalculation() {
  console.log('\n\nAdvanced Example: Share Calculation\n');
  console.log('='.repeat(60));

  const totalAmount = aleoToMicrocredits(1000); // 1000 ALEO
  console.log(`Total amount: ${formatAleo(totalAmount)}\n`);

  const beneficiaries = [
    { name: 'Spouse', percent: 50 },
    { name: 'Child 1', percent: 25 },
    { name: 'Child 2', percent: 15 },
    { name: 'Charity', percent: 10 },
  ];

  console.log('Distribution:');
  for (const beneficiary of beneficiaries) {
    const bps = percentToBps(beneficiary.percent);
    const share = calculateShare(totalAmount, bps);
    console.log(`  ${beneficiary.name.padEnd(10)}: ${beneficiary.percent}% = ${formatAleo(share)}`);
  }

  // Verify no rounding errors
  const totalBps = beneficiaries.reduce((sum, b) => sum + percentToBps(b.percent), 0);
  const isValid = validateSharesTotal(beneficiaries.map(b => percentToBps(b.percent)));

  console.log(`\nTotal shares: ${totalBps / 100}%`);
  console.log(`Shares valid: ${isValid}`);
}

/**
 * Example: Revoke and replace beneficiary
 */
async function revokeBeneficiary() {
  console.log('\n\nAdvanced Example: Revoke and Replace Beneficiary\n');
  console.log('='.repeat(60));

  const client = new DigitalWillClient({ network: 'testnet' });

  // Create will and add beneficiaries
  const { config: initialConfig } = await client.createWill({
    nonce: generateNonce(),
    checkInPeriod: daysToBlocks(30),
    gracePeriod: daysToBlocks(7),
  });

  console.log('\n1. Adding initial beneficiaries...');
  let currentConfig = initialConfig;

  const ben1 = await client.addBeneficiary({
    config: currentConfig,
    beneficiaryAddress: 'aleo1beneficiary1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    shareBps: 5000,
    priority: 1,
  });
  currentConfig = ben1.config;
  console.log('   Added Beneficiary 1: 50%');

  const ben2 = await client.addBeneficiary({
    config: currentConfig,
    beneficiaryAddress: 'aleo1beneficiary2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    shareBps: 5000,
    priority: 2,
  });
  currentConfig = ben2.config;
  console.log('   Added Beneficiary 2: 50%');
  console.log(`   Total: ${currentConfig.numBeneficiaries} beneficiaries, ${currentConfig.totalSharesBps / 100}%`);

  // Revoke beneficiary 2
  console.log('\n2. Revoking Beneficiary 2...');
  const revokeResult = await client.revokeBeneficiary({
    config: currentConfig,
    beneficiaryRecord: ben2.beneficiary,
  });
  currentConfig = revokeResult.config;
  console.log('   Revoked Beneficiary 2');
  console.log(`   New total: ${currentConfig.numBeneficiaries} beneficiaries, ${currentConfig.totalSharesBps / 100}%`);

  // Add replacement beneficiary
  console.log('\n3. Adding replacement beneficiary...');
  const ben3 = await client.addBeneficiary({
    config: currentConfig,
    beneficiaryAddress: 'aleo1beneficiary3qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    shareBps: 3000,
    priority: 2,
  });
  currentConfig = ben3.config;
  console.log('   Added Beneficiary 3: 30%');

  // Add fourth beneficiary with remaining share
  const ben4 = await client.addBeneficiary({
    config: currentConfig,
    beneficiaryAddress: 'aleo1beneficiary4qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    shareBps: 2000,
    priority: 3,
  });
  currentConfig = ben4.config;
  console.log('   Added Beneficiary 4: 20%');

  console.log(`\nFinal state: ${currentConfig.numBeneficiaries} beneficiaries, ${currentConfig.totalSharesBps / 100}%`);
  console.log('Distribution:');
  console.log('  Beneficiary 1: 50%');
  console.log('  Beneficiary 3: 30%');
  console.log('  Beneficiary 4: 20%');
}

/**
 * Example: Time-based operations
 */
async function demonstrateTimeOperations() {
  console.log('\n\nAdvanced Example: Time-Based Operations\n');
  console.log('='.repeat(60));

  const periods = [
    { name: 'Daily', days: 1 },
    { name: 'Weekly', days: 7 },
    { name: 'Monthly', days: 30 },
    { name: 'Quarterly', days: 90 },
    { name: 'Semi-Annual', days: 180 },
    { name: 'Annual', days: 365 },
  ];

  console.log('\nCheck-in Period Conversions:');
  console.log('Period'.padEnd(15) + 'Days'.padEnd(8) + 'Blocks'.padEnd(12) + 'Display');
  console.log('-'.repeat(60));

  for (const period of periods) {
    const blocks = daysToBlocks(period.days);
    const formatted = formatTimeRemaining(blocks);
    console.log(
      period.name.padEnd(15) +
      period.days.toString().padEnd(8) +
      blocks.toString().padEnd(12) +
      formatted
    );
  }

  // Demonstrate deadline calculation
  console.log('\n\nDeadline Calculation Example:');
  const checkInPeriod = daysToBlocks(30);
  const gracePeriod = daysToBlocks(7);
  const totalPeriod = checkInPeriod + gracePeriod;

  console.log(`Check-in period: ${formatTimeRemaining(checkInPeriod)}`);
  console.log(`Grace period:    ${formatTimeRemaining(gracePeriod)}`);
  console.log(`Total deadline:  ${formatTimeRemaining(totalPeriod)}`);
}

/**
 * Example: Error handling patterns
 */
async function demonstrateErrorHandling() {
  console.log('\n\nAdvanced Example: Error Handling\n');
  console.log('='.repeat(60));

  const client = new DigitalWillClient({ network: 'testnet' });

  const { config } = await client.createWill({
    nonce: generateNonce(),
    checkInPeriod: daysToBlocks(30),
    gracePeriod: daysToBlocks(7),
  });

  // Error 1: Invalid share percentage
  console.log('\n1. Testing invalid share percentage...');
  try {
    await client.addBeneficiary({
      config,
      beneficiaryAddress: 'aleo1test1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
      shareBps: 15000, // > 10000
      priority: 1,
    });
  } catch (error) {
    console.log('   Error caught:', error instanceof Error ? error.message : error);
  }

  // Error 2: Exceeding 100% allocation
  console.log('\n2. Testing exceeding 100% allocation...');
  const { config: config1 } = await client.addBeneficiary({
    config,
    beneficiaryAddress: 'aleo1test2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    shareBps: 8000,
    priority: 1,
  });

  try {
    await client.addBeneficiary({
      config: config1,
      beneficiaryAddress: 'aleo1test3qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
      shareBps: 5000, // Would total 130%
      priority: 2,
    });
  } catch (error) {
    console.log('   Error caught:', error instanceof Error ? error.message : error);
  }

  // Error 3: Invalid check-in period
  console.log('\n3. Testing invalid check-in period...');
  try {
    await client.createWill({
      nonce: generateNonce(),
      checkInPeriod: daysToBlocks(0.5), // Too short
      gracePeriod: daysToBlocks(7),
    });
  } catch (error) {
    console.log('   Error caught:', error instanceof Error ? error.message : error);
  }

  console.log('\nAll error cases handled correctly!');
}

/**
 * Run all advanced examples
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Digital Will SDK - Advanced Usage Examples');
  console.log('='.repeat(60));

  try {
    await completeWillLifecycle();
    await demonstrateShareCalculation();
    await revokeBeneficiary();
    await demonstrateTimeOperations();
    await demonstrateErrorHandling();

    console.log('\n' + '='.repeat(60));
    console.log('All advanced examples completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  completeWillLifecycle,
  demonstrateShareCalculation,
  revokeBeneficiary,
  demonstrateTimeOperations,
  demonstrateErrorHandling,
};
