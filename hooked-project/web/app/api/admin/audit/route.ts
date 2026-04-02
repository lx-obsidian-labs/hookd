import { NextResponse } from "next/server";
import { readAuditLogs } from "@/lib/server/audit-log";
import { requireAdminApiKey } from "@/lib/server/admin-auth";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const auth = requireAdminApiKey(request);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(1000, Math.floor(limitRaw))) : 200;
  const actionPrefix = url.searchParams.get("actionPrefix") ?? undefined;
  const actor = url.searchParams.get("actor") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const format = url.searchParams.get("format") ?? "json";

  const items = await readAuditLogs({
    limit,
    actionPrefix,
    actor,
    from,
    to,
  });

  if (format === "csv") {
    const header = ["at", "action", "actor", "target", "ip", "userAgent", "details"]
      .map(csvEscape)
      .join(",");
    const rows = items.map((item) =>
      [
        item.at,
        item.action,
        item.actor,
        item.target,
        item.ip,
        item.userAgent,
        JSON.stringify(item.details ?? {}),
      ]
        .map(csvEscape)
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=hooked-audit-export.csv",
      },
    });
  }

  return NextResponse.json({ ok: true, items, count: items.length });
}
