import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { requireAdminApiKey } from "@/lib/server/admin-auth";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { listUsersForModeration } from "@/lib/server/user-store";

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const auth = requireAdminApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }

  const result = await listUsersForModeration();
  await writeAuditLog({
    action: "admin.moderation.users.view",
    actor: "admin",
    ip,
    userAgent,
    details: { total: result.items.length },
  });
  return NextResponse.json(result);
}
