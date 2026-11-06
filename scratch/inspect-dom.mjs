import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';
import * as fs from 'fs';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.error('[PAGEERROR]:', err));

  await page.goto('http://127.0.0.1:5176', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  const dump = await page.evaluate(() => {
    function inspectElement(el, depth = 0) {
      if (!el || depth > 8) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const isVisible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      return {
        tag: el.tagName,
        id: el.id,
        className: el.className,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        backgroundColor: style.backgroundColor,
        color: style.color,
        childrenCount: el.children.length,
        children: Array.from(el.children).map(c => inspectElement(c, depth + 1))
      };
    }
    const root = document.getElementById('root');
    return {
      bodyStyle: {
        bg: window.getComputedStyle(document.body).backgroundColor,
        color: window.getComputedStyle(document.body).color,
        width: window.getComputedStyle(document.body).width,
        height: window.getComputedStyle(document.body).height,
      },
      htmlStyle: {
        bg: window.getComputedStyle(document.documentElement).backgroundColor,
        theme: document.documentElement.dataset.theme,
        colorScheme: document.documentElement.dataset.colorScheme,
      },
      rootTree: inspectElement(root),
      fullHTML: root ? root.outerHTML : ''
    };
  });

  fs.writeFileSync('scratch/dom-dump.json', JSON.stringify(dump, null, 2));
  console.log('DOM dump written to scratch/dom-dump.json');
  console.log('Body style:', dump.bodyStyle);
  console.log('HTML style:', dump.htmlStyle);
  console.log('Root tree summary:', JSON.stringify({
    tag: dump.rootTree?.tag,
    rect: dump.rootTree?.rect,
    childrenCount: dump.rootTree?.childrenCount,
    childTags: dump.rootTree?.children?.map(c => ({ tag: c.tag, className: c.className, rect: c.rect, display: c.display, childrenCount: c.childrenCount }))
  }, null, 2));

  await browser.close();
}

main().catch(console.error);
