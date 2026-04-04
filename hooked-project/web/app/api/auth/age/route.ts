import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeAuditLog } from "@/lib/server/audit-log";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { setAgeVerifiedCookie } from "@/lib/server/auth-cookies";
import { markUserAgeVerified } from "@/lib/server/user-store";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const jar = await cookies();
  const accountId = jar.get("hooked_session")?.value;

  if (!accountId) {
    return NextResponse.json({ ok: false, message: "No active session." }, { status: 401 });
  }

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
