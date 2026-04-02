import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { requireAdminApiKey } from "@/lib/server/admin-auth";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { updateUserClassification } from "@/lib/server/user-store";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const auth = requireAdminApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: { accountId?: string; nicheTags?: string[]; description?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.accountId) {
    return NextResponse.json({ ok: false, message: "accountId is required." }, { status: 400 });
  }

  const result = await updateUserClassification({
    accountId: body.accountId,
    nicheTags: Array.isArray(body.nicheTags) ? body.nicheTags : [],
    description: body.description ?? "",
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  await writeAuditLog({
    action: "admin.moderation.classification.update",
    actor: "admin",
    target: body.accountId,
    ip,
    userAgent,
    details: {
      tagCount: (body.nicheTags ?? []).length,
      descriptionLength: (body.description ?? "").length,
    },
  });

  return NextResponse.json(result);
}
