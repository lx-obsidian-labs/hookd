import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { setAgeVerifiedCookie } from "@/lib/server/auth-cookies";
import { requireAuthenticatedSession } from "@/lib/server/session-auth";
import { markUserAgeVerified } from "@/lib/server/user-store";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }
  const { accountId } = session;

  const updated = await markUserAgeVerified(accountId);
  if (!updated.ok) {
    await writeAuditLog({
      action: "auth.age_verification.failed",
      actor: accountId,
      target: accountId,
      ip,
      userAgent,
      details: { reason: updated.message },
    });
    return NextResponse.json({ ok: false, message: updated.message }, { status: 404 });
  }

  await writeAuditLog({
    action: "auth.age_verification.success",
    actor: accountId,
    target: accountId,
    ip,
    userAgent,
  });

  const response = NextResponse.json({ ok: true });
  setAgeVerifiedCookie(response, true);

  return response;
}
