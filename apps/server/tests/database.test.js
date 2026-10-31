import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, transaction, query } from "../config/db.js";

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

test("database owner connects and validates readiness", async () => {
  const isReady = await owner.ready();
  assert.equal(isReady, true, "Database owner must report ready");

  const ping = await query("SELECT 1 AS alive");
  assert.equal(ping.rows[0].alive, 1, "SELECT 1 query must succeed");
});

test("database transactions commit on success and rollback on error", async () => {
  const testEmail = "tx-test@example.com";
  await query("DELETE FROM users WHERE email = $1", [testEmail]);

  // Successful transaction commits
  await transaction(async (client) => {
    await client.query("INSERT INTO users (email, name) VALUES ($1, $2)", [testEmail, "Tx User"]);
  });

  const found = await query("SELECT * FROM users WHERE email = $1", [testEmail]);
  assert.equal(found.rows.length, 1, "Committed user must exist");

  // Failing transaction rolls back
  const rollbackEmail = "rollback-test@example.com";
  await query("DELETE FROM users WHERE email = $1", [rollbackEmail]);

  await assert.rejects(
    transaction(async (client) => {
      await client.query("INSERT INTO users (email, name) VALUES ($1, $2)", [rollbackEmail, "Rollback User"]);
      throw new Error("Deliberate failure to test rollback");
    }),
    /Deliberate failure to test rollback/
  );

  const notFound = await query("SELECT * FROM users WHERE email = $1", [rollbackEmail]);
  assert.equal(notFound.rows.length, 0, "Rolled-back user must not exist");

  await query("DELETE FROM users WHERE email = $1", [testEmail]);
});

// Canonical identity, project, and conversation tests live in identity.test.js and projects.test.js.
