import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  console.log('Verifying clean start at http://127.0.0.1:5176 ...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.error('[BROWSER ERROR]:', err));

  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(2500);

  const check = await page.evaluate(() => {
    const root = document.getElementById('root');
    const child = root?.children[0];
    return {
      title: document.title,
      htmlHeight: window.getComputedStyle(document.documentElement).height,
      bodyHeight: window.getComputedStyle(document.body).height,
      rootRect: root ? root.getBoundingClientRect() : null,
      childRect: child ? child.getBoundingClientRect() : null,
      hasContent: (root?.innerText || '').length > 0
    };
  });

  console.log('Verification evaluation:', JSON.stringify(check, null, 2));

  await page.screenshot({ path: 'scratch/clean-verified-screenshot.png', fullPage: true });
  console.log('Verified screenshot saved to scratch/clean-verified-screenshot.png');

  await browser.close();
}

main().catch(console.error);

