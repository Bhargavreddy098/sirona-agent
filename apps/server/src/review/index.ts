/**
 * @file apps/server/src/review/index.ts
 * Review domain module: Human-in-the-loop approvals, diff inspection, and effect governance.
 */
export { GovernanceService } from '../../services/governanceService.js';
import governanceRoutes from '../../routes/v1/governance.routes.js';
export { governanceRoutes };
export default governanceRoutes;
