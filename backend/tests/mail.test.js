import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { emailService } from "../services/emailService.js";
import { emailQueue } from "../services/queues/emailQueue.js";
import { notificationDispatcher } from "../services/notificationDispatcher.js";
for (const operation of ["sendEmail", "sendApprovalAlert"]) {
  test('deferred ' + operation + ' rejects without inspecting message or SMTP configuration', async () => {
    const canary = new Proxy({}, { get() { throw new Error("message must not be inspected"); } });
    await assert.rejects(emailService[operation](canary, {}), {
      code: "EMAIL_DELIVERY_UNAVAILABLE", message: "Email delivery is not qualified",
    });
  });
}
test("deferred queue refuses admission and processing without retry timers", async () => {
  assert.throws(() => emailQueue.add({ to: "fixture@example.invalid" }), { code: "EMAIL_DELIVERY_UNAVAILABLE" });
  await assert.rejects(emailQueue.process(), { code: "EMAIL_DELIVERY_UNAVAILABLE" });
});
test("dispatcher retains socket-only behavior and surfaces deferred mail failure", () => {
  const alert = { sessionId: "fixture", runId: "fixture", promptId: "fixture", toolName: "fixture", command: "fixture", userEmail: undefined };
  assert.doesNotThrow(() => notificationDispatcher.dispatchApprovalAlert(alert));
  assert.throws(() => notificationDispatcher.dispatchApprovalAlert({ ...alert, userEmail: "fixture@example.invalid" }), { code: "EMAIL_DELIVERY_UNAVAILABLE" });
});
test("configured deferred delivery logs no credentials, recipients, message or fake success", () => {
  const script = `const {emailService}=await import(${JSON.stringify(new URL("../services/emailService.js", import.meta.url).href)});
    try {await emailService.sendEmail({to:'secret-recipient',text:'secret-body'});process.exitCode=2;}
    catch(e){if(e.code!=='EMAIL_DELIVERY_UNAVAILABLE'||e.message!=='Email delivery is not qualified')process.exitCode=3;}`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    encoding: "utf8", timeout: 5000,
    env: { SystemRoot: process.env.SystemRoot, NODE_ENV: "production", SMTP_HOST: "smtp.invalid", SMTP_USER: "secret-user", SMTP_PASS: "secret-password" },
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout + result.stderr, "");
});
