# API Contracts & Schemas: Desktop Shell & OS Security

## 1. Electron IPC Channels (`preload.cjs` -> `main.cjs`)

### 1.1 `dialog:open-directory`
- **Direction**: Renderer → Main → Renderer
- **Parameters**: `{ title?: string, defaultPath?: string }`
- **Response**: `{ canceled: boolean, filePaths: string[] }`

### 1.2 `credentials:save`
- **Direction**: Renderer → Main → Renderer
- **Parameters**: `{ providerId: string, apiKey: string }`
- **Response**: `{ success: boolean, fingerprint: string }`

### 1.3 `credentials:get`
- **Direction**: Server / Main Internal
- **Parameters**: `{ providerId: string }`
- **Response**: `{ apiKey: string }` (Encrypted memory buffer, zeroed after use)

### 1.4 `window:control`
- **Direction**: Renderer → Main
- **Parameters**: `{ action: "minimize" | "maximize" | "close" }`

---

## 2. Preload Bridge API (`window.sironaDesktop`)

Exposed to the React application via `contextBridge.exposeInMainWorld`:

```typescript
export interface SironaDesktopBridge {
  openDirectoryDialog(options?: { title?: string; defaultPath?: string }): Promise<string | null>;
  saveCredential(providerId: string, apiKey: string): Promise<{ success: boolean; fingerprint: string }>;
  minimizeWindow(): void;
  maximizeWindow(): void;
  closeWindow(): void;
  isElectron: boolean;
}
```
