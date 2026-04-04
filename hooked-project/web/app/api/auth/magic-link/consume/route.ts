import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { consumeMagicLink } from "@/lib/server/magic-link-store";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { createSessionRecord } from "@/lib/server/session-store";
import { applyAuthCookies } from "@/lib/server/auth-cookies";
import { getOrCreateEmailMagicUser } from "@/lib/server/user-store";

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

  const nextPath = "/dashboard";
  const response = NextResponse.redirect(new URL(nextPath, request.url));
  applyAuthCookies(response, {
    accountId: userResult.user.id,
    ageVerified: userResult.user.ageVerified,
    ficaVerified: userResult.user.fica.status === "verified",
    sessionToken: sessionRecord.id,
  });

  return response;
}
