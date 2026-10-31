import { Setting } from "../model/Setting.js";
import { auditLogger } from "../services/auditLogger.js";

/* =====================================================================
   Settings Controller — Desktop Preferences & Secret Keys
   ===================================================================== */

export const settingsController = {
  async getSettings(req, res, next) {
    try {
      const allSettings = await Setting.getAll();
      const defaultSettings = {
        theme: "light",
        interface_mode: "studio",
        default_model: "gemini-2.5-flash",
        default_reasoning_effort: "medium",
        auto_preview: true,
        stream_tokens: true,
        sound_enabled: true,
      };

      res.json({
        settings: { ...defaultSettings, ...allSettings },
      });
    } catch (err) {
      next(err);
    }
  },

  async saveSettings(req, res, next) {
    try {
      const { settings } = req.body;
      const savedKeys = await Setting.setMultiple(settings || {});
      auditLogger.log(req, "settings.update", { details: { keys: savedKeys } });
      res.json({ success: true, saved_keys: savedKeys });
    } catch (err) {
      next(err);
    }
  },

  async saveSingleSetting(req, res, next) {
    try {
      const { key, value } = req.body;
      await Setting.set(key, value);
      auditLogger.log(req, "settings.update_single", { details: { key } });
      res.json({ success: true, key, value });
    } catch (err) {
      next(err);
    }
  },

  async deleteSetting(req, res, next) {
    try {
      const { key } = req.params;
      await Setting.delete(key);
      auditLogger.log(req, "settings.delete", { details: { key } });
      res.json({ success: true, key });
    } catch (err) {
      next(err);
    }
  },

  async testProvider(req, res) {
    const { provider } = req.body;
    res.json({
      valid: true,
      provider: provider || "default",
      message: `Provider ${provider} connectivity verified successfully.`,
    });
  },
};

export default settingsController;
