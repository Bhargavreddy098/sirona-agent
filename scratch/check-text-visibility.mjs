import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const aside = document.querySelector('aside');
    const root = document.getElementById('root');
    const body = document.body;
    const composer = document.querySelector('[data-slot="new-session-composer"]');
    const firstTextNode = Array.from(aside?.querySelectorAll('*') || []).find(el => el.children.length === 0 && el.textContent.trim().length > 0);

    return {
      bodyBg: window.getComputedStyle(body).backgroundColor,
      rootBg: window.getComputedStyle(root).backgroundColor,
      asideBg: window.getComputedStyle(aside).backgroundColor,
      asideOpacity: window.getComputedStyle(aside).opacity,
      firstText: firstTextNode?.textContent,
      firstTextColor: firstTextNode ? window.getComputedStyle(firstTextNode).color : null,
      firstTextOpacity: firstTextNode ? window.getComputedStyle(firstTextNode).opacity : null,
      composerRect: composer ? composer.getBoundingClientRect() : null,
      firstTextRect: firstTextNode ? firstTextNode.getBoundingClientRect() : null,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}

main().catch(console.error);

