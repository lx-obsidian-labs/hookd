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

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const session = request.cookies.get("hooked_session")?.value;
  if (session) {
    const isAgeGated = AGE_GATED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (!isAgeGated) {
      return NextResponse.next();
    }

    const ageVerified = request.cookies.get("hooked_age_verified")?.value === "1";
    if (ageVerified) {
      const isFicaGated = FICA_GATED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );
      if (!isFicaGated) {
        return NextResponse.next();
      }

      const ficaVerified = request.cookies.get("hooked_fica_verified")?.value === "1";
      if (ficaVerified) {
        return NextResponse.next();
      }

      const complianceUrl = new URL("/safety", request.url);
      complianceUrl.searchParams.set("next", `${pathname}${search}`);
      complianceUrl.searchParams.set("reason", "verification");
      return NextResponse.redirect(complianceUrl);
    }

    const verifyUrl = new URL("/verify-age", request.url);
    verifyUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(verifyUrl);
  }

  const signInUrl = new URL("/auth/sign-in", request.url);
  signInUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(signInUrl);
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
