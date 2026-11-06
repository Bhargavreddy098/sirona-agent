import express from "express";
import Joi from "joi";
import { approvalController } from "../controllers/approvalController.js";
import { userAuth } from "../middleware/userAuth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

const approvalResponseSchema = Joi.object({
  prompt_id: Joi.string().required(),
  approved: Joi.boolean().required(),
});

// Matches Hermes-parity /v1/runs/:runId/approval and /api/approvals
router.post("/:runId/approval", userAuth, validate(approvalResponseSchema), approvalController.respondApproval);
router.get("/", userAuth, approvalController.listApprovals);

export default router;
