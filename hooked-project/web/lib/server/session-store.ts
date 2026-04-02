import { randomUUID } from "node:crypto";
import { readStoreValue, writeStoreValue } from "@/lib/server/kv-store";

type SessionRecord = {
  id: string;
  accountId: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  userAgent: string;
  ip: string;
  revokedAt: string | null;
};

const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30;

async function readSessions(): Promise<SessionRecord[]> {
  const sessions = await readStoreValue<SessionRecord[]>("sessions", []);
  return Array.isArray(sessions) ? sessions : [];
}

async function writeSessions(sessions: SessionRecord[]) {
  await writeStoreValue("sessions", sessions);
}

function compactSessions(sessions: SessionRecord[]) {
  const now = Date.now();
  return sessions.filter((session) => {
    if (session.revokedAt) {
      return new Date(session.revokedAt).getTime() > now - 1000 * 60 * 60 * 24 * 30;
    }
    return new Date(session.expiresAt).getTime() > now;
  });
}

export async function createSessionRecord(input: {
  accountId: string;
  userAgent?: string;
  ip?: string;
}) {
  const now = new Date();
  const createdAt = now.toISOString();
  const record: SessionRecord = {
    id: `sess_${randomUUID()}`,
    accountId: input.accountId,
    createdAt,
    lastSeenAt: createdAt,
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString(),
    userAgent: input.userAgent ?? "unknown",
    ip: input.ip ?? "unknown",
    revokedAt: null,
  };

  const sessions = compactSessions(await readSessions());
  sessions.push(record);
  await writeSessions(sessions);
  return record;
}

export async function revokeSessionRecord(sessionId: string) {
  const sessions = compactSessions(await readSessions());
  const index = sessions.findIndex((item) => item.id === sessionId);
  if (index === -1) {
    return;
  }
  sessions[index] = { ...sessions[index], revokedAt: new Date().toISOString() };
  await writeSessions(sessions);
}

export async function listActiveSessionsForAccount(accountId: string) {
  const sessions = compactSessions(await readSessions());
  const now = Date.now();
  const items = sessions
    .filter(
      (session) =>
        session.accountId === accountId &&
        !session.revokedAt &&
        new Date(session.expiresAt).getTime() > now,
    )
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

  await writeSessions(sessions);
  return items;
}

export async function revokeOtherSessionsForAccount(accountId: string, currentSessionId: string) {
  const sessions = compactSessions(await readSessions());
  const now = new Date().toISOString();
  let revoked = 0;

  for (let index = 0; index < sessions.length; index += 1) {
    const session = sessions[index];
    if (session.accountId !== accountId || session.id === currentSessionId || session.revokedAt) {
      continue;
    }
    sessions[index] = { ...session, revokedAt: now };
    revoked += 1;
  }

  await writeSessions(sessions);
  return revoked;
}
