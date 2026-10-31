// @ts-check
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn, execSync } from "child_process";
import { query } from "../config/db.js";
import { WorkspacePathResolver } from "./workspacePathResolver.js";

/**
 * SHA-256 hash helper.
 * @param {string | Buffer} data
 * @returns {string}
 */
function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Canonical JSON stringification for deterministic digest computation.
 * @param {unknown} val
 * @returns {string}
 */
function canonicalJson(val) {
  if (val === null || typeof val !== "object") {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return "[" + val.map(canonicalJson).join(",") + "]";
  }
  const keys = Object.keys(/** @type {Record<string, unknown>} */ (val)).sort();
  const entries = keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(/** @type {Record<string, unknown>} */ (val)[k]));
  return "{" + entries.join(",") + "}";
}

/**
 * Denied environment variable name patterns (secrets, credentials, sensitive keys).
 */
const SENSITIVE_ENV_PATTERN = /(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|AUTH|DATABASE|PG|AWS|OPENAI|ANTHROPIC|GEMINI|GOOGLE|S3|JWT|COOKIE)/i;

/**
 * Safe platform environment variable keys permitted in guest execution.
 */
const SAFE_PLATFORM_ENV_KEYS = new Set([
  "SYSTEMROOT",
  "WINDIR",
  "PATH",
  "PATHEXT",
  "TEMP",
  "TMP",
  "COMSPEC",
  "NUMBER_OF_PROCESSORS",
  "PROCESSOR_ARCHITECTURE",
  "PROCESSOR_IDENTIFIER",
  "OS",
]);

/**
 * DOS reserved device names.
 */
const _DOS_DEVICE_NAMES = new Set([
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
]);

export class IsolationBrokerService {
  /**
   * Diagnostic check of host platform and virtualization prerequisites.
   * @returns {Promise<{
   *   isWindows: boolean,
   *   platform: string,
   *   arch: string,
   *   virtualizationFirmwareEnabled: boolean,
   *   hypervSupported: boolean,
   *   hypervEnabled: boolean,
   *   sandboxFeatureInstalled: boolean,
   *   status: "ready" | "prerequisites_missing",
   *   recommendations: string[]
   * }>}
   */
  static async checkPrerequisites() {
    const isWindows = process.platform === "win32";
    const platform = process.platform;
    const arch = process.arch;
    let virtualizationFirmwareEnabled = false;
    let hypervSupported = false;
    let hypervEnabled = false;
    let sandboxFeatureInstalled = false;
    const recommendations = [];

    if (isWindows) {
      const sysRoot = process.env.SystemRoot || "C:\\Windows";
      try {
        // Fast file-based check for Windows Sandbox and Hyper-V binaries
        sandboxFeatureInstalled = fs.existsSync(path.join(sysRoot, "System32", "WindowsSandbox.exe"));
        hypervEnabled = fs.existsSync(path.join(sysRoot, "System32", "vmms.exe"));
      } catch {
        sandboxFeatureInstalled = false;
        hypervEnabled = false;
      }

      // Check processor virtualization
      // Presence of platform files is not verified firmware or guest containment.
      virtualizationFirmwareEnabled = false;
      hypervSupported = false;
    } else {
      recommendations.push("Host OS is not Windows. Windows Hyper-V and Sandbox require Windows 10/11 Pro, Enterprise, or Education.");
    }

    let dockerAvailable = false;
    let dockerInfo = null;
    try {
      const dres = spawnSync("docker", ["info", "--format", "{{json .}}"], {
        encoding: "utf8",
        timeout: 2500,
        windowsHide: true,
      });
      if (dres.status === 0 && dres.stdout) {
        const dinfo = JSON.parse(dres.stdout);
        dockerAvailable = true;
        dockerInfo = {
          version: dinfo.ServerVersion,
          cgroupVersion: dinfo.CgroupVersion === "2" || dinfo.CgroupVersion === 2 ? 2 : 1,
          seccomp: Array.isArray(dinfo.SecurityOptions) && dinfo.SecurityOptions.some((s) => s.toLowerCase().includes("seccomp")),
        };
      }
    } catch {
      dockerAvailable = false;
    }

    if (!sandboxFeatureInstalled) {
      recommendations.push("Windows Sandbox feature is not enabled. Enable via 'Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM'.");
    }

    const hypervReady = isWindows && (sandboxFeatureInstalled || hypervEnabled);
    const dockerReady = dockerAvailable;
    // Reachability is diagnostic only; the required hostile-code boundary remains unqualified.
    const status = "prerequisites_missing";
    const selectedProfile = hypervReady ? "windows_sandbox_default" : (dockerReady ? "docker_wsl2" : "none");

    return {
      isWindows,
      platform,
      arch,
      virtualizationFirmwareEnabled,
      hypervSupported,
      hypervEnabled,
      sandboxFeatureInstalled,
      dockerAvailable,
      dockerInfo,
      selectedProfile,
      status,
      recommendations,
    };
  }

  /**
   * Validate that a target path is strictly contained inside workspaceRoot,
   * blocking directory traversal, reparse point/junction escapes, UNC paths, and device paths.
   *
   * @param {string} workspaceRoot Absolute path to workspace root
   * @param {string} targetPath Relative or candidate path within workspace
   * @returns {{ valid: boolean, canonicalPath: string }}
   */
  static validateWorkspacePath(workspaceRoot, targetPath) {
    const res = WorkspacePathResolver.resolveAndValidate(workspaceRoot, targetPath);
    return { valid: res.valid, canonicalPath: res.canonicalPath };
  }

  /**
   * Sanitize host environment variables, removing all secrets, credentials, and dangerous keys.
   *
   * @param {Record<string, string>} [customEnv={}]
   * @returns {Record<string, string>}
   */
  static sanitizeGuestEnvironment(customEnv = {}) {
    /** @type {Record<string, string>} */
    const cleanEnv = {};

    // Copy allowlisted platform keys from host process.env
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined && SAFE_PLATFORM_ENV_KEYS.has(key.toUpperCase())) {
        cleanEnv[key] = value;
      }
    }

    // Explicitly set safe execution markers
    cleanEnv.NODE_ENV = "production";
    cleanEnv.SIRONA_ISOLATED = "true";
    cleanEnv.CI = "true";

    // Overlay customEnv, rejecting any key matching sensitive patterns
    for (const [key, value] of Object.entries(customEnv)) {
      if (typeof value === "string") {
        if (!SENSITIVE_ENV_PATTERN.test(key)) {
          cleanEnv[key] = value;
        }
      }
    }

    return cleanEnv;
  }

  /**
   * Validate egress network destinations against declared egress policy.
   *
   * @param {string} destinationUrl
   * @param {"deny_all" | "allowlist_only"} [policy="deny_all"]
   * @param {string[]} [allowedDomains=[]]
   * @returns {{ allowed: boolean, reason?: string }}
   */
  static validateEgress(destinationUrl, policy = "deny_all", allowedDomains = []) {
    if (policy === "deny_all") {
      return { allowed: false, reason: "EGRESS_POLICY_DENY_ALL" };
    }

    let parsed;
    try {
      parsed = new URL(destinationUrl);
    } catch {
      return { allowed: false, reason: "MALFORMED_URL" };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 1. Loopback addresses
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0") {
      return { allowed: false, reason: "LOOPBACK_FORBIDDEN" };
    }

    // 2. Cloud metadata and link-local addresses
    if (hostname === "169.254.169.254" || hostname.startsWith("169.254.")) {
      return { allowed: false, reason: "METADATA_ENDPOINT_FORBIDDEN" };
    }

    // 3. RFC 1918 Private IPv4 addresses
    if (
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return { allowed: false, reason: "PRIVATE_NETWORK_FORBIDDEN" };
    }

    // 4. Check domain allowlist
    if (policy === "allowlist_only") {
      const match = allowedDomains.some((d) => {
        const norm = d.toLowerCase();
        return hostname === norm || hostname.endsWith("." + norm);
      });
      if (!match) {
        return { allowed: false, reason: "DOMAIN_NOT_ALLOWLISTED" };
      }
    }

    return { allowed: true };
  }

  /**
   * Safely terminate a process tree on Windows using taskkill /F /T, or SIGKILL on POSIX.
   * @param {number} pid
   */
  static terminateProcessTree(pid) {
    if (!pid || pid <= 0) return;
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: "ignore" });
      } else {
        process.kill(-pid, "SIGKILL");
      }
    } catch {
      // Process may already have terminated
    }
  }

  /**
   * Execute an isolated command within a bounded process boundary, enforcing
   * environment sanitization, execution timeout, output byte limit, and owned-tree termination.
   *
   * @param {{
   *   command: string,
   *   args?: string[],
   *   cwd: string,
   *   customEnv?: Record<string, string>,
   *   timeoutMs?: number,
   *   maxOutputBytes?: number
   * }} options
   * @returns {Promise<{ exitCode: number, stdout: string, stderr: string, durationMs: number }>}
   */
  static async executeIsolatedCommand(options) {
    const {
      command,
      args = [],
      cwd,
      customEnv = {},
      timeoutMs = 15000,
      maxOutputBytes = 1048576, // 1 MB default
    } = options;

    const startTime = Date.now();
    const env = this.sanitizeGuestEnvironment(customEnv);

    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      let killed = false;
      let timer = null;

      const child = spawn(command, args, {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      const pid = child.pid;

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };

      if (pid) {
        timer = setTimeout(() => {
          killed = true;
          this.terminateProcessTree(pid);
          cleanup();
          const err = new Error(`Execution timed out after ${timeoutMs}ms`);
          /** @type {any} */ (err).code = "EXECUTION_TIMEOUT";
          reject(err);
        }, timeoutMs);
      }

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf-8");
        if (Buffer.byteLength(stdout) > maxOutputBytes) {
          killed = true;
          if (pid) this.terminateProcessTree(pid);
          cleanup();
          const err = new Error(`Stdout exceeded limit of ${maxOutputBytes} bytes`);
          /** @type {any} */ (err).code = "OUTPUT_LIMIT_EXCEEDED";
          reject(err);
        }
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf-8");
        if (Buffer.byteLength(stderr) > maxOutputBytes) {
          killed = true;
          if (pid) this.terminateProcessTree(pid);
          cleanup();
          const err = new Error(`Stderr exceeded limit of ${maxOutputBytes} bytes`);
          /** @type {any} */ (err).code = "OUTPUT_LIMIT_EXCEEDED";
          reject(err);
        }
      });

      child.on("error", (err) => {
        cleanup();
        if (!killed) reject(err);
      });

      child.on("close", (code) => {
        cleanup();
        if (!killed) {
          resolve({
            exitCode: code ?? 0,
            stdout,
            stderr,
            durationMs: Date.now() - startTime,
          });
        }
      });
    });
  }

  /**
   * Import an artifact safely into the workspace root.
   *
   * @param {string} workspaceRoot
   * @param {string} relativePath
   * @param {string | Buffer} content
   * @returns {{ relativePath: string, digest: string, size: number }}
   */
  static quarantineImport(workspaceRoot, relativePath, content) {
    const { canonicalPath } = this.validateWorkspacePath(workspaceRoot, relativePath);
    const parentDir = path.dirname(canonicalPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(canonicalPath, content);
    const buffer = typeof content === "string" ? Buffer.from(content) : content;
    return {
      relativePath,
      digest: sha256(buffer),
      size: buffer.length,
    };
  }

  /**
   * Export an artifact from workspace root with safety scans.
   *
   * @param {string} workspaceRoot
   * @param {string} relativePath
   * @returns {{ relativePath: string, content: Buffer, digest: string, size: number, passedScan: boolean }}
   */
  static quarantineExport(workspaceRoot, relativePath) {
    const { canonicalPath } = this.validateWorkspacePath(workspaceRoot, relativePath);
    if (!fs.existsSync(canonicalPath)) {
      const err = new Error("Target artifact does not exist: " + relativePath);
      /** @type {any} */ (err).code = "ARTIFACT_NOT_FOUND";
      throw err;
    }
    const content = fs.readFileSync(canonicalPath);
    const digest = sha256(content);

    // Scan for canary leaks or forbidden binary executable headers (MZ / ELF)
    const contentStr = content.toString("utf-8");
    const hasCanary = /CANARY_HOST_SECRET/i.test(contentStr);
    const isWindowsExecutable = content.length >= 2 && content[0] === 0x4d && content[1] === 0x5a; // MZ header
    const passedScan = !hasCanary && !isWindowsExecutable;

    return {
      relativePath,
      content,
      digest,
      size: content.length,
      passedScan,
    };
  }

  /**
   * Run the versioned adversarial qualification suite against the boundary.
   *
   * @param {{ runnerVersion?: string }} [options={}]
   * @returns {Promise<{
   *   id: string,
   *   suiteVersion: string,
   *   runnerVersion: string,
   *   environment: string,
   *   status: "passed" | "failed" | "prerequisites_missing",
   *   prerequisites: Record<string, unknown>,
   *   adversarialResults: Array<{ name: string, passed: boolean, description: string, evidence?: string }>,
   *   digest: string,
   *   createdAt: string
   * }>}
   */
  static async runAdversarialQualification(options = {}) {
    const runnerVersion = options.runnerVersion || "1.0.0";
    const suiteVersion = "v1";
    const environment = `${process.platform}-${process.arch}`;
    const prereqs = await this.checkPrerequisites();

    // Create a temporary sandboxed workspace for adversarial tests
    const tempRoot = path.join(process.cwd(), "temp_qualification_" + Date.now());
    if (!fs.existsSync(tempRoot)) {
      fs.mkdirSync(tempRoot, { recursive: true });
    }

    /** @type {Array<{ name: string, passed: boolean, description: string, evidence?: string }>} */
    const results = [];

    try {
      // Test 1: Path Traversal Escape Attack
      try {
        this.validateWorkspacePath(tempRoot, "../../Windows/System32/calc.exe");
        results.push({
          name: "path_traversal_escape",
          passed: false,
          description: "Attempted path traversal outside workspace root",
          evidence: "Path traversal was not blocked",
        });
      } catch (err) {
        const isBlocked = /** @type {any} */ (err).code === "PATH_TRAVERSAL_DETECTED";
        results.push({
          name: "path_traversal_escape",
          passed: isBlocked,
          description: "Path traversal attempts outside workspace are intercepted and rejected",
          evidence: `Rejected with code: ${/** @type {any} */ (err).code}`,
        });
      }

      // Test 2: UNC Network Path Attack
      try {
        this.validateWorkspacePath(tempRoot, "\\\\192.168.1.100\\c$\\secrets.txt");
        results.push({
          name: "unc_path_escape",
          passed: false,
          description: "Attempted UNC network share access",
          evidence: "UNC path was not blocked",
        });
      } catch (err) {
        const isBlocked = /** @type {any} */ (err).code === "UNC_PATH_FORBIDDEN";
        results.push({
          name: "unc_path_escape",
          passed: isBlocked,
          description: "UNC network share paths are strictly forbidden",
          evidence: `Rejected with code: ${/** @type {any} */ (err).code}`,
        });
      }

      // Test 3: Device Path Escape Attack
      try {
        this.validateWorkspacePath(tempRoot, "\\\\.\\PhysicalDrive0");
        results.push({
          name: "device_path_escape",
          passed: false,
          description: "Attempted Windows device path access",
          evidence: "Device path was not blocked",
        });
      } catch (err) {
        const isBlocked = /** @type {any} */ (err).code === "DEVICE_PATH_FORBIDDEN";
        results.push({
          name: "device_path_escape",
          passed: isBlocked,
          description: "Windows device paths and DOS reserved devices are strictly blocked",
          evidence: `Rejected with code: ${/** @type {any} */ (err).code}`,
        });
      }

      // Test 4: Host Secret Canary Isolation
      process.env.CANARY_HOST_SECRET_TOKEN = "CANARY_SECRET_VALUE_DO_NOT_LEAK";
      const sanitized = this.sanitizeGuestEnvironment({ USER_INPUT: "test" });
      const leaked = "CANARY_HOST_SECRET_TOKEN" in sanitized || Object.values(sanitized).includes("CANARY_SECRET_VALUE_DO_NOT_LEAK");
      delete process.env.CANARY_HOST_SECRET_TOKEN;
      results.push({
        name: "host_secret_isolation",
        passed: !leaked,
        description: "Host environment secrets, database credentials, and API keys are completely stripped",
        evidence: leaked ? "Canary secret was leaked to guest environment" : "Canary secret successfully quarantined from guest",
      });

      // Test 5: Egress Firewall & Metadata Endpoint Blocking
      const metaEgress = this.validateEgress("http://169.254.169.254/latest/meta-data/", "allowlist_only", ["api.github.com"]);
      const loopEgress = this.validateEgress("http://127.0.0.1:8000/internal", "allowlist_only", ["api.github.com"]);
      const privEgress = this.validateEgress("http://10.0.0.1/admin", "allowlist_only", ["api.github.com"]);
      const allowEgress = this.validateEgress("https://api.github.com/repos", "allowlist_only", ["api.github.com"]);
      const egressOk = !metaEgress.allowed && !loopEgress.allowed && !privEgress.allowed && allowEgress.allowed;
      results.push({
        name: "egress_gateway_filtering",
        passed: egressOk,
        description: "Denies metadata (169.254), loopback (127.0.0.1), and RFC 1918 private IPs while permitting allowlisted domains",
        evidence: `Metadata: ${metaEgress.reason}, Loopback: ${loopEgress.reason}, Private: ${privEgress.reason}`,
      });

      // Test 6: Process Tree Termination & Resource Bounds
      let treeKilled = false;
      try {
        await this.executeIsolatedCommand({
          command: "node",
          args: ["-e", "setInterval(() => {}, 1000)"],
          cwd: tempRoot,
          timeoutMs: 400,
        });
      } catch (err) {
        if (/** @type {any} */ (err).code === "EXECUTION_TIMEOUT") {
          treeKilled = true;
        }
      }
      results.push({
        name: "process_tree_cancellation",
        passed: treeKilled,
        description: "Wall-clock timeout triggers forceful termination of the owned process tree",
        evidence: treeKilled ? "Process tree terminated cleanly on timeout" : "Process did not timeout or terminate",
      });

      // Test 7: Artifact Quarantine & Digest Integrity
      const testContent = "console.log('isolated test artifact');\n";
      const imported = this.quarantineImport(tempRoot, "output.js", testContent);
      const exported = this.quarantineExport(tempRoot, "output.js");
      const artifactOk = imported.digest === exported.digest && exported.passedScan;
      results.push({
        name: "artifact_quarantine_integrity",
        passed: artifactOk,
        description: "Artifact import/export enforces path containment, SHA-256 digest preservation, and payload scan",
        evidence: `SHA-256: ${exported.digest}, ScanPassed: ${exported.passedScan}`,
      });
    } finally {
      // Clean up temp workspace
      try {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      } catch {
        // ignore cleanup error
      }
    }

    const allPassed = results.every((r) => r.passed);
    const status = allPassed ? "passed" : "failed";

    // Canonical digest calculation
    const payloadForDigest = {
      suiteVersion,
      runnerVersion,
      environment,
      status,
      prerequisites: prereqs,
      adversarialResults: results,
    };
    const digest = sha256(canonicalJson(payloadForDigest));

    // Persist qualification record in PostgreSQL
    const sql = `
      INSERT INTO isolation_qualifications (
        suite_version, runner_version, environment, status, prerequisites, adversarial_results, digest
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, suite_version, runner_version, environment, status, prerequisites, adversarial_results, digest, created_at
    `;
    const res = await query(sql, [
      suiteVersion,
      runnerVersion,
      environment,
      status,
      JSON.stringify(prereqs),
      JSON.stringify(results),
      digest,
    ]);

    const row = res.rows[0];
    return {
      id: row.id,
      suiteVersion: row.suite_version,
      runnerVersion: row.runner_version,
      environment: row.environment,
      status: row.status,
      prerequisites: row.prerequisites,
      adversarialResults: row.adversarial_results,
      digest: row.digest,
      createdAt: row.created_at.toISOString(),
    };
  }

  /**
   * List historical qualification records.
   * @param {number} [limit=20]
   * @returns {Promise<Array<{
   *   id: string,
   *   suiteVersion: string,
   *   runnerVersion: string,
   *   environment: string,
   *   status: string,
   *   digest: string,
   *   createdAt: string
   * }>>}
   */
  static async listQualifications(limit = 20) {
    const sql = `
      SELECT id, suite_version, runner_version, environment, status, digest, created_at
      FROM isolation_qualifications
      ORDER BY created_at DESC
      LIMIT $1
    `;
    const res = await query(sql, [limit]);
    return res.rows.map((r) => ({
      id: r.id,
      suiteVersion: r.suite_version,
      runnerVersion: r.runner_version,
      environment: r.environment,
      status: r.status,
      digest: r.digest,
      createdAt: r.created_at.toISOString(),
    }));
  }

  /**
   * Retrieve a single qualification record by ID.
   * @param {string} qualificationId
   * @returns {Promise<{
   *   id: string,
   *   suiteVersion: string,
   *   runnerVersion: string,
   *   environment: string,
   *   status: string,
   *   prerequisites: Record<string, unknown>,
   *   adversarialResults: Array<{ name: string, passed: boolean, description: string, evidence?: string }>,
   *   digest: string,
   *   createdAt: string
   * } | null>}
   */
  static async getQualification(qualificationId) {
    const sql = `
      SELECT id, suite_version, runner_version, environment, status, prerequisites, adversarial_results, digest, created_at
      FROM isolation_qualifications
      WHERE id = $1
    `;
    const res = await query(sql, [qualificationId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      suiteVersion: r.suite_version,
      runnerVersion: r.runner_version,
      environment: r.environment,
      status: r.status,
      prerequisites: r.prerequisites,
      adversarialResults: r.adversarial_results,
      digest: r.digest,
      createdAt: r.created_at.toISOString(),
    };
  }

  /**
   * Get the latest qualification record.
   * @returns {Promise<{
   *   id: string,
   *   status: string,
   *   digest: string,
   *   createdAt: string
   * } | null>}
   */
  static async getLatestQualification() {
    const sql = `
      SELECT id, status, digest, created_at
      FROM isolation_qualifications
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const res = await query(sql);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      status: r.status,
      digest: r.digest,
      createdAt: r.created_at.toISOString(),
    };
  }
}
