import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { requireAdminApiKey } from "@/lib/server/admin-auth";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { updateUserFicaStatus } from "@/lib/server/user-store";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const auth = requireAdminApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: { accountId?: string; status?: "pending" | "submitted" | "verified" | "rejected" };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.accountId || !body.status) {
    return NextResponse.json({ ok: false, message: "accountId and status are required." }, { status: 400 });
  }

  const result = await updateUserFicaStatus({
    accountId: body.accountId,
    status: body.status,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  await writeAuditLog({
    action: "admin.moderation.fica.update",
    actor: "admin",
    target: body.accountId,
    ip,
    userAgent,
    details: { status: body.status },
  });

  return NextResponse.json(result);
}
