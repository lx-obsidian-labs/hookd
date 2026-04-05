import assert from "node:assert/strict";
import test from "node:test";
import { resolveProxyRedirectPath } from "../proxy";

test("resolveProxyRedirectPath allows non-protected paths", () => {
  const redirect = resolveProxyRedirectPath({
    pathname: "/",
    search: "",
    isProtected: false,
    hasSessionCookie: false,
    hasSessionTokenCookie: false,
    account: null,
  });

  assert.equal(redirect, null);
});

test("resolveProxyRedirectPath sends unauthenticated users to sign-in", () => {
  const redirect = resolveProxyRedirectPath({
    pathname: "/dashboard",
    search: "?view=discover",
    isProtected: true,
    hasSessionCookie: false,
    hasSessionTokenCookie: false,
    account: null,
  });

  assert.equal(redirect, "/auth/sign-in?next=%2Fdashboard%3Fview%3Ddiscover");
});

test("resolveProxyRedirectPath sends stale-session requests to sign-in", () => {
  const redirect = resolveProxyRedirectPath({
    pathname: "/dashboard",
    search: "",
    isProtected: true,
    hasSessionCookie: true,
    hasSessionTokenCookie: true,
    account: null,
  });

  assert.equal(redirect, "/auth/sign-in?next=%2Fdashboard");
});

test("resolveProxyRedirectPath requires age verification for age-gated paths", () => {
  const redirect = resolveProxyRedirectPath({
    pathname: "/wallet",
    search: "",
    isProtected: true,
    hasSessionCookie: true,
    hasSessionTokenCookie: true,
    account: { ageVerified: false, ficaVerified: false },
  });

  assert.equal(redirect, "/verify-age?next=%2Fwallet");
});

test("resolveProxyRedirectPath requires FICA verification for wallet and calls", () => {
  const redirect = resolveProxyRedirectPath({
    pathname: "/calls",
    search: "?room=vip",
    isProtected: true,
    hasSessionCookie: true,
    hasSessionTokenCookie: true,
    account: { ageVerified: true, ficaVerified: false },
  });

  assert.equal(redirect, "/safety?next=%2Fcalls%3Froom%3Dvip&reason=verification");
});

test("resolveProxyRedirectPath allows verified users", () => {
  const redirect = resolveProxyRedirectPath({
    pathname: "/wallet",
    search: "",
    isProtected: true,
    hasSessionCookie: true,
    hasSessionTokenCookie: true,
    account: { ageVerified: true, ficaVerified: true },
  });

  assert.equal(redirect, null);
});
