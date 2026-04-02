import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { requestMagicLink } from "@/lib/server/magic-link-store";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const rate = await enforceRateLimit({ key: `auth:magic:request:${ip}`, limit: 8, windowMs: 60_000 });
  if (!rate.ok) {
    return NextResponse.json({ ok: false, message: "Too many requests. Please wait." }, { status: 429 });
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 });
  }

  const token = await requestMagicLink(email);
  const origin = new URL(request.url).origin;
  const link = `${origin}/api/auth/magic-link/consume?token=${encodeURIComponent(token)}`;

  await writeAuditLog({
    action: "auth.magic_link.requested",
    actor: "anonymous",
    target: email,
    ip,
    userAgent,
  });

  return NextResponse.json({
    ok: true,
    message: "If this email is eligible, a magic link has been sent.",
    ...(process.env.NODE_ENV !== "production" ? { devLink: link } : {}),
  });
}
