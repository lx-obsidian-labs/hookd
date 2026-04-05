import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionRecord, revokeSessionRecord } from "@/lib/server/session-store";
import { applyAuthCookies, clearAuthCookies } from "@/lib/server/auth-cookies";
import { requireAuthenticatedSession } from "@/lib/server/session-auth";
import { getAccountProfileForAuthorization } from "@/lib/server/user-store";

type Body = {
  accountId?: string;
};

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }

  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (payload.accountId && payload.accountId.trim() !== session.accountId) {
    return NextResponse.json({ error: "accountId does not match the active session." }, { status: 403 });
  }

  const accountProfile = await getAccountProfileForAuthorization(session.accountId);
  if (!accountProfile.ok) {
    const response = NextResponse.json({ error: accountProfile.message }, { status: 404 });
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const sessionRecord = await createSessionRecord({
    accountId: session.accountId,
    userAgent,
    ip,
  });

  applyAuthCookies(response, {
    accountId: session.accountId,
    ageVerified: accountProfile.profile.ageVerified,
    ficaVerified: accountProfile.profile.ficaStatus === "verified",
    sessionToken: sessionRecord.id,
  });

  return response;
}

export async function DELETE() {
  const jar = await cookies();
  const sessionToken = jar.get("hooked_session_token")?.value;
  if (sessionToken) {
    await revokeSessionRecord(sessionToken);
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);

  return response;
}
