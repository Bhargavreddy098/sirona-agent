import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(1500);

  const rects = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return 'NO MAIN';

    // Fix main and descendants
    main.style.alignItems = 'stretch';
    main.style.width = '100%';
    main.style.height = '100%';

    let child = main.firstElementChild;
    while (child) {
      child.style.width = '100%';
      child.style.height = '100%';
      child.style.flex = '1 1 0%';
      child = child.firstElementChild;
    }

    const newSession = document.querySelector('[data-component="new-session"]');
    if (newSession) {
      newSession.style.width = '100%';
      newSession.style.height = '100%';
      newSession.style.display = 'flex';
      newSession.style.flexDirection = 'column';
      newSession.style.alignItems = 'center';
      newSession.style.justifyContent = 'center';
      newSession.style.padding = '40px 24px';
    }

    const parentDiv = newSession?.querySelector('.absolute.inset-x-0');
    if (parentDiv) {
      parentDiv.style.position = 'relative';
      parentDiv.style.top = '0';
      parentDiv.style.width = '100%';
      parentDiv.style.maxWidth = '760px';
      parentDiv.style.display = 'flex';
      parentDiv.style.flexDirection = 'column';
      parentDiv.style.alignItems = 'center';
      parentDiv.style.padding = '0';

      const content = parentDiv.firstElementChild;
      if (content) {
        content.style.width = '100%';
        content.style.maxWidth = '760px';
      }

      // Add a clean Sirona title
      let h = document.getElementById('test-title');
      if (!h) {
        h = document.createElement('div');
        h.id = 'test-title';
        h.style.textAlign = 'center';
        h.style.marginBottom = '24px';
        h.innerHTML = `
          <h1 style="font-size:28px; font-weight:600; letter-spacing:-0.03em; color:var(--v2-text-text-base, #1c1c1c); margin:0 0 6px 0;">Sirona</h1>
          <p style="font-size:14px; color:var(--v2-text-text-muted, #737373); margin:0;">What would you like to build or solve?</p>
        `;
        parentDiv.insertBefore(h, parentDiv.firstChild);
      }
    }

    return {
      main: main.getBoundingClientRect(),
      newSession: newSession?.getBoundingClientRect(),
      parentDiv: parentDiv?.getBoundingClientRect()
    };
  });

  console.log('Result:', JSON.stringify(rects, null, 2));

  await page.screenshot({ path: 'scratch/full-canvas-centered.png', fullPage: true });
  console.log('Saved screenshot to scratch/full-canvas-centered.png');

  await browser.close();
}

main().catch(console.error);

