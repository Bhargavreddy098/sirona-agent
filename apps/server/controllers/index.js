/**
 * Presentation / Controllers Layer Barrel
 * Consolidates Express request handlers and endpoints.
 */

import { approvalController } from './approvalController.js';
import { auditController } from './auditController.js';
import { authController } from './authController.js';
import { chatController } from './chatController.js';
import { filesController } from './filesController.js';
import { gitController } from './gitController.js';
import { createHealthController } from './healthController.js';
import { modelsController } from './modelsController.js';
import { sessionController } from './sessionController.js';
import { settingsController } from './settingsController.js';
import { toolsController } from './toolsController.js';

export {
  approvalController,
  auditController,
  authController,
  chatController,
  filesController,
  gitController,
  createHealthController,
  modelsController,
  sessionController,
  settingsController,
  toolsController,
};

export default {
  approvalController,
  auditController,
  authController,
  chatController,
  filesController,
  gitController,
  createHealthController,
  modelsController,
  sessionController,
  settingsController,
  toolsController,
};
