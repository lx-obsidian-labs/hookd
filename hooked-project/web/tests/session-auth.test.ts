import assert from "node:assert/strict";
import test from "node:test";
import { validateSessionIdentity } from "../lib/server/session-auth";
import { createSessionRecord } from "../lib/server/session-store";

test("validateSessionIdentity accepts matching active session", async () => {
  const accountId = `acct-test-${crypto.randomUUID()}`;
  const session = await createSessionRecord({ accountId, ip: "127.0.0.1", userAgent: "test-suite" });

  const result = await validateSessionIdentity({
    accountId,
    sessionToken: session.id,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.accountId, accountId);
    assert.equal(result.sessionToken, session.id);
  }
});

test("validateSessionIdentity rejects missing cookie values", async () => {
  const result = await validateSessionIdentity({ accountId: "", sessionToken: "" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "missing");
  }
});

test("validateSessionIdentity rejects account/session mismatches", async () => {
  const accountId = `acct-test-${crypto.randomUUID()}`;
  const session = await createSessionRecord({ accountId, ip: "127.0.0.1", userAgent: "test-suite" });

  const result = await validateSessionIdentity({
    accountId: `${accountId}-other`,
    sessionToken: session.id,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "invalid");
  }
});
