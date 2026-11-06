/**
 * @file apps/server/src/textGeneration/index.ts
 * Text generation domain module: Chat orchestration, token streaming, and conversation history.
 */
export { AIService } from '../../services/aiService.js';
import conversationsRoutes from '../../routes/v1/conversations.routes.js';
export { conversationsRoutes };
export default conversationsRoutes;
