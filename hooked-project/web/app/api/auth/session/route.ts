import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionRecord, revokeSessionRecord } from "@/lib/server/session-store";
import { applyAuthCookies, clearAuthCookies } from "@/lib/server/auth-cookies";

type Body = {
  accountId?: string;
  ageVerified?: boolean;
  ficaVerified?: boolean;
};

export async function POST(request: Request) {
  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const accountId = payload.accountId?.trim();
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const sessionRecord = await createSessionRecord({
    accountId,
    userAgent,
    ip,
  });

  applyAuthCookies(response, {
    accountId,
    ageVerified: Boolean(payload.ageVerified),
    ficaVerified: Boolean(payload.ficaVerified),
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
