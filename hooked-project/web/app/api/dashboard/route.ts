import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/server/session-auth";
import { getDashboardSnapshotForAccount } from "@/lib/server/user-store";

export async function GET() {
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }
  const { accountId } = session;

  const snapshot = await getDashboardSnapshotForAccount(accountId);
  if (!snapshot.ok) {
    return NextResponse.json(snapshot, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
