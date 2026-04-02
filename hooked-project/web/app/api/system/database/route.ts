import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/server/database-health";

export const runtime = "nodejs";

export async function GET() {
  try {
    const health = await checkDatabaseHealth();
    return NextResponse.json(health, { status: health.ok ? 200 : 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database health error.";
    return NextResponse.json(
      {
        ok: false,
        backend: "file-json",
        message,
      },
      { status: 500 },
    );
  }
}
