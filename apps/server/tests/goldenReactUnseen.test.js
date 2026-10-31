import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, query } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage17Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { serve, request } from "./helpers.js";
import { AgentExecutionEngine } from "../services/agentExecutionEngine.js";
import { ToolRuntimeService } from "../services/toolRuntimeService.js";

loadEnvironment();
const config = readRuntimeConfig(process.env);
const logger = createLogger(config);
let owner;

before(async () => {
  owner = createDatabaseOwner(config.database, logger);
  activateDatabaseOwner(owner);
  await owner.initialize();
});

after(async () => {
  if (owner) await owner.close();
});

function createTestApp() {
  const healthController = createHealthController({
    checkDatabase: () => owner.ready(),
    cleanExpiredLeases: async () => {},
  });
  return createApp({
    healthController,
    apiRoutes,
    auditContext: (req, res, next) => next(),
    rateLimiter: (req, res, next) => next(),
    allowedOrigins: ["http://127.0.0.1:5173"],
    logError: () => {},
    admission: stage17Admission,
  });
}

async function createAuthenticatedSession(base) {
  const { challenge, clientNonce } = generateLauncherChallenge(60000);
  const bootstrapRes = await request(base, "/api/v1/session/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge, clientNonce }),
  });
  assert.equal(bootstrapRes.status, 200);
  const cookie = bootstrapRes.headers.get("set-cookie") || "";
  const bootstrapBody = await bootstrapRes.json();
  const csrfToken = bootstrapBody.data.csrfToken;
  const workspaceId = bootstrapBody.data.workspaceId;
  return { cookie, csrfToken, workspaceId };
}

test("Phase 32: Second Unseen Project - React/Vite Component Discovery & ReAct Loop", { timeout: 120000 }, async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

  // 1. Setup fresh React/Vite fixture on disk
  const sampleReactDir = fs.mkdtempSync(path.join(os.tmpdir(), "sirona-unseen-react-"));
  fs.mkdirSync(path.join(sampleReactDir, "src"), { recursive: true });
  fs.mkdirSync(path.join(sampleReactDir, "tests"), { recursive: true });

  fs.writeFileSync(
    path.join(sampleReactDir, "package.json"),
    JSON.stringify(
      {
        name: "product-catalog-vite",
        version: "0.1.0",
        type: "module",
        scripts: { test: "node --test" },
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(sampleReactDir, "src", "ProductList.js"),
    `export function renderProductList(products = []) {
  if (!products || products.length === 0) {
    return "<div class=\\"products-container\\"></div>";
  }
  const items = products.map((p) => \`<li class="product-item">\${p.name} - $\${p.price}</li>\`).join("");
  return \`<ul class="products-list">\${items}</ul>\`;
}
`
  );

  fs.writeFileSync(
    path.join(sampleReactDir, "tests", "ProductList.test.js"),
    `import test from "node:test";
import assert from "node:assert/strict";
import { renderProductList } from "../src/ProductList.js";

test("renderProductList renders items when present", () => {
  const html = renderProductList([{ name: "Laptop", price: 1200 }]);
  assert.match(html, /Laptop - \\$1200/);
});

test("renderProductList renders EmptyState when products list has no items", () => {
  const html = renderProductList([]);
  assert.match(html, /empty-state/, "Should render empty-state container");
  assert.match(html, /No products found/, "Should display empty state message");
});
`
  );

  fs.writeFileSync(
    path.join(sampleReactDir, "README.md"),
    "# Product Catalog\nReact/Vite product view catalog.\n"
  );

  t.after(() => {
    try { fs.rmSync(sampleReactDir, { recursive: true, force: true }); } catch {}
  });

  // 2. Register project through API
  let projectId;
  await t.test("Register React Project", async () => {
    const regRes = await request(base, "/api/v1/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        name: "product-catalog-vite",
        primaryPath: sampleReactDir,
        engine: "nodejs",
      }),
    });
    assert.equal(regRes.status, 201);
    const body = await regRes.json();
    projectId = body.data.project.id;
    assert.ok(projectId);

    // Grant project capabilities for mutation & execution
    await query(
      `INSERT INTO capability_grants (project_id, capability, resource_scope, expires_at)
       VALUES ($1, 'fs_write', '{}', NOW() + INTERVAL '2 hours'),
              ($1, 'workspace_mutation', '{}', NOW() + INTERVAL '2 hours'),
              ($1, 'shell_exec', '{}', NOW() + INTERVAL '2 hours'),
              ($1, 'bounded_process', '{}', NOW() + INTERVAL '2 hours')`,
      [projectId]
    );
  });

  // 3. Scan React project
  await t.test("Scan React Project", async () => {
    const scanRes = await request(base, `/api/v1/projects/${projectId}/scan`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
    });
    assert.equal(scanRes.status, 200);
    const body = await scanRes.json();
    assert.ok(body.data.fileCount >= 3);
  });

  // 4. Autonomous Agent Execution: Model-driven ReAct loop
  await t.test("Autonomous ReAct Loop modifies React component and tests pass", async () => {
    // We provide a realistic multi-turn model executor that simulates the model discovering files,
    // creating EmptyState.js, updating ProductList.js, executing tests in sandbox, and proposing completion.
    const reactModelExecutor = async ({ turn }) => {
      if (turn === 1) {
        // Step 1: Discover directory contents
        return {
          content: "I will list the directory to inspect project structure.",
          tool_calls: [
            {
              id: "call_list",
              name: "list_directory",
              args: { path: "src" },
            },
          ],
        };
      } else if (turn === 2) {
        // Step 2: Read existing ProductList.js
        return {
          content: "I will read ProductList.js to see existing implementation and styling.",
          tool_calls: [
            {
              id: "call_read_product",
              name: "read_file",
              args: { path: "src/ProductList.js" },
            },
          ],
        };
      } else if (turn === 3) {
        // Step 3: Create EmptyState.js component
        return {
          content: "I will create the reusable EmptyState component in src/EmptyState.js.",
          tool_calls: [
            {
              id: "call_write_empty",
              name: "write_file",
              args: {
                path: "src/EmptyState.js",
                content: `export function EmptyState({ message = "No products found" } = {}) {
  return \`<div class="empty-state"><p class="empty-message">\${message}</p></div>\`;
}
`,
              },
            },
          ],
        };
      } else if (turn === 4) {
        // Step 4: Update ProductList.js to use EmptyState
        return {
          content: "Now I will update ProductList.js to import and render EmptyState when empty.",
          tool_calls: [
            {
              id: "call_write_product",
              name: "write_file",
              args: {
                path: "src/ProductList.js",
                content: `import { EmptyState } from "./EmptyState.js";

export function renderProductList(products = []) {
  if (!products || products.length === 0) {
    return EmptyState({ message: "No products found" });
  }
  const items = products.map((p) => \`<li class="product-item">\${p.name} - $\${p.price}</li>\`).join("");
  return \`<ul class="products-list">\${items}</ul>\`;
}
`,
              },
            },
          ],
        };
      } else if (turn === 5) {
        // Step 5: Execute project test in sandbox
        return {
          content: "Now I will run the test suite to verify tests pass.",
          tool_calls: [
            {
              id: "call_exec_test",
              name: "execute_command",
              args: {
                command: "node",
                args: ["--test", "tests/ProductList.test.js"],
              },
            },
          ],
        };
      } else {
        // Step 6: Propose completion
        return {
          content: "All tests pass cleanly. Proposing task completion.",
          tool_calls: [
            {
              id: "call_complete",
              name: "propose_task_completion",
              args: {
                summary: "Created reusable EmptyState component and updated ProductList to render it when products list is empty. Verified node --test passes cleanly.",
                filesModified: ["src/EmptyState.js", "src/ProductList.js"],
              },
            },
          ],
        };
      }
    };

    const engineResult = await AgentExecutionEngine.executeAgentTask({
      workspaceRoot: sampleReactDir,
      projectId,
      prompt: "Add a reusable EmptyState component and display it when the products list has no items. Add or update tests as appropriate.",
      modelExecutor: reactModelExecutor,
    });

    assert.equal(engineResult.completed, true);
    assert.equal(engineResult.filesModified.includes("src/EmptyState.js"), true);
    assert.equal(engineResult.filesModified.includes("src/ProductList.js"), true);

    // Verify files on disk
    const emptyStateContent = fs.readFileSync(path.join(sampleReactDir, "src", "EmptyState.js"), "utf8");
    assert.match(emptyStateContent, /export function EmptyState/);

    const productListContent = fs.readFileSync(path.join(sampleReactDir, "src", "ProductList.js"), "utf8");
    assert.match(productListContent, /import \{ EmptyState \} from "\.\/EmptyState\.js"/);

    // Verify test execution inside sandbox
    const testExecution = await ToolRuntimeService.invokeTool({
      toolName: "execute_command",
      input: { command: "node", args: ["--test", "tests/ProductList.test.js"] },
      workspaceRoot: sampleReactDir,
      projectId,
    });
    assert.equal(testExecution.output.exitCode, 0, "node --test must pass cleanly");
    assert.match(String(testExecution.output.stdout), /pass 2/);
  });
});
