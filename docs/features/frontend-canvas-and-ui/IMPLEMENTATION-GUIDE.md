# Agent Implementation Guide: Frontend Canvas & Workspaces

This guide explains how to add UI features, connect components to `sironaClient.ts`, and handle SSE events in React 19.

---

## 1. Key Source Files
- Main App: [`apps/web/src/App.tsx`](file:///apps/web/src/App.tsx)
- Main Canvas: [`apps/web/src/components/MainCanvas.tsx`](file:///apps/web/src/components/MainCanvas.tsx)
- Sidebar: [`apps/web/src/components/Sidebar.tsx`](file:///apps/web/src/components/Sidebar.tsx)
- Model Selector: [`apps/web/src/components/ModelSelectorModal.tsx`](file:///apps/web/src/components/ModelSelectorModal.tsx)
- Settings Screen: [`apps/web/src/components/SettingsScreen.tsx`](file:///apps/web/src/components/SettingsScreen.tsx)
- Typed Client: [`apps/web/src/api/sironaClient.ts`](file:///apps/web/src/api/sironaClient.ts)
- Main Hook: [`apps/web/src/api/useSirona.ts`](file:///apps/web/src/api/useSirona.ts)

---

## 2. Implementing a New UI Feature (Vertical Slice)

1. **Verify Contract**: Check `packages/contracts/src/` to ensure DTOs are defined.
2. **Expose in `sironaClient.ts`**:
   Add the typed method under the relevant domain object:
   ```typescript
   export const workspaceApi = {
     // ...
     async getFileStats(path: string): Promise<FileStatsResponse> {
       return request(`/api/v1/workspace/stats?path=${encodeURIComponent(path)}`);
     }
   };
   ```
3. **Connect to State in `useSirona.ts`**:
   Expose action and state variable in `useSirona`.
4. **Wire to React Component**:
   Bind state and action handler into `MainCanvas.tsx` or `Sidebar.tsx`.

---

## 3. Mandatory UI Rules
> [!IMPORTANT] Never add fake mock arrays to React components. Always fetch from `sironaClient.ts`.
> [!WARNING] Adhere to the compact light/dark design token palette in [`apps/web/src/index.css`](file:///apps/web/src/index.css).
