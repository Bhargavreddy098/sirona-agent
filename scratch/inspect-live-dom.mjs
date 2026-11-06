import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';
import fs from 'node:fs';

async function main() {
  console.log('Inspecting live DOM structure for 1:1 React conversion...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  // 1. Main View DOM
  const mainHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
  fs.writeFileSync('scratch/dom-main.html', mainHtml, 'utf8');
  console.log('Saved scratch/dom-main.html (length:', mainHtml.length, ')');

  // 2. Open Model Selector Modal
  const modelTrigger = page.locator('button:has-text("Beam Free")').first();
  if (await modelTrigger.count() > 0) {
    console.log('Clicking model trigger...');
    await modelTrigger.click();
    await page.waitForTimeout(1000);

    const modalHtml = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"], [data-component="select-dialog"], [data-component="dialog"]');
      return dialog ? dialog.outerHTML : document.body.innerHTML;
    });
    fs.writeFileSync('scratch/dom-modal.html', modalHtml, 'utf8');
    console.log('Saved scratch/dom-modal.html (length:', modalHtml.length, ')');

    // Close modal (Escape)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 3. Open Settings
  const settingsBtn = page.locator('[data-action="vertical-tabs-settings"]').first();
  if (await settingsBtn.count() > 0) {
    console.log('Clicking settings button...');
    await settingsBtn.click();
    await page.waitForTimeout(1500);

    const settingsHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
    fs.writeFileSync('scratch/dom-settings.html', settingsHtml, 'utf8');
    console.log('Saved scratch/dom-settings.html (length:', settingsHtml.length, ')');
  }

  await browser.close();
}

main().catch(console.error);
