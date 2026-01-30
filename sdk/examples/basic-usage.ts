/**
 * Basic Usage Examples for Digital Will SDK
 *
 * This file demonstrates common usage patterns for the Digital Will SDK.
 * These examples use placeholder implementations and are for reference only.
 */

import {
  DigitalWillClient,
  generateNonce,
  daysToBlocks,
  aleoToMicrocredits,
  formatAleo,
  formatTimeRemaining,
  bpsToPercent,
  WillStatus,
  type WillConfig,
  type Beneficiary,
} from '../src';

/**
 * Example 1: Create a new will
 */
async function createNewWill() {
  console.log('Example 1: Creating a new will\n');

  const client = new DigitalWillClient({
    network: 'testnet',
    // privateKey would be set in production
  });

  // Create will with 30-day check-in period and 7-day grace period
  const { config } = await client.createWill({
    nonce: generateNonce(),
    checkInPeriod: daysToBlocks(30),
    gracePeriod: daysToBlocks(7),
  });

  console.log('Will created successfully!');
  console.log('Will ID:', config.willId);
  console.log('Check-in period:', config.checkInPeriod.toString(), 'blocks');
  console.log('Grace period:', config.gracePeriod.toString(), 'blocks');
  console.log('Total period:', formatTimeRemaining(config.checkInPeriod + config.gracePeriod));

  return config;
}

/**
 * Example 2: Add beneficiaries to a will
 */
async function addBeneficiaries(config: WillConfig) {
  console.log('\nExample 2: Adding beneficiaries\n');

  const client = new DigitalWillClient({ network: 'testnet' });

  // Add first beneficiary with 60% share
  const beneficiary1 = await client.addBeneficiary({
    config,
    beneficiaryAddress: 'aleo1beneficiary1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    shareBps: 6000, // 60%
    priority: 1,
  });

  console.log('Beneficiary 1 added:');
  console.log('  Address:', beneficiary1.beneficiary.owner);
  console.log('  Share:', bpsToPercent(beneficiary1.beneficiary.shareBps) + '%');
  console.log('  Priority:', beneficiary1.beneficiary.priority);

  // Add second beneficiary with 40% share
  const beneficiary2 = await client.addBeneficiary({
    config: beneficiary1.config,
    beneficiaryAddress: 'aleo1beneficiary2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    shareBps: 4000, // 40%
    priority: 2,
  });

  console.log('\nBeneficiary 2 added:');
  console.log('  Address:', beneficiary2.beneficiary.owner);
  console.log('  Share:', bpsToPercent(beneficiary2.beneficiary.shareBps) + '%');
  console.log('  Priority:', beneficiary2.beneficiary.priority);

  console.log('\nTotal allocated:', bpsToPercent(beneficiary2.config.totalSharesBps) + '%');
  console.log('Number of beneficiaries:', beneficiary2.config.numBeneficiaries);

  return {
    config: beneficiary2.config,
    beneficiaries: [beneficiary1.beneficiary, beneficiary2.beneficiary],
  };
}

/**
 * Example 3: Deposit funds into the will
 */
async function depositFunds(config: WillConfig) {
  console.log('\nExample 3: Depositing funds\n');

  const client = new DigitalWillClient({ network: 'testnet' });

  // Deposit 100 ALEO
  const amount = aleoToMicrocredits(100);
  const { lockedCredits } = await client.deposit({
    config,
    amount,
  });

  console.log('Deposit successful!');
  console.log('Amount:', formatAleo(lockedCredits.amount));
  console.log('Depositor:', lockedCredits.depositor);
  console.log('Deposit block:', lockedCredits.depositBlock.toString());

  return lockedCredits;
}

/**
 * Example 4: Check-in to reset the deadline
 */
async function performCheckIn(config: WillConfig) {
  console.log('\nExample 4: Checking in\n');

  const client = new DigitalWillClient({ network: 'testnet' });

  // Regular check-in with WillConfig record
  await client.checkIn({ config });

  console.log('Check-in successful!');
  console.log('Deadline has been reset');

  // Alternative: Backup check-in without record
  console.log('\nAlternative: Backup check-in (without record)');
  await client.checkInBackup({ willId: config.willId });
  console.log('Backup check-in successful!');
}

/**
 * Example 5: Store a secret message
 */
async function storeSecretMessage(config: WillConfig) {
  console.log('\nExample 5: Storing a secret message\n');

  const client = new DigitalWillClient({ network: 'testnet' });

  // Store encrypted message (in practice, you'd encrypt data first)
  const { secret } = await client.storeSecret({
    config,
    recipient: 'aleo1recipient1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    data0: '123field',
    data1: '456field',
    data2: '789field',
    data3: '0field',
    data4: '0field',
    data5: '0field',
    data6: '0field',
    data7: '0field',
    nonce: generateNonce(),
  });

  console.log('Secret stored!');
  console.log('Recipient:', secret.recipient);
  console.log('Will ID:', secret.willId);
}

/**
 * Example 6: Get will status
 */
async function checkWillStatus(willId: string) {
  console.log('\nExample 6: Checking will status\n');

  const client = new DigitalWillClient({ network: 'testnet' });

  const status = await client.getWillStatus(willId);

  console.log('Will Status:');
  console.log('  Status code:', status.status);
  console.log('  Is active:', status.status === WillStatus.ACTIVE);
  console.log('  Last check-in:', status.lastCheckin.toString());
  console.log('  Check-in period:', formatTimeRemaining(status.checkinPeriod));
  console.log('  Grace period:', formatTimeRemaining(status.gracePeriod));
  console.log('  Total locked:', formatAleo(status.totalLocked));
  console.log('  Deadline:', status.deadline.toString());
  console.log('  Time remaining:', formatTimeRemaining(status.blocksUntilDeadline));
  console.log('  Is overdue:', status.isOverdue);
}

/**
 * Example 7: Update check-in period
 */
async function updatePeriod(config: WillConfig) {
  console.log('\nExample 7: Updating check-in period\n');

  const client = new DigitalWillClient({ network: 'testnet' });

  const oldPeriod = config.checkInPeriod;
  const newPeriod = daysToBlocks(60); // Change to 60 days

  const { config: updatedConfig } = await client.updateCheckInPeriod({
    config,
    newPeriod,
  });

  console.log('Check-in period updated!');
  console.log('Old period:', formatTimeRemaining(oldPeriod));
  console.log('New period:', formatTimeRemaining(updatedConfig.checkInPeriod));
}

/**
 * Example 8: Trigger the will (after deadline)
 */
async function triggerWill(willId: string) {
  console.log('\nExample 8: Triggering the will\n');

  const client = new DigitalWillClient({ network: 'testnet' });

  const { bounty } = await client.triggerWill({ willId });

  console.log('Will triggered!');
  console.log('Bounty earned:', formatAleo(bounty.bountyAmount));
  console.log('Triggered at block:', bounty.triggeredAt.toString());
}

/**
 * Example 9: Claim inheritance
 */
async function claimInheritance(
  beneficiary: Beneficiary,
  lockedCredits: any
) {
  console.log('\nExample 9: Claiming inheritance\n');

  const client = new DigitalWillClient({ network: 'testnet' });

  const { claimableShare, claim } = await client.claimInheritance({
    beneficiaryRecord: beneficiary,
    lockedCredits,
  });

  console.log('Inheritance claimed!');
  console.log('Share amount:', formatAleo(claimableShare.amount));
  console.log('Original owner:', claimableShare.originalOwner);
  console.log('Claim deadline:', claimableShare.claimDeadline.toString());
  console.log('Claimed at:', claim.claimedAt.toString());
}

/**
 * Example 10: Emergency recovery
 */
async function emergencyRecovery(config: WillConfig, lockedCredits: any) {
  console.log('\nExample 10: Emergency recovery\n');

  const client = new DigitalWillClient({ network: 'testnet' });

  const { config: reactivatedConfig, recoveredCredits } = await client.emergencyRecovery({
    config,
    lockedCredits,
  });

  console.log('Emergency recovery successful!');
  console.log('Recovered amount:', formatAleo(recoveredCredits.amount));
  console.log('Will reactivated:', reactivatedConfig.isActive);
}

/**
 * Run all examples
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Digital Will SDK - Usage Examples');
  console.log('='.repeat(60));

  try {
    // Example 1: Create will
    const config = await createNewWill();

    // Example 2: Add beneficiaries
    const { config: configWithBeneficiaries, beneficiaries } = await addBeneficiaries(config);

    // Example 3: Deposit funds
    const lockedCredits = await depositFunds(configWithBeneficiaries);

    // Example 4: Check-in
    await performCheckIn(configWithBeneficiaries);

    // Example 5: Store secret
    await storeSecretMessage(configWithBeneficiaries);

    // Example 6: Check status
    await checkWillStatus(configWithBeneficiaries.willId);

    // Example 7: Update period
    await updatePeriod(configWithBeneficiaries);

    // Example 8: Trigger (in practice, wait for deadline)
    // await triggerWill(configWithBeneficiaries.willId);

    // Example 9: Claim (in practice, after trigger)
    // await claimInheritance(beneficiaries[0], lockedCredits);

    // Example 10: Emergency recovery
    // await emergencyRecovery(configWithBeneficiaries, lockedCredits);

    console.log('\n' + '='.repeat(60));
    console.log('All examples completed successfully!');
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
  createNewWill,
  addBeneficiaries,
  depositFunds,
  performCheckIn,
  storeSecretMessage,
  checkWillStatus,
  updatePeriod,
  triggerWill,
  claimInheritance,
  emergencyRecovery,
};
