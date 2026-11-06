/**
 * @file apps/server/src/auth/index.ts
 * Auth domain module: Principal identity, session verification, and authentication routes.
 */
export { IdentityService } from '../../services/identityService.js';
export { sessionAuth } from '../../middleware/sessionAuth.js';
import identityRoutes from '../../routes/v1/identity.routes.js';
export { identityRoutes };
export default identityRoutes;
