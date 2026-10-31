import express from "express";
import Joi from "joi";
import { sessionController } from "../controllers/sessionController.js";
import { chatController } from "../controllers/chatController.js";
import { userAuth } from "../middleware/userAuth.js";
import { verifySessionOwnership } from "../middleware/ownershipGuard.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

const createSessionSchema = Joi.object({
  title: Joi.string().optional(),
  model: Joi.string().optional(),
  cwd: Joi.string().optional(),
  project_id: Joi.string().uuid().optional().allow(null),
  system_prompt: Joi.string().optional().allow(null),
  reasoning_effort: Joi.string().valid("low", "medium", "high").optional(),
});

const chatPromptSchema = Joi.object({
  prompt: Joi.string().required(),
  reasoning_effort: Joi.string().valid("low", "medium", "high").optional(),
});

// Topology & Search
router.get("/topology", userAuth, sessionController.getTopology);

// Sessions CRUD
router.get("/", userAuth, sessionController.listSessions);
router.post("/", userAuth, validate(createSessionSchema), sessionController.createSession);
router.get("/:id", userAuth, verifySessionOwnership, sessionController.getSession);
router.patch("/:id", userAuth, verifySessionOwnership, sessionController.updateSession);
router.delete("/:id", userAuth, verifySessionOwnership, sessionController.deleteSession);

// Messages & Chat Loop
router.get("/:id/messages", userAuth, verifySessionOwnership, sessionController.getMessages);
router.post("/:id/chat", userAuth, verifySessionOwnership, validate(chatPromptSchema), chatController.sendPrompt);

// Branching & Rewinds
router.post("/:id/branch", userAuth, verifySessionOwnership, sessionController.branchSession);
router.post("/:id/rewind", userAuth, verifySessionOwnership, sessionController.rewindSession);
router.get("/:id/lineage", userAuth, verifySessionOwnership, sessionController.getLineage);

// Checkpoints
router.get("/:id/checkpoints", userAuth, verifySessionOwnership, sessionController.listCheckpoints);
router.post("/:id/checkpoints", userAuth, verifySessionOwnership, sessionController.createCheckpoint);

export default router;
