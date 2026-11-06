/**
 * @file apps/server/src/guest/index.ts
 * Guest domain module: Sandboxed Docker/WSL2 worker containers, isolation brokers, and guest transport.
 */
export * from '../tools/guestTransport.js';
export { IsolationBrokerService } from '../../services/isolationBrokerService.js';
export { SandboxManager } from '../../services/sandboxManager.js';
import isolationRoutes from '../../routes/v1/isolation.routes.js';
export { isolationRoutes };
export default isolationRoutes;
