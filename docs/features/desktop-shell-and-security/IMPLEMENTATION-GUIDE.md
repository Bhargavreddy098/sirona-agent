# Agent Implementation Guide: Desktop Shell & OS Security

This guide covers working with Electron IPC, safeStorage DPAPI encryption, and preload script boundaries.

---

## 1. Key Source Files
- Electron Main: [`apps/desktop/src/main.cjs`](file:///apps/desktop/src/main.cjs)
- Preload Bridge: [`apps/desktop/src/preload.cjs`](file:///apps/desktop/src/preload.cjs)
- Credential Broker: [`apps/desktop/src/security/credentialBroker.ts`](file:///apps/desktop/src/security/credentialBroker.ts)
- Terminal Proxy: [`apps/desktop/src/terminalProxy.cjs`](file:///apps/desktop/src/terminalProxy.cjs)

---

## 2. DPAPI Credential Handling Pattern

```typescript
import { safeStorage } from "electron";

export class DesktopCredentialBroker {
  static encrypt(plainTextKey: string): Buffer {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("DPAPI / safeStorage encryption is not available on this host.");
    }
    return safeStorage.encryptString(plainTextKey);
  }

  static decrypt(encryptedBuffer: Buffer): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("DPAPI / safeStorage encryption is not available on this host.");
    }
    return safeStorage.decryptString(encryptedBuffer);
  }
}
```

---

## 3. Mandatory Safety Rules
> [!CAUTION] Never expose `child_process` or `fs` directly on `window` in `preload.cjs`.
> [!WARNING] Never serialize decrypted keys into window `console.log()` or renderer state.
