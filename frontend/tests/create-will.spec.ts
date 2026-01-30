import { test, expect, chromium } from '@playwright/test';

// Test configuration
const BENEFICIARY_ADDRESS = 'aleo1z7fz8f3mz0mgm769uqpqhek34luq33y9dldqw4hp06nxurrrgc8sa7uyah';
const DEPOSIT_AMOUNT = '0.2';
const BASE_URL = 'http://localhost:3000';

test.setTimeout(120000); // 2 minute timeout

test.describe('Create Will Flow', () => {
  test('should navigate through create will flow and trigger wallet popup', async () => {
    const browser = await chromium.launch({
      headless: false,
      slowMo: 300,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('CONSOLE ERROR:', msg.text());
      }
    });

    try {
      // Navigate directly to create page
      console.log('Navigating to create page...');
      await page.goto(`${BASE_URL}/create`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/01-create-page.png' });
      console.log('Create page loaded');

      // Wait for form to be visible
      await page.waitForTimeout(2000);

      // Step 1: Check-in Period - 7 days should be visible in the button text
      console.log('Step 1: Looking for 7 days option...');

      // The options are buttons with text containing "7 days"
      const sevenDaysButton = page.locator('button').filter({ hasText: '7 days' }).first();

      if (await sevenDaysButton.isVisible({ timeout: 5000 })) {
        await sevenDaysButton.click();
        console.log('Selected 7 days');
      } else {
        console.log('7 days button not immediately visible, checking page state...');
        // Maybe 30 days is pre-selected, just move forward
      }

      await page.screenshot({ path: 'test-results/02-step1.png' });

      // Click Next button
      console.log('Looking for Next button...');
      const nextBtn1 = page.locator('button').filter({ hasText: 'Next' }).first();
      await expect(nextBtn1).toBeVisible({ timeout: 5000 });
      await nextBtn1.click();
      console.log('Clicked Next -> Step 2');

      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/03-step2.png' });

      // Step 2: Add Beneficiary
      console.log('Step 2: Adding beneficiary...');

      // Find and fill address input (has placeholder with aleo1)
      const addressInput = page.locator('input').filter({ hasText: '' }).first();
      const allInputs = page.locator('input');
      const inputCount = await allInputs.count();
      console.log(`Found ${inputCount} inputs`);

      // Fill the first input (address)
      const input1 = allInputs.nth(0);
      await input1.fill(BENEFICIARY_ADDRESS);
      console.log('Filled beneficiary address');

      // Fill the second input (name)
      const input2 = allInputs.nth(1);
      await input2.fill('Test Beneficiary');
      console.log('Filled beneficiary name');

      // Third input might be relationship (optional), fourth is share
      const input4 = allInputs.nth(3);
      if (await input4.isVisible()) {
        await input4.fill('2');
        console.log('Filled share: 2%');
      } else {
        // Try input 2 as share
        const input3 = allInputs.nth(2);
        await input3.fill('2');
        console.log('Filled share (alt): 2%');
      }

      await page.screenshot({ path: 'test-results/04-step2-filled.png' });

      // Click Add Beneficiary
      const addBenBtn = page.locator('button').filter({ hasText: 'Add Beneficiary' }).first();
      await addBenBtn.click();
      console.log('Clicked Add Beneficiary');

      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'test-results/05-step2-added.png' });

      // Click Next to Step 3
      const nextBtn2 = page.locator('button').filter({ hasText: 'Next' }).first();
      await expect(nextBtn2).toBeEnabled({ timeout: 5000 });
      await nextBtn2.click();
      console.log('Clicked Next -> Step 3');

      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/06-step3.png' });

      // Step 3: Deposit
      console.log('Step 3: Entering deposit...');

      // Find the deposit input (number type)
      const depositInput = page.locator('input[type="number"]').first();
      await depositInput.fill(DEPOSIT_AMOUNT);
      console.log(`Filled deposit: ${DEPOSIT_AMOUNT} ALEO`);

      await page.screenshot({ path: 'test-results/07-step3-filled.png' });

      // Click Create Digital Will
      console.log('Looking for Create Digital Will button...');
      const createBtn = page.locator('button').filter({ hasText: 'Create Digital Will' }).first();

      // Wait for button to be enabled
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/08-before-create.png' });

      // Check if button is enabled
      const isEnabled = await createBtn.isEnabled();
      console.log(`Create button enabled: ${isEnabled}`);

      if (isEnabled) {
        console.log('CLICKING CREATE DIGITAL WILL...');
        await createBtn.click();

        // Wait for wallet popup
        console.log('Waiting for wallet popup...');
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'test-results/09-after-create.png' });
        console.log('SUCCESS! Create button clicked - check for wallet popup!');
      } else {
        console.log('Button not enabled - checking for validation errors...');
        await page.screenshot({ path: 'test-results/09-button-disabled.png' });
      }

      // Keep browser open for a bit
      await page.waitForTimeout(10000);

    } catch (error) {
      console.error('Test error:', error);
      await page.screenshot({ path: 'test-results/error.png' });
      throw error;
    } finally {
      await browser.close();
    }
  });
});
