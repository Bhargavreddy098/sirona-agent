import assert from "node:assert/strict";
import { STATUS_CODES } from "node:http";
export async function assertProblem(res, status, code, detail) {
  assert.equal(res.status, status);
  assert.match(res.headers.get("content-type"), /^application\/problem\+json/);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ["type", "title", "status", "code", "detail", "requestId", "retryable"].sort());
  assert.equal(body.type, "about:blank");
  assert.equal(body.title, STATUS_CODES[status]);
  assert.equal(body.status, status);
  assert.equal(body.code, code);
  assert.equal(body.detail, detail);
  assert.equal(body.requestId, res.headers.get("x-request-id"));
  assert.match(body.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(body.retryable, status === 429 || status === 503);
  assert.doesNotMatch(JSON.stringify(body), /CANARY_SECRET|SELECT|private\/path|stack/);
  return body;
}
