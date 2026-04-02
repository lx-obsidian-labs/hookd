import { NextResponse } from "next/server";

export function requireAdminApiKey(request: Request) {
  const keyFromHeader = request.headers.get("x-admin-key")?.trim();
  const expected =
    process.env.ADMIN_DASHBOARD_KEY ??
    (process.env.NODE_ENV !== "production" ? "dev-admin-key" : undefined);

  if (!expected) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Admin key is not configured on server." },
        { status: 500 },
      ),
    };
  }

  if (!keyFromHeader || keyFromHeader !== expected) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "Unauthorized admin key." }, { status: 401 }),
    };
  }

  return { ok: true as const };
}
