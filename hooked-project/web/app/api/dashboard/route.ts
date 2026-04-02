import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDashboardSnapshotForAccount } from "@/lib/server/user-store";

export async function GET() {
  const jar = await cookies();
  const accountId = jar.get("hooked_session")?.value;
  if (!accountId) {
    return NextResponse.json({ ok: false, message: "No active session." }, { status: 401 });
  }

  const snapshot = await getDashboardSnapshotForAccount(accountId);
  if (!snapshot.ok) {
    return NextResponse.json(snapshot, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
