import { NextResponse } from "next/server";
import {
  listActiveSessionsForAccount,
  revokeOtherSessionsForAccount,
  revokeSessionRecordForAccount,
} from "@/lib/server/session-store";
import { requireAuthenticatedSession } from "@/lib/server/session-auth";

export async function GET() {
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }
  const { accountId, sessionToken } = session;

  const sessions = await listActiveSessionsForAccount(accountId);
  return NextResponse.json({
    ok: true,
    sessions: sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ip: session.ip,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      current: sessionToken === session.id,
    })),
  });
}

export async function DELETE(request: Request) {
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }
  const { accountId, sessionToken } = session;

  let body: { sessionId?: string; revokeOthers?: boolean };
  try {
    body = (await request.json()) as { sessionId?: string; revokeOthers?: boolean };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (body.revokeOthers) {
    const revoked = await revokeOtherSessionsForAccount(accountId, sessionToken);
    return NextResponse.json({ ok: true, revoked });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ ok: false, message: "sessionId is required." }, { status: 400 });
  }

  const revoked = await revokeSessionRecordForAccount(sessionId, accountId);
  if (!revoked) {
    return NextResponse.json({ ok: false, message: "Session not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
