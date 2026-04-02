import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { requireAdminApiKey } from "@/lib/server/admin-auth";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { unlockUserAccount } from "@/lib/server/user-store";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const auth = requireAdminApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: { accountId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.accountId) {
    return NextResponse.json({ ok: false, message: "accountId is required." }, { status: 400 });
  }

  const result = await unlockUserAccount(body.accountId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  await writeAuditLog({
    action: "admin.moderation.account.unlock",
    actor: "admin",
    target: body.accountId,
    ip,
    userAgent,
  });

  return NextResponse.json(result);
}
