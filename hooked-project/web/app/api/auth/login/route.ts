import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { createSessionRecord } from "@/lib/server/session-store";
import { loginUser } from "@/lib/server/user-store";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const rateLimit = await enforceRateLimit({
    key: `auth:login:${ip}`,
    limit: 15,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many login attempts. Please wait and retry." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
      },
    );
  }

  let body: {
    email?: string;
    password?: string;
    role?: "user" | "model";
    otpCode?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.role || (body.role !== "user" && body.role !== "model")) {
    return NextResponse.json({ ok: false, message: "Invalid role." }, { status: 400 });
  }

  const email = body.email ?? "";

  const result = await loginUser({
    email,
    password: body.password ?? "",
    role: body.role,
    otpCode: body.otpCode,
  });

  if (!result.ok) {
    await writeAuditLog({
      action: "auth.login.failed",
      actor: "anonymous",
      target: email,
      ip,
      userAgent,
      details: { role: body.role },
    });
    const lower = (result.message ?? "").toLowerCase();
    const safeMessage =
      lower.includes("temporarily locked") || lower.includes("too many")
        ? result.message
        : lower.includes("2fa")
          ? result.message
          : "Incorrect login details.";
    return NextResponse.json({ ok: false, message: safeMessage }, { status: 401 });
  }

  await writeAuditLog({
    action: "auth.login.success",
    actor: result.user.id,
    target: result.user.email,
    ip,
    userAgent,
    details: { role: result.user.role },
  });

  const response = NextResponse.json({ ok: true, account: result.user });
  const secure = process.env.NODE_ENV === "production";
  const sessionRecord = await createSessionRecord({
    accountId: result.user.id,
    userAgent,
    ip,
  });

  response.cookies.set("hooked_session", result.user.id, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  response.cookies.set("hooked_age_verified", result.user.ageVerified ? "1" : "0", {
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

  response.cookies.set("hooked_fica_verified", result.user.fica.status === "verified" ? "1" : "0", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
