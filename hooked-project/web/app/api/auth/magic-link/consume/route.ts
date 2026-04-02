import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { consumeMagicLink } from "@/lib/server/magic-link-store";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { createSessionRecord } from "@/lib/server/session-store";
import { getOrCreateEmailMagicUser } from "@/lib/server/user-store";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token.trim()) {
    return NextResponse.redirect(new URL("/auth/sign-in?magic=invalid", request.url));
  }

  const consumed = await consumeMagicLink(token);
  if (!consumed.ok) {
    return NextResponse.redirect(new URL("/auth/sign-in?magic=invalid", request.url));
  }

  const userResult = await getOrCreateEmailMagicUser(consumed.email);
  if (!userResult.ok) {
    return NextResponse.redirect(new URL("/auth/sign-in?magic=invalid", request.url));
  }

  const sessionRecord = await createSessionRecord({
    accountId: userResult.user.id,
    userAgent,
    ip,
  });

  await writeAuditLog({
    action: "auth.magic_link.consumed",
    actor: userResult.user.id,
    target: userResult.user.email,
    ip,
    userAgent,
    details: { created: userResult.created },
  });

  const nextPath = userResult.created ? "/onboarding/basic" : "/dashboard";
  const response = NextResponse.redirect(new URL(nextPath, request.url));
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("hooked_session", userResult.user.id, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set("hooked_age_verified", userResult.user.ageVerified ? "1" : "0", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set("hooked_fica_verified", userResult.user.fica.status === "verified" ? "1" : "0", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set("hooked_session_token", sessionRecord.id, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
