import { NextResponse } from "next/server";
import { requireAdminApiKey } from "@/lib/server/admin-auth";
import { migrateLegacyJsonStores } from "@/lib/server/database-migrate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminGuard = requireAdminApiKey(request);
  if (!adminGuard.ok) {
    return adminGuard.response;
  }

  try {
    const result = await migrateLegacyJsonStores();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to migrate legacy database files.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
