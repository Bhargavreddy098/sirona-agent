import express from "express";
import { settingsController } from "../controllers/settingsController.js";
import { userAuth } from "../middleware/userAuth.js";

const router = express.Router();

router.get("/", userAuth, settingsController.getSettings);
router.post("/", userAuth, settingsController.saveSettings);
router.post("/single", userAuth, settingsController.saveSingleSetting);
router.delete("/:key", userAuth, settingsController.deleteSetting);
router.post("/providers/test", userAuth, settingsController.testProvider);

export default router;
