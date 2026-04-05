import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/server/session-auth";
import { getAccountProfileForAuthorization } from "@/lib/server/user-store";

export async function GET() {
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }

  const accountProfile = await getAccountProfileForAuthorization(session.accountId);
  if (!accountProfile.ok) {
    return NextResponse.json({ ok: false, message: accountProfile.message }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    account: {
      accountId: accountProfile.profile.accountId,
      role: accountProfile.profile.role,
      ageVerified: accountProfile.profile.ageVerified,
      ficaVerified: accountProfile.profile.ficaStatus === "verified",
    },
  });
}
