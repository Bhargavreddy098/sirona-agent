/**
 * @file apps/server/src/scheduling/index.ts
 * Scheduling domain module: Automation triggers, recurring job queues, and scheduled tasks.
 */
export { AutomationService } from '../../services/automationService.js';
import automationRoutes from '../../routes/v1/automation.routes.js';
export { automationRoutes };
export default automationRoutes;
