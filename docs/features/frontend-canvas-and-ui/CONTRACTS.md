# API Contracts & Schemas: Frontend Canvas & Workspaces

## 1. Client Hook State: `useSirona()`

Defined in [`apps/web/src/api/useSirona.ts`](file:///apps/web/src/api/useSirona.ts):

```typescript
export interface SironaState {
  currentProject: Project | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  messages: Message[];
  models: ModelOption[];
  activeModelId: string;
  isStreaming: boolean;
  pendingApprovals: ApprovalRequest[];
  workspaceTree: WorkspaceTreeNode[];
  error: SironaApiError | null;
  
  // Actions
  selectConversation: (id: string) => Promise<void>;
  createConversation: (title?: string) => Promise<string>;
  submitPrompt: (prompt: string, contextFiles?: string[]) => Promise<void>;
  cancelTurn: () => Promise<void>;
  decideApproval: (approvalId: string, decision: 'approved' | 'rejected') => Promise<void>;
  selectWorkspaceFolder: () => Promise<void>;
}
```

---

## 2. Component Props Interfaces

### `ModelSelectorModalProps`
```typescript
export interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onOpenSettings: () => void;
}
```

### `MainCanvasProps`
```typescript
export interface MainCanvasProps {
  conversation: Conversation | null;
  messages: Message[];
  isStreaming: boolean;
  pendingApprovals: ApprovalRequest[];
  onSubmitPrompt: (text: string) => Promise<void>;
  onCancelTurn: () => Promise<void>;
  onDecideApproval: (id: string, decision: 'approved' | 'rejected') => Promise<void>;
}
```
