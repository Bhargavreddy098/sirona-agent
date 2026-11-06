const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "C:\\Users\\bharg\\.gemini\\antigravity\\brain\\a6071d43-d96e-42ea-9653-9bfd7de85d32";

async function main() {
  console.log("Starting provider deletion test with dialog handler...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Automatically accept confirmation dialogs
  page.on("dialog", async (dialog) => {
    console.log("Dialog message:", dialog.message());
    await dialog.accept();
  });

  await page.goto("http://localhost:5178", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Open settings directly by clicking settings in sidebar
  console.log("Opening settings modal...");
  const settingsBtn = page.locator('button:has-text("Settings")').last();
  await settingsBtn.click();
  await page.waitForTimeout(600);

  // Click Providers tab
  console.log("Clicking Providers tab...");
  const providersTab = page.locator('.settings-screen aside button:has-text("Providers")').first();
  await providersTab.click();
  await page.waitForTimeout(600);

  // Check providers list
  let text = await page.locator('.settings-screen').innerText();
  console.log("Providers tab includes Ollama Local before delete?", text.includes("Ollama Local"));

  // Delete all Ollama Local providers
  while (true) {
    const deleteBtns = page.locator('.settings-screen button[title="Remove provider"]');
    const count = await deleteBtns.count();
    // Anthropic and Google are first 2, custom providers start at index 2
    if (count <= 2) break;
    console.log(`Clicking delete on custom provider (total buttons: ${count})...`);
    await deleteBtns.nth(count - 1).click();
    await page.waitForTimeout(800);
  }

  // Take screenshot 6
  const shot6 = path.join(ARTIFACTS_DIR, "react-settings-custom-provider-deleted.png");
  await page.screenshot({ path: shot6 });
  console.log("Saved screenshot 6 to", shot6);

  // Check providers tab now
  text = await page.locator('.settings-screen').innerText();
  console.log("Providers tab includes Ollama Local after cleanup?", text.includes("Ollama Local"));

  // Verify it is removed from models tab as well
  const modelsTab = page.locator('.settings-screen aside button:has-text("Models")').first();
  await modelsTab.click();
  await page.waitForTimeout(600);
  const modelsText = await page.locator('.settings-screen').innerText();
  console.log("Models tab still contains llama3.3?", modelsText.includes("llama3.3"));

  const shot7 = path.join(ARTIFACTS_DIR, "react-settings-models-after-provider-deleted.png");
  await page.screenshot({ path: shot7 });
  console.log("Saved screenshot 7 to", shot7);

  console.log("Provider deletion check completed successfully!");
  await browser.close();
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
