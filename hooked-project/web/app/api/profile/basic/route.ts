import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { requireAuthenticatedSession } from "@/lib/server/session-auth";
import { updateBasicProfileForAccount } from "@/lib/server/user-store";

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }
  const { accountId } = session;

  let body: {
    displayName?: string;
    gender?: string;
    lookingFor?: string[];
    city?: string;
    profilePictureUrl?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
  }

  const displayName = (body.displayName ?? "").trim();
  const gender = (body.gender ?? "").trim();
  const city = (body.city ?? "").trim();
  const profilePictureUrl = (body.profilePictureUrl ?? "").trim();
  const lookingFor = (body.lookingFor ?? []).map((item) => item.trim()).filter(Boolean);

  const updated = await updateBasicProfileForAccount({
    accountId,
    displayName,
    gender,
    city,
    profilePictureUrl,
    lookingFor,
  });
  if (!updated.ok) {
    return NextResponse.json({ ok: false, message: updated.message }, { status: updated.message.includes("not found") ? 404 : 400 });
  }

  await writeAuditLog({
    action: "profile.basic.updated",
    actor: accountId,
    target: accountId,
    details: { onboardingStep: updated.onboardingStep },
  });

  return NextResponse.json({ ok: true, onboardingStep: updated.onboardingStep });
}
