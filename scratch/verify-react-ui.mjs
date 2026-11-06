import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('[Test] Navigating to http://127.0.0.1:5176...');
  await page.goto('http://127.0.0.1:5176', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Main View
  await page.waitForSelector('#vertical-tabs-sidebar');
  const mainScreenshotPath = resolve('C:/Users/bharg/.gemini/antigravity/brain/a6071d43-d96e-42ea-9653-9bfd7de85d32/react-sirona-main.png');
  await page.screenshot({ path: mainScreenshotPath });
  console.log('[Test] Main screenshot saved to', mainScreenshotPath);

  // 2. Open Settings View
  console.log('[Test] Opening settings view...');
  const settingsBtn = page.locator('button[aria-label="Settings"]');
  await settingsBtn.click();
  await page.waitForSelector('.settings-screen');

  const settingsScreenshotPath = resolve('C:/Users/bharg/.gemini/antigravity/brain/a6071d43-d96e-42ea-9653-9bfd7de85d32/react-sirona-settings.png');
  await page.screenshot({ path: settingsScreenshotPath });
  console.log('[Test] Settings screenshot saved to', settingsScreenshotPath);

  // 3. Click General tab in Settings
  console.log('[Test] Clicking General tab in settings...');
  const generalTab = page.locator('button:has-text("General")');
  await generalTab.click();
  await page.waitForTimeout(500);

  const generalScreenshotPath = resolve('C:/Users/bharg/.gemini/antigravity/brain/a6071d43-d96e-42ea-9653-9bfd7de85d32/react-sirona-settings-general.png');
  await page.screenshot({ path: generalScreenshotPath });
  console.log('[Test] General settings screenshot saved to', generalScreenshotPath);

  // 4. Click Back to app
  console.log('[Test] Clicking Back to app...');
  const backBtn = page.locator('button:has-text("Back to app")');
  await backBtn.click();
  await page.waitForSelector('#vertical-tabs-sidebar');
  console.log('[Test] Returned to main canvas!');

  await browser.close();
  console.log('[Test] All verifications passed successfully!');
}

main().catch((err) => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});
