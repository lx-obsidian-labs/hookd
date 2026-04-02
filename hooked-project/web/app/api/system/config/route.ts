import { NextResponse } from "next/server";
import { requireAdminApiKey } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const adminGuard = requireAdminApiKey(request);
  if (!adminGuard.ok) {
    return adminGuard.response;
  }

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasAdminKey = Boolean(process.env.ADMIN_DASHBOARD_KEY?.trim());
  const ficaKey = process.env.FICA_ENCRYPTION_KEY?.trim() ?? "";
  const hasFicaKey = Boolean(ficaKey) && ficaKey !== "dev-fica-encryption-key";

  const checks = {
    databaseUrl: {
      ok: hasDatabaseUrl,
      detail: hasDatabaseUrl ? "DATABASE_URL present" : "DATABASE_URL missing",
    },
    adminDashboardKey: {
      ok: hasAdminKey,
      detail: hasAdminKey ? "ADMIN_DASHBOARD_KEY present" : "ADMIN_DASHBOARD_KEY missing",
    },
    ficaEncryptionKey: {
      ok: hasFicaKey,
      detail: hasFicaKey ? "FICA_ENCRYPTION_KEY present" : "FICA_ENCRYPTION_KEY missing or default",
    },
  };

  const ok = checks.databaseUrl.ok && checks.adminDashboardKey.ok && checks.ficaEncryptionKey.ok;

  return NextResponse.json(
    {
      ok,
      environment: process.env.NODE_ENV ?? "development",
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
