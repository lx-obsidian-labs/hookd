import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionRecord, revokeSessionRecord } from "@/lib/server/session-store";

type Body = {
  accountId?: string;
  ageVerified?: boolean;
  ficaVerified?: boolean;
};

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

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
  const secure = process.env.NODE_ENV === "production";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const sessionRecord = await createSessionRecord({
    accountId,
    userAgent,
    ip,
  });

  response.cookies.set("hooked_session", accountId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  response.cookies.set("hooked_age_verified", payload.ageVerified ? "1" : "0", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  response.cookies.set("hooked_fica_verified", payload.ficaVerified ? "1" : "0", {
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

export async function DELETE() {
  const jar = await cookies();
  const sessionToken = jar.get("hooked_session_token")?.value;
  if (sessionToken) {
    await revokeSessionRecord(sessionToken);
  }

  const response = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set("hooked_session", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("hooked_age_verified", "0", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("hooked_fica_verified", "0", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("hooked_session_token", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
