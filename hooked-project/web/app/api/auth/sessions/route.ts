import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  listActiveSessionsForAccount,
  revokeOtherSessionsForAccount,
  revokeSessionRecord,
} from "@/lib/server/session-store";

export async function GET() {
  const jar = await cookies();
  const accountId = jar.get("hooked_session")?.value;
  if (!accountId) {
    return NextResponse.json({ ok: false, message: "No active session." }, { status: 401 });
  }

  const sessions = await listActiveSessionsForAccount(accountId);
  const currentToken = jar.get("hooked_session_token")?.value;
  return NextResponse.json({
    ok: true,
    sessions: sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ip: session.ip,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      current: currentToken === session.id,
    })),
  });
}

export async function DELETE(request: Request) {
  const jar = await cookies();
  const accountId = jar.get("hooked_session")?.value;
  const currentToken = jar.get("hooked_session_token")?.value;
  if (!accountId) {
    return NextResponse.json({ ok: false, message: "No active session." }, { status: 401 });
  }

  let body: { sessionId?: string; revokeOthers?: boolean };
  try {
    body = (await request.json()) as { sessionId?: string; revokeOthers?: boolean };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (body.revokeOthers) {
    if (!currentToken) {
      return NextResponse.json({ ok: false, message: "Current session token missing." }, { status: 400 });
    }
    const revoked = await revokeOtherSessionsForAccount(accountId, currentToken);
    return NextResponse.json({ ok: true, revoked });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ ok: false, message: "sessionId is required." }, { status: 400 });
  }

  await revokeSessionRecord(sessionId);
  return NextResponse.json({ ok: true });
}
