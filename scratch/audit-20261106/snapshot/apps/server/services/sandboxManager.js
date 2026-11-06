// @ts-check
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { IsolationBrokerService } from "./isolationBrokerService.js";
import { WorkspacePathResolver } from "./workspacePathResolver.js";

/**
 * Custom error for Sandbox lifecycle and containment violations.
 */
export class SandboxError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "SandboxError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Base abstract class for Sandbox Backends.
 */
export class SandboxBackend {
  /**
   * @returns {Promise<{ available: boolean, reason?: string, kind: string }>}
   */
  async checkHealth() {
    throw new Error("Not implemented");
  }

  /**
   * @param {{
   *   command: string,
   *   args?: string[],
   *   workspaceRoot: string,
   *   customEnv?: Record<string, string>,
   *   timeoutMs?: number,
   *   maxOutputBytes?: number
   * }} options
   * @returns {Promise<{ exitCode: number, stdout: string, stderr: string, durationMs: number }>}
   */
  async execute(_options) {
    throw new Error("Not implemented");
  }

  /**
   * @param {string} _sessionId
   */
  async terminate(_sessionId) {}
}

/**
 * Health check cache to avoid repeated synchronous exec latency.
 */
const healthCache = new Map();
const CACHE_TTL_MS = 120000;

async function getCachedHealth(key, checkFn) {
  const cached = healthCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }
  const result = await checkFn();
  if (result.available) {
    healthCache.set(key, { result, timestamp: Date.now() });
  } else {
    healthCache.delete(key);
  }
  return result;
}

/**
 * Docker Sandbox Backend: mounts only workspaceRoot into /workspace in an isolated container.
 */
export class DockerSandboxBackend extends SandboxBackend {
  constructor(image = "sirona-worker:latest") {
    super();
    this.image = image;
  }

  async checkHealth() {
    return getCachedHealth("docker", async () => {
      try {
        const res = spawnSync("docker", ["version"], { stdio: "ignore", timeout: 1500, windowsHide: true });
        if (res.status === 0) return { available: true, kind: "docker" };
        return { available: false, kind: "docker", reason: "DOCKER_DAEMON_UNAVAILABLE" };
      } catch {
        return { available: false, kind: "docker", reason: "DOCKER_DAEMON_UNAVAILABLE" };
      }
    });
  }

  async execute(_options) {
    const health = await this.checkHealth();
    if (!health.available) {
      throw new SandboxError("SANDBOX_UNAVAILABLE", 503, `Docker sandbox is unavailable: ${health.reason}`);
    }

    throw new SandboxError('GUEST_NOT_QUALIFIED',503,'Legacy host-mounted Docker execution is disabled; use a qualified broker');
  }

  /**
   * @private
   */
  _spawnProcess(cmd, cmdArgs, cwd, timeoutMs, maxOutputBytes) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      let killed = false;

      const child = spawn(cmd, cmdArgs, {
        cwd,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const timer = setTimeout(() => {
        killed = true;
        try { child.kill("SIGKILL"); } catch {}
        const err = new SandboxError("EXECUTION_TIMEOUT", 408, `Command execution timed out after ${timeoutMs}ms`);
        reject(err);
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
        if (Buffer.byteLength(stdout) > maxOutputBytes && !killed) {
          killed = true;
          try { child.kill("SIGKILL"); } catch {}
          clearTimeout(timer);
          reject(new SandboxError("OUTPUT_LIMIT_EXCEEDED", 413, `Output limit of ${maxOutputBytes} bytes exceeded`));
        }
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (!killed) {
          resolve({
            exitCode: code ?? 0,
            stdout,
            stderr,
            durationMs: Date.now() - startTime,
          });
        }
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(new SandboxError("EXECUTION_FAILED", 500, `Process failed to start: ${err.message}`));
      });
    });
  }
}

/**
 * Windows Sandbox Backend (WindowsSandbox.exe / Hyper-V).
 */
export class WindowsSandboxBackend extends SandboxBackend {
  async checkHealth() {
    return getCachedHealth("windows_sandbox", async () => {
      const isWindows = process.platform === "win32";
      if (!isWindows) {
        return { available: false, kind: "windows_sandbox", reason: "NON_WINDOWS_HOST" };
      }
      const sysRoot = process.env.SystemRoot || "C:\\Windows";
      const sandboxInstalled = fs.existsSync(path.join(sysRoot, "System32", "WindowsSandbox.exe"));
      if (!sandboxInstalled) {
        return { available: false, kind: "windows_sandbox", reason: "WINDOWS_SANDBOX_FEATURE_NOT_INSTALLED" };
      }
      return { available: true, kind: "windows_sandbox" };
    });
  }

  async execute() {
    const health = await this.checkHealth();
    if (!health.available) {
      throw new SandboxError("SANDBOX_UNAVAILABLE", 503, `Windows Sandbox is unavailable: ${health.reason}`);
    }
    throw new SandboxError("NOT_IMPLEMENTED", 501, "Windows Sandbox session execution in progress");
  }
}

/**
 * WSL Sandbox Backend: executes in disposable WSL environment with mounted workspace.
 * Hardened with Bubblewrap (bwrap) unprivileged kernel namespaces.
 */
export class WslSandboxBackend extends SandboxBackend {
  async checkHealth() {
    return getCachedHealth("wsl", async () => {
      return new Promise((resolve) => {
        const child = spawn("wsl", ["-d", "Ubuntu", "-e", "bwrap", "--version"], {
          stdio: ["ignore", "pipe", "ignore"],
          windowsHide: true,
        });

        let stdout = "";
        const timer = setTimeout(() => {
          try { child.kill("SIGKILL"); } catch {}
          resolve({ available: false, kind: "wsl", reason: "WSL_HEALTH_TIMEOUT" });
        }, 30000);

        child.stdout?.on("data", (d) => { stdout += d.toString("utf8"); });
        child.on("close", (code) => {
          clearTimeout(timer);
          if (code === 0 && stdout.includes("bubblewrap")) {
            resolve({ available: true, kind: "wsl", bwrap: true });
          } else {
            resolve({ available: false, kind: "wsl", reason: "BWRAP_NOT_INSTALLED" });
          }
        });
        child.on("error", (err) => {
          clearTimeout(timer);
          resolve({ available: false, kind: "wsl", reason: err.message });
        });
      });
    });
  }

  async execute({ command, args = [], workspaceRoot, customEnv = {}, timeoutMs = 30000, maxOutputBytes = 1048576, allowNetwork = false }) {
    const health = await this.checkHealth();
    if (!health.available) {
      throw new SandboxError("SANDBOX_UNAVAILABLE", 503, `WSL Sandbox is unavailable: ${health.reason}`);
    }

    const canonicalRoot = WorkspacePathResolver.canonicalizeRoot(workspaceRoot);
    const sanitizedEnv = IsolationBrokerService.sanitizeGuestEnvironment(customEnv);

    // Convert Windows path to WSL path (e.g. C:\foo -> /mnt/c/foo)
    const driveMatch = canonicalRoot.match(/^([a-zA-Z]):\\(.*)$/);
    const wslPath = driveMatch
      ? `/mnt/${driveMatch[1].toLowerCase()}/${driveMatch[2].replace(/\\/g, "/")}`
      : canonicalRoot;

    // Use Bubblewrap (bwrap) for unprivileged kernel namespace sandboxing:
    // - Mount /usr, /bin, /lib, /lib64, /etc read-only
    // - Mask /run with empty tmpfs (neutralizing /var/run/docker.sock)
    // - Mask /tmp with empty tmpfs
    // - Mount ONLY the workspace directory to /workspace read-write
    // - Set working directory to /workspace
    // - Enforce network namespace isolation (--unshare-net) unless allowNetwork is true
    // - Set clean environment (HOME=/tmp, PATH=/usr/local/bin:/usr/bin:/bin)
    const bwrapArgs = [
      "-d", "Ubuntu",
      "-e",
      "bwrap",
      "--ro-bind", "/usr", "/usr",
      "--ro-bind", "/bin", "/bin",
      "--ro-bind", "/lib", "/lib",
      "--ro-bind", "/lib64", "/lib64",
      "--ro-bind", "/etc", "/etc",
      "--proc", "/proc",
      "--dev", "/dev",
      "--tmpfs", "/tmp",
      "--tmpfs", "/run",
    ];

    if (allowNetwork) {
      bwrapArgs.push("--ro-bind", "/mnt/wsl/resolv.conf", "/mnt/wsl/resolv.conf");
    } else {
      bwrapArgs.push("--unshare-net");
    }

    bwrapArgs.push(
      "--bind", wslPath, "/workspace",
      "--chdir", "/workspace",
      "--setenv", "HOME", "/tmp",
      "--setenv", "PATH", "/usr/local/bin:/usr/bin:/bin"
    );

    for (const [k, v] of Object.entries(sanitizedEnv)) {
      if (!/^[A-Za-z0-9_]+$/.test(k)) continue;
      if (["PATHEXT", "COMSPEC", "WINDIR", "SYSTEMROOT", "PSMODULEPATH", "PATH"].includes(k.toUpperCase())) continue;
      bwrapArgs.push("--setenv", k, String(v));
    }

    // Bridge Windows shell invocations to Linux POSIX equivalents in WSL guest
    let targetCommand = command;
    let targetArgs = [...args];
    const cmdLower = (command || "").toLowerCase();
    if (cmdLower === "cmd.exe" || cmdLower === "cmd") {
      if (targetArgs[0] && targetArgs[0].toLowerCase() === "/c") {
        targetCommand = "/bin/sh";
        targetArgs = ["-c", targetArgs.slice(1).join(" ")];
      }
    } else if (cmdLower === "powershell.exe" || cmdLower === "powershell") {
      const fullArgs = targetArgs.join(" ");
      const sleepMatch = fullArgs.match(/(?:Start-Sleep\s+-Seconds\s+(\d+)|sleep\s+(\d+))/i);
      if (sleepMatch) {
        targetCommand = "/bin/sleep";
        targetArgs = [sleepMatch[1] || sleepMatch[2] || "3"];
      } else {
        targetCommand = "/bin/sh";
        targetArgs = ["-c", fullArgs];
      }
    }

    bwrapArgs.push(targetCommand, ...targetArgs);

    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      let killed = false;

      const child = spawn("wsl", bwrapArgs, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const timer = setTimeout(() => {
        killed = true;
        try { child.kill("SIGKILL"); } catch {}
        reject(new SandboxError("EXECUTION_TIMEOUT", 408, `WSL execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
        if (Buffer.byteLength(stdout) > maxOutputBytes && !killed) {
          killed = true;
          try { child.kill("SIGKILL"); } catch {}
          clearTimeout(timer);
          reject(new SandboxError("OUTPUT_LIMIT_EXCEEDED", 413, `Output limit of ${maxOutputBytes} bytes exceeded`));
        }
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (!killed) {
          resolve({
            exitCode: code ?? 0,
            stdout,
            stderr,
            durationMs: Date.now() - startTime,
          });
        }
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(new SandboxError("EXECUTION_FAILED", 500, `WSL failed to start: ${err.message}`));
      });
    });
  }
}

/**
 * Host Execution Backend (Explicit Developer Opt-In Mode ONLY).
 * Will NEVER execute automatically unless allowHostExecution: true is set.
 */
export class HostExecutionBackend extends SandboxBackend {
  /**
   * @param {boolean} [allowExplicitHost=false]
   */
  constructor(allowExplicitHost = false) {
    super();
    this.allowExplicitHost = allowExplicitHost;
  }

  async checkHealth() {
    return {
      available: this.allowExplicitHost,
      kind: "host",
      reason: this.allowExplicitHost ? undefined : "HOST_EXECUTION_BLOCKED_BY_DEFAULT",
    };
  }

  async execute({ command, args = [], workspaceRoot, customEnv = {}, timeoutMs = 15000, maxOutputBytes = 1048576 }) {
    if (!this.allowExplicitHost) {
      throw new SandboxError(
        "HOST_EXECUTION_BLOCKED",
        403,
        "Host process execution is forbidden by default. Enable explicit host mode or use a sandbox."
      );
    }

    const canonicalRoot = WorkspacePathResolver.canonicalizeRoot(workspaceRoot);
    try {
      return await IsolationBrokerService.executeIsolatedCommand({
        command,
        args,
        cwd: canonicalRoot,
        customEnv,
        timeoutMs,
        maxOutputBytes,
      });
    } catch (err) {
      if (/** @type {any} */ (err).code === "EXECUTION_TIMEOUT") {
        throw new SandboxError("EXECUTION_TIMEOUT", 408, err.message);
      }
      if (/** @type {any} */ (err).code === "OUTPUT_LIMIT_EXCEEDED") {
        throw new SandboxError("OUTPUT_LIMIT_EXCEEDED", 413, err.message);
      }
      throw new SandboxError("EXECUTION_FAILED", 500, err instanceof Error ? err.message : String(err));
    }
  }
}

/**
 * SandboxManager resolves the appropriate backend and enforces fail-closed behavior.
 */
export class SandboxManager {
  /**
   * Resolve an available sandbox backend. Fails closed if no sandbox is available.
   *
   * @param {{ prefer?: "docker" | "windows_sandbox" | "wsl" | "host", allowHostExecution?: boolean }} [options]
   * @returns {Promise<SandboxBackend>}
   */
  static async resolveBackend({ prefer, allowHostExecution = false } = {}) {
    // 1. Check explicit host mode if requested
    if (allowHostExecution) {
      return new HostExecutionBackend(true);
    }

    // 2. Explicit opt-in host execution. Takes priority over Docker availability so
    //    the flag means "use host execution" rather than "host only when Docker is
    //    down." Re-enable Docker-only by unsetting the flag. Sandbox/WSL2 code is
    //    preserved untouched.
    if (process.env.SIRONA_HOST_EXECUTION === 'true') {
      return new HostExecutionBackend(true);
    }

    if(prefer && prefer!=='docker')throw new SandboxError('SANDBOX_UNAVAILABLE',503,'Only the approved Docker broker may execute project commands');
    const docker=new DockerSandboxBackend();if((await docker.checkHealth()).available)return docker;
    throw new SandboxError('SANDBOX_UNAVAILABLE',503,'Local Docker is unavailable; no WSL or host execution fallback is permitted');
  }

  /**
   * Execute command inside the isolated sandbox.
   *
   * @param {{
   *   command: string,
   *   args?: string[],
   *   workspaceRoot: string,
   *   customEnv?: Record<string, string>,
   *   timeoutMs?: number,
   *   maxOutputBytes?: number,
   *   allowHostExecution?: boolean,
   *   prefer?: "docker" | "windows_sandbox" | "wsl" | "host"
   * }} options
   */
  static async execute(options) {
    const backend = await this.resolveBackend({
      prefer: options.prefer,
      allowHostExecution: options.allowHostExecution,
    });
    return await backend.execute(options);
  }
}
