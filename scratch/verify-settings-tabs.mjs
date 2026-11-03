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

  console.log('[Test] Navigating to http://127.0.0.1:5178...');
  await page.goto('http://127.0.0.1:5178', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Open settings
  console.log('[Test] Opening settings...');
  const settingsBtn = page.locator('button[aria-label="Settings"]');
  await settingsBtn.click();
  await page.waitForSelector('.settings-screen');

  // Test Servers tab
  console.log('[Test] Testing Servers tab...');
  const serversTab = page.locator('button:has-text("Servers")');
  await serversTab.click();
  await page.waitForTimeout(800);

  const serversScreenshotPath = resolve(
    'C:/Users/bharg/.gemini/antigravity/brain/a6071d43-d96e-42ea-9653-9bfd7de85d32/react-sirona-settings-servers.png'
  );
  await page.screenshot({ path: serversScreenshotPath });
  console.log('[Test] Servers screenshot saved to', serversScreenshotPath);

  // Test Extensions / Tools tab
  console.log('[Test] Testing Extensions tab...');
  const extTab = page.locator('.settings-screen aside button:has-text("Extensions")');
  await extTab.scrollIntoViewIfNeeded();
  await extTab.click();
  await page.waitForTimeout(800);

  const extScreenshotPath = resolve(
    'C:/Users/bharg/.gemini/antigravity/brain/a6071d43-d96e-42ea-9653-9bfd7de85d32/react-sirona-settings-extensions.png'
  );
  await page.screenshot({ path: extScreenshotPath });
  console.log('[Test] Extensions screenshot saved to', extScreenshotPath);

  // Test Projects tab
  console.log('[Test] Testing Projects tab...');
  const projTab = page.locator('.settings-screen aside button:has-text("Projects")');
  await projTab.scrollIntoViewIfNeeded();
  await projTab.click();
  await page.waitForTimeout(800);

  const projScreenshotPath = resolve(
    'C:/Users/bharg/.gemini/antigravity/brain/a6071d43-d96e-42ea-9653-9bfd7de85d32/react-sirona-settings-projects.png'
  );
  await page.screenshot({ path: projScreenshotPath });
  console.log('[Test] Projects screenshot saved to', projScreenshotPath);

  await browser.close();
  console.log('[Test] All settings tab tests passed cleanly!');
}

main().catch((err) => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});
