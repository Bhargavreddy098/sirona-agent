# Agent Implementation Guide: Approvals & Governance

This guide explains how to integrate tools into the governance evaluation pipeline and handle user approval gates.

---

## 1. Key Source Files
- Governance Service: [`apps/server/services/governanceService.js`](file:///apps/server/services/governanceService.js)
- Audit Logger: [`apps/server/services/auditLogger.js`](file:///apps/server/services/auditLogger.js)
- Governance Controller: [`apps/server/controllers/governanceController.js`](file:///apps/server/controllers/governanceController.js)
- Routes: [`apps/server/routes/v1/governance.routes.js`](file:///apps/server/routes/v1/governance.routes.js)
- Frontend Modal: [`apps/web/src/components/MainCanvas.tsx`](file:///apps/web/src/components/MainCanvas.tsx)

---

## 2. Risk Evaluation Algorithm

```javascript
export function evaluateActionRisk(toolName, args, autonomyMode = "supervised") {
  // Read-only tools are always low risk
  if (["read_file", "list_directory", "search_files"].includes(toolName)) {
    return { riskLevel: "low", requiresHumanAction: false };
  }

  // Shell execution is always high risk unless command is whitelisted
  if (toolName === "execute_shell") {
    const isSafeCommand = /^(git status|git diff|pnpm test|npm test)$/.test(args.command?.trim());
    if (isSafeCommand && autonomyMode === "autonomous") {
      return { riskLevel: "low", requiresHumanAction: false };
    }
    return {
      riskLevel: "high",
      requiresHumanAction: true,
      reason: `Shell execution '${args.command}' modifies system or runtime state.`,
    };
  }

  // Modifying core project configuration files is critical
  if (toolName === "write_file" || toolName === "edit_file") {
    const isSensitive = /(package\.json|\.env|Dockerfile|tsconfig\.json)$/.test(args.path);
    if (isSensitive) {
      return {
        riskLevel: "high",
        requiresHumanAction: true,
        reason: `Modifying critical project configuration file '${args.path}'.`,
      };
    }
    return {
      riskLevel: "medium",
      requiresHumanAction: autonomyMode === "supervised",
      reason: `Modifying source file '${args.path}'.`,
    };
  }

  return { riskLevel: "high", requiresHumanAction: true, reason: "Unclassified tool action" };
}
```
