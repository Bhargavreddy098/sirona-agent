import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const rects = await page.evaluate(() => {
    const sidebar = document.querySelector('aside');
    const main = document.querySelector('main');
    const composer = document.querySelector('[data-slot="new-session-composer"]');
    const root = document.getElementById('root');
    return {
      sidebar: sidebar ? sidebar.getBoundingClientRect() : null,
      main: main ? main.getBoundingClientRect() : null,
      composer: composer ? composer.getBoundingClientRect() : null,
      root: root ? root.getBoundingClientRect() : null
    };
  });
  console.log(JSON.stringify(rects, null, 2));
  await page.screenshot({ path: 'scratch/actual-live-reverted-ui.png' });
  console.log('Saved scratch/actual-live-reverted-ui.png');
  await browser.close();
}

main().catch(console.error);

