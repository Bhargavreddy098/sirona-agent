import express from "express";
import { toolsController } from "../controllers/toolsController.js";
import { userAuth } from "../middleware/userAuth.js";

const router = express.Router();

router.get("/capabilities", toolsController.getCapabilities);
router.get("/toolsets", toolsController.getToolsets);
router.get("/skills", toolsController.getSkills);
router.post("/execute", userAuth, toolsController.executeTool);

export default router;
