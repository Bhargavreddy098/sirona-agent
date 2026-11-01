import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    let el = document.querySelector('[data-component="new-session"]');
    const res = [];
    while (el && el.tagName !== 'BODY') {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      res.push({
        tag: el.tagName,
        cls: el.className,
        display: s.display,
        flex: s.flex,
        flexDirection: s.flexDirection,
        height: s.height,
        rectH: Math.round(r.height),
        rectW: Math.round(r.width)
      });
      el = el.parentElement;
    }
    return res;
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}

main().catch(console.error);

