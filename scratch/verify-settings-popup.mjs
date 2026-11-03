import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';

async function testUrl(targetUrl, label) {
  console.log(`[Test] Launching Chromium to test ${label} (${targetUrl})...`);
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log(`[Test] Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Verify Main View is present
  await page.waitForSelector('#vertical-tabs-sidebar');
  await page.waitForSelector('main');
  console.log('[Test] Main canvas & sidebar verified!');

  // 2. Open Settings Popup by clicking bottom Settings button
  console.log('[Test] Clicking Settings button in sidebar...');
  const settingsBtn = page.locator('button[aria-label="Settings"]');
  await settingsBtn.click();
  await page.waitForTimeout(500);

  // 3. Verify modal popup is rendered on top of main canvas
  await page.waitForSelector('.settings-screen[role="dialog"]');
  console.log('[Test] Settings popup dialog is rendered!');

  // Confirm main canvas is still mounted in DOM
  const mainCanvasMounted = await page.locator('main').count();
  if (mainCanvasMounted === 0) {
    throw new Error('Expected main canvas to remain mounted behind modal popup!');
  }
  console.log('[Test] Confirmed: Main canvas remains mounted behind the popup!');

  // Capture screenshot of settings popup
  const popupScreenshotPath = resolve(
    `C:/Users/bharg/.gemini/antigravity/brain/a6071d43-d96e-42ea-9653-9bfd7de85d32/react-sirona-settings-popup-${label}.png`
  );
  await page.screenshot({ path: popupScreenshotPath });
  console.log('[Test] Settings popup screenshot saved to', popupScreenshotPath);

  // 4. Test clicking Appearance / General tabs inside the popup
  console.log('[Test] Switching to General tab...');
  const generalTab = page.locator('button:has-text("General")');
  await generalTab.click();
  await page.waitForTimeout(400);

  const generalScreenshotPath = resolve(
    `C:/Users/bharg/.gemini/antigravity/brain/a6071d43-d96e-42ea-9653-9bfd7de85d32/react-sirona-settings-popup-general-${label}.png`
  );
  await page.screenshot({ path: generalScreenshotPath });
  console.log('[Test] General settings popup screenshot saved to', generalScreenshotPath);

  // 5. Test closing via Escape key
  console.log('[Test] Pressing Escape to close popup...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  const isModalVisibleAfterEsc = await page.locator('.settings-screen').count();
  if (isModalVisibleAfterEsc !== 0) {
    throw new Error('Expected modal to close after pressing Escape!');
  }
  console.log('[Test] Verified: Popup closed cleanly with Escape key!');

  // 6. Test opening via Ctrl+, and closing via Close button (X)
  console.log('[Test] Pressing Ctrl+, to open settings popup...');
  await page.keyboard.press('Control+,');
  await page.waitForTimeout(400);
  await page.waitForSelector('.settings-screen');
  console.log('[Test] Verified: Settings opened via Ctrl+,!');

  console.log('[Test] Clicking close button (X)...');
  const closeBtn = page.locator('button[aria-label="Close settings"]');
  await closeBtn.click();
  await page.waitForTimeout(400);

  const isModalVisibleAfterClose = await page.locator('.settings-screen').count();
  if (isModalVisibleAfterClose !== 0) {
    throw new Error('Expected modal to close after clicking X close button!');
  }
  console.log('[Test] Verified: Popup closed cleanly with X button!');

  await browser.close();
  console.log(`[Test] All checks passed for ${label}!`);
}

async function main() {
  // Test both dev server (5178) and desktop server (5176)
  await testUrl('http://127.0.0.1:5178', 'dev');
  await testUrl('http://127.0.0.1:5176', 'prod');
}

main().catch((err) => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});
