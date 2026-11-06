/**
 * @file apps/server/src/project/index.ts
 * Project domain module: Project registration, repository snapshot indexing, and AST symbol extraction.
 */
export * from '../context/projectIndex.js';
export * from '../context/contextAssembler.js';
import projectsRoutes from '../../routes/v1/projects.routes.js';
export { projectsRoutes };
export default projectsRoutes;
