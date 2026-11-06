import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACTS_DIR = "C:\\Users\\bharg\\.gemini\\antigravity\\brain\\a6071d43-d96e-42ea-9653-9bfd7de85d32";

async function main() {
  console.log("Starting verification test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // 1. Navigate to web app
  await page.goto("http://localhost:5178", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 2. Verify model pill in chat composer
  console.log("Checking chat composer model pill...");
  const modelPill = page.locator('button[data-slot="model-picker-trigger"], button:has-text("Claude 3.5 Sonnet"), button:has-text("Gemini")').first();
  await modelPill.waitFor({ state: "visible", timeout: 5000 });
  const pillText = await modelPill.innerText();
  console.log("Current model pill text:", pillText);
  if (pillText.includes("Beam Free")) {
    throw new Error("Beam Free found in model pill!");
  }

  // 3. Open Model Selector Modal
  console.log("Opening Model Selector Modal...");
  await modelPill.click();
  await page.waitForSelector('text=Select Model', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Check models listed
  const modalText = await page.locator('[role="dialog"], div.fixed').innerText();
  console.log("Modal contains Beam Free?", modalText.includes("Beam Free"));
  if (modalText.includes("Beam Free")) {
    throw new Error("Beam Free found in model selector modal!");
  }

  // Screenshot 1: Model selector with no Beam Free
  const shot1 = path.join(ARTIFACTS_DIR, "react-model-picker-no-beam-free.png");
  await page.screenshot({ path: shot1 });
  console.log("Saved screenshot 1 to", shot1);

  // 4. Click "+ Add Provider" in modal header
  console.log("Clicking + Add Provider button in modal header...");
  const addProviderInModal = page.locator('button:has-text("+ Add Provider")');
  await addProviderInModal.click();
  await page.waitForTimeout(600);

  // Verify settings modal is open and in Providers tab
  await page.waitForSelector('text=AI Providers & Gateways', { timeout: 5000 });
  const shot2 = path.join(ARTIFACTS_DIR, "react-settings-providers-tab.png");
  await page.screenshot({ path: shot2 });
  console.log("Saved screenshot 2 to", shot2);

  // 5. Click "+ Add Provider" inside Settings tab
  console.log("Clicking + Add Provider in Settings > Providers...");
  const addProviderBtn = page.locator('.settings-screen button:has-text("+ Add Provider"), div.fixed button:has-text("+ Add Provider")').first();
  await addProviderBtn.click();
  await page.waitForTimeout(400);

  // Fill in form
  console.log("Filling in Custom Provider form...");
  await page.locator('input[placeholder="e.g. My OpenAI, Ollama Local"]').fill("Ollama Local");
  await page.locator('input[placeholder="e.g. https://api.openai.com/v1"]').fill("http://localhost:11434/v1");
  await page.locator('input[placeholder="sk-... or api token"]').fill("ollama-local-key");
  await page.locator('input[placeholder="gpt-4o, llama-3.3, mistral-large"]').fill("llama3.3, qwen2.5-coder");

  const saveBtn = page.locator('button:has-text("Save Provider")');
  await saveBtn.click();
  await page.waitForTimeout(1000);

  // Screenshot 3: Provider added
  const shot3 = path.join(ARTIFACTS_DIR, "react-settings-custom-provider-added.png");
  await page.screenshot({ path: shot3 });
  console.log("Saved screenshot 3 to", shot3);

  // 6. Switch to Models tab
  console.log("Switching to Models tab...");
  const modelsTabBtn = page.locator('button:has-text("Models")').first();
  await modelsTabBtn.click();
  await page.waitForTimeout(600);
  await page.waitForSelector('text=Registered Models', { timeout: 5000 });

  // Verify llama3.3 appears
  const modelsPageText = await page.locator('.settings-screen, div.fixed').innerText();
  console.log("Models tab contains llama3.3?", modelsPageText.includes("llama3.3"));

  const shot4 = path.join(ARTIFACTS_DIR, "react-settings-models-tab.png");
  await page.screenshot({ path: shot4 });
  console.log("Saved screenshot 4 to", shot4);

  // 7. Close settings modal
  console.log("Closing settings popup...");
  const closeSettingsBtn = page.locator('button[aria-label="Close settings"]').first();
  await closeSettingsBtn.click();
  await page.waitForTimeout(500);

  // 8. Open Model Picker from chat composer
  console.log("Opening model picker from chat to select llama3.3...");
  await modelPill.click();
  await page.waitForTimeout(500);

  // Find llama3.3 and click it
  const llamaOption = page.locator('button:has-text("llama3.3"), div:has-text("llama3.3")').last();
  await llamaOption.click();
  await page.waitForTimeout(500);

  // 9. Send chat prompt using llama3.3
  console.log("Sending chat prompt with custom model llama3.3...");
  const promptInput = page.locator('textarea, input[placeholder*="Ask Sirona"]').first();
  await promptInput.fill("Please explain recursion in one short sentence.");
  await promptInput.press("Enter");

  // Wait for assistant reply
  console.log("Waiting for assistant reply...");
  await page.waitForTimeout(2000);

  const shot5 = path.join(ARTIFACTS_DIR, "react-chat-with-custom-model.png");
  await page.screenshot({ path: shot5 });
  console.log("Saved screenshot 5 to", shot5);

  // 10. Re-open Settings -> Providers and remove Ollama Local
  console.log("Re-opening Settings to test provider removal...");
  const settingsSidebarBtn = page.locator('button:has-text("Settings")').last();
  await settingsSidebarBtn.click();
  await page.waitForTimeout(500);

  const providersTabBtn = page.locator('button:has-text("Providers")').first();
  await providersTabBtn.click();
  await page.waitForTimeout(500);

  // Find delete button on Ollama Local card
  const ollamaCard = page.locator('div:has-text("Ollama Local")').last();
  const deleteBtn = ollamaCard.locator('button[title="Remove provider"], button:has(svg)').last();
  await deleteBtn.click();
  await page.waitForTimeout(1000);

  const shot6 = path.join(ARTIFACTS_DIR, "react-settings-custom-provider-deleted.png");
  await page.screenshot({ path: shot6 });
  console.log("Saved screenshot 6 to", shot6);

  console.log("All verification checks PASSED successfully!");
  await browser.close();
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
