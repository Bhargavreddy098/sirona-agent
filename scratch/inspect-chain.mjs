import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(2000);

  const chain = await page.evaluate(() => {
    let el = document.querySelector('[data-component="new-session"]');
    const list = [];
    while (el) {
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      list.push({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        display: s.display,
        flex: s.flex,
        height: s.height,
        width: s.width
      });
      el = el.parentElement;
    }
    return list;
  });

  console.log(JSON.stringify(chain, null, 2));
  await browser.close();
}

main().catch(console.error);

