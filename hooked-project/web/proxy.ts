import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/profile",
  "/dashboard",
  "/discover",
  "/hookup",
  "/likes",
  "/matches",
  "/chat",
  "/ai-companion",
  "/onboarding",
  "/wallet",
  "/calls",
  "/safety",
  "/verify-age",
  "/admin",
];

const AGE_GATED_PREFIXES = ["/wallet", "/calls", "/safety"];
const FICA_GATED_PREFIXES = ["/wallet", "/calls"];

type SessionValidationPayload = {
  ok: boolean;
  account?: {
    ageVerified: boolean;
    ficaVerified: boolean;
  };
};

type ProxyRouteDecisionInput = {
  pathname: string;
  search: string;
  isProtected: boolean;
  hasSessionCookie: boolean;
  hasSessionTokenCookie: boolean;
  account: { ageVerified: boolean; ficaVerified: boolean } | null;
};

export function resolveProxyRedirectPath(input: ProxyRouteDecisionInput) {
  if (!input.isProtected) {
    return null;
  }

  const nextPath = `${input.pathname}${input.search}`;
  if (!input.hasSessionCookie || !input.hasSessionTokenCookie || !input.account) {
    return `/auth/sign-in?next=${encodeURIComponent(nextPath)}`;
  }

  const isAgeGated = AGE_GATED_PREFIXES.some(
    (prefix) => input.pathname === prefix || input.pathname.startsWith(`${prefix}/`),
  );
  if (!isAgeGated) {
    return null;
  }

  if (!input.account.ageVerified) {
    return `/verify-age?next=${encodeURIComponent(nextPath)}`;
  }

  const isFicaGated = FICA_GATED_PREFIXES.some(
    (prefix) => input.pathname === prefix || input.pathname.startsWith(`${prefix}/`),
  );
  if (!isFicaGated || input.account.ficaVerified) {
    return null;
  }

  return `/safety?next=${encodeURIComponent(nextPath)}&reason=verification`;
}

async function validateSessionForProxy(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const response = await fetch(new URL("/api/auth/session/validate", request.url), {
    method: "GET",
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as SessionValidationPayload;
  if (!payload.ok || !payload.account) {
    return null;
  }

  return payload.account;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const session = request.cookies.get("hooked_session")?.value;
  const sessionToken = request.cookies.get("hooked_session_token")?.value;
  const account = session && sessionToken ? await validateSessionForProxy(request) : null;

  const redirectPath = resolveProxyRedirectPath({
    pathname,
    search,
    isProtected,
    hasSessionCookie: Boolean(session),
    hasSessionTokenCookie: Boolean(sessionToken),
    account,
  });

  if (redirectPath) {
    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    const redirectedToSignIn = redirectPath.startsWith("/auth/sign-in");
    if (redirectedToSignIn && (session || sessionToken) && !account) {
      response.cookies.set("hooked_session", "", { path: "/", maxAge: 0 });
      response.cookies.set("hooked_session_token", "", { path: "/", maxAge: 0 });
      response.cookies.set("hooked_age_verified", "0", { path: "/", maxAge: 0 });
      response.cookies.set("hooked_fica_verified", "0", { path: "/", maxAge: 0 });
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/dashboard/:path*",
    "/discover/:path*",
    "/hookup/:path*",
    "/likes/:path*",
    "/matches/:path*",
    "/chat/:path*",
    "/ai-companion/:path*",
    "/onboarding/:path*",
    "/wallet/:path*",
    "/calls/:path*",
    "/safety/:path*",
    "/verify-age/:path*",
    "/admin/:path*",
  ],
};
