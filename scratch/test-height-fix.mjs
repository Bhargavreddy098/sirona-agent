import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(2000);

  // Apply height: 100vh to html, body, and #root
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'debug-height-fix';
    style.textContent = `
      html, body {
        height: 100% !important;
        min-height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #root {
        height: 100vh !important;
        min-height: 100vh !important;
        width: 100vw !important;
      }
    `;
    document.head.appendChild(style);
  });

  await page.waitForTimeout(1000);

  const rects = await page.evaluate(() => {
    const root = document.getElementById('root');
    const child = root?.children[0];
    return {
      root: root ? root.getBoundingClientRect() : null,
      child: child ? {
        tag: child.tagName,
        className: child.className,
        rect: child.getBoundingClientRect(),
        children: Array.from(child.children).map(c => ({
          tag: c.tagName,
          rect: c.getBoundingClientRect(),
          className: c.className
        }))
      } : null
    };
  });

  console.log('With 100vh fix:', JSON.stringify(rects, null, 2));

  await page.screenshot({ path: 'scratch/screenshot-with-height-fix.png', fullPage: true });
  console.log('Saved screenshot to scratch/screenshot-with-height-fix.png');

  await browser.close();
}

main().catch(console.error);
