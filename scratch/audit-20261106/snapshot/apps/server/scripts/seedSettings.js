import { pool } from "../config/db.js";
import { Setting } from "../model/Setting.js";

async function seedSettings() {
  console.log("🌱 Initializing Sirona Default Settings...");

  try {
    await Setting.setMultiple({
      theme: "light",
      interface_mode: "studio",
      default_model: "gemini-2.5-flash",
      default_reasoning_effort: "medium",
      auto_preview: true,
      stream_tokens: true,
      sound_enabled: true,
    });
    console.log("✅ Configured default desktop studio settings in PostgreSQL");
  } catch (err) {
    console.error("❌ Seed error:", err.message);
  } finally {
    await pool.end();
  }
}

seedSettings();
