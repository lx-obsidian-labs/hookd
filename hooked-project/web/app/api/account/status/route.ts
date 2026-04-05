import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/server/session-auth";
import { getSecuritySnapshotForAccount } from "@/lib/server/user-store";

export async function GET() {
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }
  const { accountId } = session;

  const snapshot = await getSecuritySnapshotForAccount(accountId);
  if (!snapshot.ok) {
    return NextResponse.json(snapshot, { status: 404 });
  }

  const status = snapshot.security.accountStatus;
  const step = snapshot.security.onboardingStep;
  const limits = {
    discovery: status !== "banned" && status !== "suspended",
    chat: step !== "account_created" && status !== "banned" && status !== "suspended",
    wallet: status === "active" || status === "limited",
    calls: status === "active" || status === "limited",
    monetization: status === "active",
  };

  return NextResponse.json({
    ok: true,
    status,
    onboardingStep: step,
    photoModerationStatus: snapshot.security.photoModerationStatus,
    limits,
  });
}
