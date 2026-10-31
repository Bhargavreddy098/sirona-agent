/**
 * @file apps/server/src/mcp/index.ts
 * MCP domain module: Model Context Protocol SDK transport, server connections, and schema verification.
 */
export * from '../tools/mcpAdapter.js';
export { ToolRuntimeService } from '../../services/toolRuntimeService.js';
import toolsRoutes from '../../routes/v1/tools.routes.js';
export { toolsRoutes };
export default toolsRoutes;
