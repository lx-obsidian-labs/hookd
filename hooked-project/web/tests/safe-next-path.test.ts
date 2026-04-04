import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultDashboardPathForRole,
  resolvePostAuthPath,
  sanitizeNextPath,
} from "../lib/safe-next-path";

test("sanitizeNextPath keeps local paths", () => {
  assert.equal(sanitizeNextPath("/dashboard?view=discover", "/dashboard"), "/dashboard?view=discover");
  assert.equal(sanitizeNextPath("/chat?match=abc", "/dashboard"), "/chat?match=abc");
});

test("sanitizeNextPath blocks dangerous and auth/api paths", () => {
  assert.equal(sanitizeNextPath("https://evil.example", "/dashboard"), "/dashboard");
  assert.equal(sanitizeNextPath("//evil.example/path", "/dashboard"), "/dashboard");
  assert.equal(sanitizeNextPath("/auth/sign-in", "/dashboard"), "/dashboard");
  assert.equal(sanitizeNextPath("/api/auth/login", "/dashboard"), "/dashboard");
  assert.equal(sanitizeNextPath("\\evil", "/dashboard"), "/dashboard");
});

test("resolvePostAuthPath uses role-based dashboard fallback", () => {
  assert.equal(resolvePostAuthPath({ role: "user" }), defaultDashboardPathForRole("user"));
  assert.equal(resolvePostAuthPath({ role: "model" }), defaultDashboardPathForRole("model"));
});

test("resolvePostAuthPath prefers safe requested path", () => {
  assert.equal(
    resolvePostAuthPath({ role: "user", requestedPath: "/matches" }),
    "/matches",
  );
  assert.equal(
    resolvePostAuthPath({ role: "model", requestedPath: "https://bad.site" }),
    defaultDashboardPathForRole("model"),
  );
});
