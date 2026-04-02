import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { requestOtp } from "@/lib/server/otp-store";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const rate = await enforceRateLimit({ key: `auth:otp:request:${ip}`, limit: 8, windowMs: 60_000 });
  if (!rate.ok) {
    return NextResponse.json({ ok: false, message: "Too many OTP requests. Please wait." }, { status: 429 });
  }

  let body: { phone?: string };
  try {
    body = (await request.json()) as { phone?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
  }

  const phone = (body.phone ?? "").trim();
  if (!/^\+?\d{8,15}$/.test(phone.replace(/\s+/g, ""))) {
    return NextResponse.json({ ok: false, message: "Enter a valid phone number." }, { status: 400 });
  }

  const result = await requestOtp(phone);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  await writeAuditLog({
    action: "auth.otp.requested",
    actor: "anonymous",
    target: phone,
    ip,
    userAgent,
  });

  return NextResponse.json({
    ok: true,
    message: "Verification code sent.",
    ...(process.env.NODE_ENV !== "production" ? { devCode: result.code } : {}),
  });
}
