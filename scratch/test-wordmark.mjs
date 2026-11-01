import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 800, height: 300 } });
  await page.setContent(`
    <html>
      <body style="background: #fafafa; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="width: 500px; height: 90px;">
          <svg viewBox="0 0 234 42" fill="none" style="display: block; width: 100%; height: 100%;">
            <text
              x="117"
              y="28"
              text-anchor="middle"
              fill="#222"
              opacity="0.18"
              style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: 0.32em;"
            >SIRONA</text>
          </svg>
        </div>
      </body>
    </html>
  `);
  await page.screenshot({ path: 'scratch/test-sirona-wordmark.png' });
  console.log('Saved scratch/test-sirona-wordmark.png');
  await browser.close();
}

main().catch(console.error);
