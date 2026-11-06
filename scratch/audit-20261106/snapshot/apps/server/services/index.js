/**
 * Services Layer Architecture Barrel
 * Groups application services by Domain-Driven Design bounded contexts,
 * while maintaining individual export access for absolute backward compatibility.
 */

// 1. AI & Providers Bounded Context
import { AIService } from './aiService.js';
import { ProviderService, ProviderServiceError } from './providerService.js';
import { getProjectTree, buildProjectPrompt } from './projectContext.js';

// 2. Orchestration & Execution Bounded Context
import { AgentExecutionEngine } from './agentExecutionEngine.js';
import { AgentWorkerService } from './agentWorkerService.js';
import { ExecutionService } from './executionService.js';
import { WorkflowOrchestratorService } from './workflowOrchestratorService.js';
import { SessionTurnLeaseRegistry, TurnLeaseService } from './turnLeaseService.js';
import { coordinateTurn, reconcileTurns } from './conversationTurnCoordinator.js';

// 3. Identity & Governance Bounded Context
import { IdentityService } from './identityService.js';
import { GovernanceService } from './governanceService.js';
import { AuditLogger } from './auditLogger.js';
import { requireConversation, requireProject, conversationError } from './conversationAccess.js';
import { generateChallenge, verifyChallenge } from './launcherChallenge.js';

// 4. Project & Workspace Bounded Context
import { ProjectService, ProjectServiceError } from './projectService.js';
import { ProjectScannerService } from './projectScannerService.js';
import { WorkspacePathResolver } from './workspacePathResolver.js';
import { ContextEngineService } from './contextEngineService.js';

// 5. Infrastructure & Runtime Bounded Context
import { SecretStore } from './secretStore.js';
import { CacheService } from './cacheService.js';
import { createSocketOwner } from './socket.js';
import { TerminalGateway } from './terminalGateway.js';
import { ToolRuntimeService } from './toolRuntimeService.js';
import { IsolationBrokerService } from './isolationBrokerService.js';
import { SandboxManager } from './sandboxManager.js';
import { VerificationService } from './verificationService.js';
import { DeploymentService } from './deploymentService.js';
import { ReleaseRecoveryService } from './releaseRecoveryService.js';
import { NotificationDispatcher } from './notificationDispatcher.js';
import { MemoryService } from './memoryService.js';
import { AutomationService } from './automationService.js';
import { EmailService } from './emailService.js';

// Domain Namespaces
export const ai = {
  AIService,
  ProviderService,
  ProviderServiceError,
  getProjectTree,
  buildProjectPrompt,
};

export const orchestration = {
  AgentExecutionEngine,
  AgentWorkerService,
  ExecutionService,
  WorkflowOrchestratorService,
  SessionTurnLeaseRegistry,
  TurnLeaseService,
  coordinateTurn,
  reconcileTurns,
};

export const governance = {
  IdentityService,
  GovernanceService,
  AuditLogger,
  requireConversation,
  requireProject,
  conversationError,
  generateChallenge,
  verifyChallenge,
};

export const workspace = {
  ProjectService,
  ProjectServiceError,
  ProjectScannerService,
  WorkspacePathResolver,
  ContextEngineService,
};

export const infrastructure = {
  SecretStore,
  CacheService,
  createSocketOwner,
  TerminalGateway,
  ToolRuntimeService,
  IsolationBrokerService,
  SandboxManager,
  VerificationService,
  DeploymentService,
  ReleaseRecoveryService,
  NotificationDispatcher,
  MemoryService,
  AutomationService,
  EmailService,
};

// Top-Level Backward-Compatible Re-Exports
export {
  AIService,
  ProviderService,
  ProviderServiceError,
  getProjectTree,
  buildProjectPrompt,
  AgentExecutionEngine,
  AgentWorkerService,
  ExecutionService,
  WorkflowOrchestratorService,
  SessionTurnLeaseRegistry,
  TurnLeaseService,
  coordinateTurn,
  reconcileTurns,
  IdentityService,
  GovernanceService,
  AuditLogger,
  requireConversation,
  requireProject,
  conversationError,
  generateChallenge,
  verifyChallenge,
  ProjectService,
  ProjectServiceError,
  ProjectScannerService,
  WorkspacePathResolver,
  ContextEngineService,
  SecretStore,
  CacheService,
  createSocketOwner,
  TerminalGateway,
  ToolRuntimeService,
  IsolationBrokerService,
  SandboxManager,
  VerificationService,
  DeploymentService,
  ReleaseRecoveryService,
  NotificationDispatcher,
  MemoryService,
  AutomationService,
  EmailService,
};

export default {
  ai,
  orchestration,
  governance,
  workspace,
  infrastructure,
};
