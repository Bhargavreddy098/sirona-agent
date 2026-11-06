import { chromium } from '../node_modules/.pnpm/playwright@1.60.0/node_modules/playwright/index.mjs';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5176', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(2000);

  // Let's inspect applying the centered layout to new-session
  await page.evaluate(() => {
    const newSession = document.querySelector('[data-component="new-session"]');
    if (!newSession) return;

    // Apply proper centering styles
    newSession.style.display = 'flex';
    newSession.style.flexDirection = 'column';
    newSession.style.alignItems = 'center';
    newSession.style.justifyContent = 'center';
    newSession.style.width = '100%';
    newSession.style.height = '100%';
    newSession.style.padding = '32px 24px';
    newSession.style.overflow = 'auto';

    const parentDiv = newSession.querySelector('.absolute.inset-x-0');
    if (parentDiv) {
      parentDiv.style.position = 'relative';
      parentDiv.style.top = '0';
      parentDiv.style.width = '100%';
      parentDiv.style.maxWidth = '780px';
      parentDiv.style.display = 'flex';
      parentDiv.style.flexDirection = 'column';
      parentDiv.style.alignItems = 'center';
      parentDiv.style.padding = '0';
      
      const content = parentDiv.firstElementChild;
      if (content) {
        content.style.width = '100%';
        content.style.maxWidth = '780px';
      }
    }

    // Insert Sirona Header if not present
    let header = document.getElementById('sirona-hero-header');
    if (!header && parentDiv) {
      header = document.createElement('div');
      header.id = 'sirona-hero-header';
      header.style.textAlign = 'center';
      header.style.marginBottom = '28px';
      header.style.display = 'flex';
      header.style.flexDirection = 'column';
      header.style.alignItems = 'center';
      header.style.gap = '8px';
      header.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--v2-text-text-base, #111);">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="m4.93 4.93 1.41 1.41"></path>
            <path d="m17.66 17.66 1.41 1.41"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="m6.34 17.66-1.41 1.41"></path>
            <path d="m19.07 4.93-1.41 1.41"></path>
          </svg>
          <span style="font-size:26px; font-weight:600; letter-spacing:-0.03em; color:var(--v2-text-text-base, #111);">Sirona Studio</span>
        </div>
        <p style="font-size:13px; color:var(--v2-text-text-muted, #777); margin:0;">Autonomous developer agent & local workspace</p>
      `;
      parentDiv.insertBefore(header, parentDiv.firstChild);
    }

    // Add quick suggestions below
    let chips = document.getElementById('sirona-quick-chips');
    if (!chips && parentDiv) {
      chips = document.createElement('div');
      chips.id = 'sirona-quick-chips';
      chips.style.display = 'flex';
      chips.style.flexWrap = 'wrap';
      chips.style.justifyContent = 'center';
      chips.style.gap = '8px';
      chips.style.marginTop = '20px';
      chips.innerHTML = `
        <span style="font-size:12px; padding:6px 12px; border-radius:6px; background:rgba(0,0,0,0.04); color:var(--v2-text-text-muted,#666); cursor:pointer;">🔍 Explore codebase</span>
        <span style="font-size:12px; padding:6px 12px; border-radius:6px; background:rgba(0,0,0,0.04); color:var(--v2-text-text-muted,#666); cursor:pointer;">⚡ Plan new feature</span>
        <span style="font-size:12px; padding:6px 12px; border-radius:6px; background:rgba(0,0,0,0.04); color:var(--v2-text-text-muted,#666); cursor:pointer;">🧪 Run tests and verify</span>
        <span style="font-size:12px; padding:6px 12px; border-radius:6px; background:rgba(0,0,0,0.04); color:var(--v2-text-text-muted,#666); cursor:pointer;">🛠️ Review recent git changes</span>
      `;
      parentDiv.appendChild(chips);
    }
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/centered-ui-screenshot.png', fullPage: true });
  console.log('Saved centered UI screenshot to scratch/centered-ui-screenshot.png');

  await browser.close();
}

main().catch(console.error);

