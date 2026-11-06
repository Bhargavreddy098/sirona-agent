import express from "express";
import { auditController } from "../controllers/auditController.js";
import { userAuth } from "../middleware/userAuth.js";

const router = express.Router();

router.get("/", userAuth, auditController.listAuditLogs);

export default router;
