import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSecuritySnapshotForAccount } from "@/lib/server/user-store";

export async function GET() {
  const jar = await cookies();
  const accountId = jar.get("hooked_session")?.value;
  if (!accountId) {
    return NextResponse.json({ ok: false, message: "No active session." }, { status: 401 });
  }

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
