import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { createSessionRecord } from "@/lib/server/session-store";
import { verifyOtp } from "@/lib/server/otp-store";
import { createPhoneUser, getUserByPhone } from "@/lib/server/user-store";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const rate = await enforceRateLimit({ key: `auth:otp:verify:${ip}`, limit: 15, windowMs: 60_000 });
  if (!rate.ok) {
    return NextResponse.json({ ok: false, message: "Too many attempts. Please wait." }, { status: 429 });
  }

  let body: { phone?: string; code?: string };
  try {
    body = (await request.json()) as { phone?: string; code?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
  }

  const phone = (body.phone ?? "").trim();
  const code = (body.code ?? "").trim();
  const verified = await verifyOtp(phone, code);
  if (!verified.ok) {
    return NextResponse.json(verified, { status: 401 });
  }

  const existing = await getUserByPhone(phone);
  let account = existing.ok ? existing.user : undefined;
  if (!account) {
    const created = await createPhoneUser(phone);
    if (!created.ok) {
      return NextResponse.json({ ok: false, message: created.message }, { status: 400 });
    }
    account = created.user;
  }

  const sessionRecord = await createSessionRecord({ accountId: account.id, userAgent, ip });
  await writeAuditLog({
    action: "auth.otp.verified",
    actor: account.id,
    target: phone,
    ip,
    userAgent,
  });

  const response = NextResponse.json({ ok: true, account });
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("hooked_session", account.id, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set("hooked_age_verified", account.ageVerified ? "1" : "0", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set("hooked_fica_verified", account.fica.status === "verified" ? "1" : "0", {
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
