import workspaceRoutes from './v1/workspace.routes.js';
import express from "express";
import identityV1Routes from "./v1/identity.routes.js";
import conversationsV1Routes from "./v1/conversations.routes.js";
import projectsV1Routes from "./v1/projects.routes.js";
import governanceV1Routes from "./v1/governance.routes.js";
import providersV1Routes from "./v1/providers.routes.js";
import executionV1Routes from "./v1/execution.routes.js";
import intentV1Routes from "./v1/intent.routes.js";
import planningV1Routes from "./v1/planning.routes.js";
import isolationV1Routes from "./v1/isolation.routes.js";
import toolsV1Routes from "./v1/tools.routes.js";
import verificationV1Routes from "./v1/verification.routes.js";
import memoryV1Routes from "./v1/memory.routes.js";
import automationV1Routes from "./v1/automation.routes.js";
import deploymentV1Routes from "./v1/deployment.routes.js";
import recoveryV1Routes from "./v1/recovery.routes.js";

const router = express.Router();

// Canonical v1 Identity, Session & Project routes
router.use("/api/v1", identityV1Routes);
router.use("/api/v1", conversationsV1Routes);
router.use("/api/v1", projectsV1Routes);
router.use("/api/v1", governanceV1Routes);
router.use("/api/v1", providersV1Routes);
router.use("/api/v1", executionV1Routes);
router.use("/api/v1", intentV1Routes);
router.use("/api/v1", planningV1Routes);
router.use("/api/v1", isolationV1Routes);
router.use("/api/v1", toolsV1Routes);
router.use("/api/v1", verificationV1Routes);
router.use("/api/v1", memoryV1Routes);
router.use("/api/v1", automationV1Routes);
router.use("/api/v1", deploymentV1Routes);
router.use("/api/v1", recoveryV1Routes);
router.use("/api/v1", workspaceRoutes);

// Legacy API mounts retired. Canonical routes are registered above.

export default router;
