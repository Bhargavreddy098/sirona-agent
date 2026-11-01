import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(2000);

  const info = await page.evaluate(() => {
    const root = document.getElementById('root');
    const url = window.location.href;
    
    // Find all panels/slots in main area
    const mainSlot = document.querySelector('main') || document.querySelector('[data-slot="session-chat-panel"]') || document.querySelector('[data-component="session-view"]') || root;

    function getElementSummary(el, depth = 0) {
      if (!el || depth > 4) return null;
      return {
        tag: el.tagName,
        slot: el.getAttribute('data-slot'),
        component: el.getAttribute('data-component'),
        className: el.className,
        rect: {
          y: Math.round(el.getBoundingClientRect().y),
          height: Math.round(el.getBoundingClientRect().height)
        },
        children: Array.from(el.children).map(c => getElementSummary(c, depth + 1))
      };
    }

    return {
      url,
      structure: getElementSummary(mainSlot)
    };
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}

main().catch(console.error);

