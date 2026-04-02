import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeAuditLog } from "@/lib/server/audit-log";
import { changeUserPassword } from "@/lib/server/user-store";

export async function POST(request: Request) {
  const jar = await cookies();
  const accountId = jar.get("hooked_session")?.value;
  if (!accountId) {
    return NextResponse.json({ ok: false, message: "No active session." }, { status: 401 });
  }

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
