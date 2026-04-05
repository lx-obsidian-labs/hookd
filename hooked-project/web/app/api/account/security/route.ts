import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { requireAuthenticatedSession } from "@/lib/server/session-auth";
import {
  beginTwoFactorSetup,
  completeTwoFactorSetup,
  disableTwoFactor,
  generateBackupCodes,
  getSecuritySnapshotForAccount,
} from "@/lib/server/user-store";

export async function GET() {
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }
  const { accountId } = session;

  const result = await getSecuritySnapshotForAccount(accountId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }
  const { accountId } = session;

  let body: {
    action?: "begin_2fa" | "verify_2fa" | "disable_2fa" | "generate_backup_codes";
    code?: string;
  };
  try {
    body = (await request.json()) as {
      action?: "begin_2fa" | "verify_2fa" | "disable_2fa" | "generate_backup_codes";
      code?: string;
    };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (body.action === "begin_2fa") {
    const setup = await beginTwoFactorSetup(accountId);
    if (!setup.ok) {
      return NextResponse.json(setup, { status: 400 });
    }
    await writeAuditLog({
      action: "account.security.two_factor.begin",
      actor: accountId,
      target: accountId,
    });
    return NextResponse.json({ ok: true, secret: setup.secret, otpauthUrl: setup.otpauthUrl });
  }

  if (body.action === "verify_2fa") {
    const completed = await completeTwoFactorSetup(accountId, body.code ?? "");
    if (!completed.ok) {
      return NextResponse.json(completed, { status: 400 });
    }
    await writeAuditLog({
      action: "account.security.two_factor.enabled",
      actor: accountId,
      target: accountId,
    });
    return NextResponse.json({ ok: true, twoFactorEnabled: true });
  }

  if (body.action === "disable_2fa") {
    const disabled = await disableTwoFactor(accountId);
    if (!disabled.ok) {
      return NextResponse.json(disabled, { status: 400 });
    }
    await writeAuditLog({
      action: "account.security.two_factor.disabled",
      actor: accountId,
      target: accountId,
    });
    return NextResponse.json({ ok: true, twoFactorEnabled: false });
  }

  if (body.action === "generate_backup_codes") {
    const backup = await generateBackupCodes(accountId);
    if (!backup.ok) {
      return NextResponse.json(backup, { status: 400 });
    }
    await writeAuditLog({
      action: "account.security.two_factor.backup_codes.generated",
      actor: accountId,
      target: accountId,
      details: { count: backup.codes.length },
    });
    return NextResponse.json({ ok: true, codes: backup.codes });
  }

  return NextResponse.json({ ok: false, message: "Unsupported action." }, { status: 400 });
}
