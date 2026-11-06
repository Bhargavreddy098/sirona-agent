/**
 * @file apps/server/src/background/index.ts
 * Background domain module: Worker tasks, lifecycle recovery, and background queue management.
 */
export { AgentWorkerService } from '../../services/agentWorkerService.js';
import recoveryRoutes from '../../routes/v1/recovery.routes.js';
export { recoveryRoutes };
export default recoveryRoutes;
