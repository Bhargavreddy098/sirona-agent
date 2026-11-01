import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  console.log('Testing live UI in Chrome...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(2000);

  const stats = await page.evaluate(() => {
    const main = document.querySelector('main');
    const newSession = document.querySelector('[data-component="new-session"]');
    const composer = document.querySelector('[data-slot="new-session-composer"]');
    return {
      title: document.title,
      main: main?.getBoundingClientRect(),
      newSession: newSession?.getBoundingClientRect(),
      composer: composer?.getBoundingClientRect()
    };
  });

  console.log('DOM Evaluation:', JSON.stringify(stats, null, 2));

  await page.screenshot({ path: 'scratch/final-live-verified-ui.png', fullPage: true });
  console.log('Saved screenshot to scratch/final-live-verified-ui.png');

  await browser.close();
}

main().catch(console.error);

