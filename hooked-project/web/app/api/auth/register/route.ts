import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { createSessionRecord } from "@/lib/server/session-store";
import { registerUser } from "@/lib/server/user-store";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const rateLimit = await enforceRateLimit({
    key: `auth:register:${ip}`,
    limit: 8,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many registration attempts. Please wait and retry." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
      },
    );
  }

  let body: {
    email?: string;
    password?: string;
    displayName?: string;
    firstName?: string;
    surname?: string;
    username?: string;
    role?: "user" | "model";
    age?: number;
    city?: string;
    gender?: string;
    lookingFor?: string[];
    interestedInHookups?: boolean;
    profilePictureUrl?: string;
    description?: string;
    nicheTags?: string[];
    savedPics?: string[];
    savedVideos?: string[];
    ficaLegalName?: string;
    ficaIdNumber?: string;
    ficaDocumentUrl?: string;
    ficaConsent?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.role || (body.role !== "user" && body.role !== "model")) {
    return NextResponse.json({ ok: false, message: "Invalid role." }, { status: 400 });
  }

  const result = await registerUser({
    email: body.email ?? "",
    password: body.password ?? "",
    displayName: body.displayName ?? "",
    firstName: body.firstName ?? "",
    surname: body.surname ?? "",
    username: body.username ?? "",
    role: body.role,
    age: Number(body.age ?? 0),
    city: body.city ?? "",
    gender: body.gender ?? "",
    lookingFor: Array.isArray(body.lookingFor) ? body.lookingFor : [],
    interestedInHookups: Boolean(body.interestedInHookups),
    profilePictureUrl: body.profilePictureUrl ?? "",
    description: body.description ?? "",
    nicheTags: Array.isArray(body.nicheTags) ? body.nicheTags : [],
    savedPics: Array.isArray(body.savedPics) ? body.savedPics : [],
    savedVideos: Array.isArray(body.savedVideos) ? body.savedVideos : [],
    ficaLegalName: body.ficaLegalName ?? "",
    ficaIdNumber: body.ficaIdNumber ?? "",
    ficaDocumentUrl: body.ficaDocumentUrl ?? "",
    ficaConsent: Boolean(body.ficaConsent),
  });

  if (!result.ok) {
    await writeAuditLog({
      action: "auth.register.failed",
      actor: "anonymous",
      target: body.email ?? "",
      ip,
      userAgent,
      details: { role: body.role ?? "unknown" },
    });
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  await writeAuditLog({
    action: "auth.register.success",
    actor: result.user.id,
    target: result.user.email,
    ip,
    userAgent,
    details: { role: result.user.role, username: result.user.username },
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
