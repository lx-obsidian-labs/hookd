import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { requireAuthenticatedSession } from "@/lib/server/session-auth";
import { changeUserPassword } from "@/lib/server/user-store";

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }
  const { accountId } = session;

  let body: { currentPassword?: string; nextPassword?: string };
  try {
    body = (await request.json()) as { currentPassword?: string; nextPassword?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  const result = await changeUserPassword({
    accountId,
    currentPassword: body.currentPassword ?? "",
    nextPassword: body.nextPassword ?? "",
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  await writeAuditLog({
    action: "account.password.changed",
    actor: accountId,
    target: accountId,
  });

  return NextResponse.json({ ok: true });
}
