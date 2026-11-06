import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(2000);

  const styles = await page.evaluate(() => {
    const root = document.getElementById('root');
    const body = document.body;
    const html = document.documentElement;

    return {
      windowInnerHeight: window.innerHeight,
      html: {
        height: window.getComputedStyle(html).height,
        minHeight: window.getComputedStyle(html).minHeight,
        maxHeight: window.getComputedStyle(html).maxHeight,
      },
      body: {
        height: window.getComputedStyle(body).height,
        minHeight: window.getComputedStyle(body).minHeight,
        maxHeight: window.getComputedStyle(body).maxHeight,
        display: window.getComputedStyle(body).display,
      },
      root: {
        height: window.getComputedStyle(root).height,
        minHeight: window.getComputedStyle(root).minHeight,
        maxHeight: window.getComputedStyle(root).maxHeight,
        display: window.getComputedStyle(root).display,
        flexDirection: window.getComputedStyle(root).flexDirection,
        classList: Array.from(root.classList),
      },
      firstRootChild: root.children[0] ? {
        tag: root.children[0].tagName,
        className: root.children[0].className,
        height: window.getComputedStyle(root.children[0]).height,
        flex: window.getComputedStyle(root.children[0]).flex,
        display: window.getComputedStyle(root.children[0]).display,
      } : null
    };
  });

  console.log(JSON.stringify(styles, null, 2));
  await browser.close();
}

main().catch(console.error);
