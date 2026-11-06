import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    let el = document.querySelector('[data-slot="new-session-composer"]');
    const path = [];
    while (el && el.tagName !== 'BODY') {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      path.push({
        tag: el.tagName,
        class: el.className,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        cssWidth: style.width,
        cssHeight: style.height,
        maxWidth: style.maxWidth
      });
      el = el.parentElement;
    }
    return path;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}

main().catch(console.error);

