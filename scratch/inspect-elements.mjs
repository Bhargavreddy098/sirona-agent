import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(2000);

  const res = await page.evaluate(() => {
    const newSession = document.querySelector('[data-component="new-session"]');
    if (!newSession) return 'NO NEW SESSION ELEMENT';

    const wordmark = document.querySelector('[data-component="new-session-wordmark"]');
    const wordmarkBox = document.querySelector('[data-slot="wordmark-box"]');
    const composerSlot = document.querySelector('[data-slot="new-session-composer"]');
    const parentContainer = wordmark?.parentElement?.parentElement;

    function getBox(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return {
        className: el.className,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w ?? r.width), h: Math.round(r.h ?? r.height) },
        style: {
          display: s.display,
          top: s.top,
          marginTop: s.marginTop,
          maxWidth: s.maxWidth,
          width: s.width,
          height: s.height,
          position: s.position,
          opacity: s.opacity,
          visibility: s.visibility
        }
      };
    }

    return {
      newSession: getBox(newSession),
      parentContainer: getBox(parentContainer),
      wordmark: getBox(wordmark),
      wordmarkBox: getBox(wordmarkBox),
      composerSlot: getBox(composerSlot),
    };
  });

  console.log(JSON.stringify(res, null, 2));
  await browser.close();
}

main().catch(console.error);

