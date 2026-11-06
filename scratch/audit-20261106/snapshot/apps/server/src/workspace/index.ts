/**
 * @file apps/server/src/workspace/index.ts
 * Workspace domain module: File tree manipulation, workspace broker, and host directory profiles.
 */
export * from './workspaceBroker.js';
export * from './homeProfile.js';
export * from './frontendController.js';
import workspaceRoutes from '../../routes/v1/workspace.routes.js';
export { workspaceRoutes };
export default workspaceRoutes;
