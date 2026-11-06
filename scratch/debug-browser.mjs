import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  console.log('Launching browser to inspect http://127.0.0.1:5176 ...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('[BROWSER UNCAUGHT ERROR]:', err);
  });

  page.on('requestfailed', req => {
    console.warn('[BROWSER REQUEST FAILED]:', req.url(), req.failure()?.errorText);
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      console.warn(`[BROWSER HTTP ${res.status()}]:`, res.url());
    }
  });

  try {
    const response = await page.goto('http://127.0.0.1:5176', { waitUntil: 'load', timeout: 10000 });
    console.log('Navigation completed. HTTP Status:', response?.status());
    
    // Wait a bit for React/JS hydration and any runtime execution errors
    await page.waitForTimeout(3000);

    const rootHTML = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        rootInnerHTML: root ? root.innerHTML.slice(0, 500) : 'NO ROOT ELEMENT',
        title: document.title,
        bodyClass: document.body.className
      };
    });

    console.log('Page Evaluation Result:', JSON.stringify(rootHTML, null, 2));

    await page.screenshot({ path: 'scratch/browser-screenshot.png', fullPage: true });
    console.log('Screenshot saved to scratch/browser-screenshot.png');

  } catch (err) {
    console.error('Error during navigation:', err);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
