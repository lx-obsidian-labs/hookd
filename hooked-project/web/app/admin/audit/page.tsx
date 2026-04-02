"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { useState } from "react";

type AuditItem = {
  at: string;
  action: string;
  actor: string;
  target: string | null;
  ip: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
};

export default function AdminAuditPage() {
  const [adminKey, setAdminKey] = useState(process.env.NODE_ENV !== "production" ? "dev-admin-key" : "");
  const [limit, setLimit] = useState(200);
  const [actionPrefix, setActionPrefix] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<AuditItem[]>([]);
  const [message, setMessage] = useState("Load audit logs.");
  const [loading, setLoading] = useState(false);

  function buildQuery(format: "json" | "csv") {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("format", format);
    if (actionPrefix.trim()) {
      params.set("actionPrefix", actionPrefix.trim());
    }
    if (actor.trim()) {
      params.set("actor", actor.trim());
    }
    if (from) {
      params.set("from", new Date(from).toISOString());
    }
    if (to) {
      params.set("to", new Date(to).toISOString());
    }
    return params.toString();
  }

  async function loadLogs() {
    setLoading(true);
    const response = await fetch(`/api/admin/audit?${buildQuery("json")}`, {
      headers: { "x-admin-key": adminKey },
    });
    const payload = (await response.json()) as {
      ok: boolean;
      message?: string;
      items?: AuditItem[];
      count?: number;
    };
    setLoading(false);

    if (!payload.ok || !payload.items) {
      setMessage(payload.message ?? "Failed to load logs.");
      return;
    }

    setItems(payload.items);
    setMessage(`Loaded ${payload.count ?? payload.items.length} audit records.`);
  }

  async function exportCsv() {
    const response = await fetch(`/api/admin/audit?${buildQuery("csv")}`, {
      headers: { "x-admin-key": adminKey },
    });
    if (!response.ok) {
      setMessage("Failed to export CSV.");
      return;
    }

    const blob = await response.blob();
    const href = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "hooked-audit-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(href);
    setMessage("CSV export ready.");
  }

  return (
    <ProductShell
      title="Admin Audit Logs"
      description="Immutable event stream for auth, uploads, and moderation activity."
    >
      <section className="sexy-frame rounded-2xl p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_120px_1fr]">
          <input
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="Admin dashboard key"
            className="rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-sm text-white outline-none ring-accent/40 focus:ring"
          />
          <input
            type="number"
            min={1}
            max={1000}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-sm text-white outline-none ring-accent/40 focus:ring"
          />
          <input
            value={actionPrefix}
            onChange={(event) => setActionPrefix(event.target.value)}
            placeholder="Action prefix (e.g. auth.)"
            className="rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-sm text-white outline-none ring-accent/40 focus:ring"
          />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
          <input
            value={actor}
            onChange={(event) => setActor(event.target.value)}
            placeholder="Actor"
            className="rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-sm text-white outline-none ring-accent/40 focus:ring"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-sm text-white outline-none ring-accent/40 focus:ring"
            />
            <input
              type="datetime-local"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-sm text-white outline-none ring-accent/40 focus:ring"
            />
          </div>
          <button
            type="button"
            onClick={loadLogs}
            disabled={loading || !adminKey.trim()}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#1d1003] disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Logs"}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={loading || !adminKey.trim()}
            className="rounded-xl border border-accent/45 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent-strong disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
        <p className="mt-3 text-sm text-text-muted">{message}</p>
      </section>

      <section className="mt-4 space-y-2">
        {items.map((item, index) => (
          <article key={`${item.at}-${item.action}-${index}`} className="glass-panel rounded-xl p-3 text-sm">
            <p className="font-semibold">{item.action}</p>
            <p className="text-xs text-text-muted">
              {new Date(item.at).toLocaleString()} | actor: {item.actor} | target: {item.target ?? "-"}
            </p>
            <p className="text-xs text-text-muted">ip: {item.ip ?? "unknown"}</p>
            {item.details ? (
              <pre className="mt-2 overflow-x-auto rounded border border-white/10 bg-black/30 p-2 text-[11px] text-text-muted">
                {JSON.stringify(item.details, null, 2)}
              </pre>
            ) : null}
          </article>
        ))}
      </section>
    </ProductShell>
  );
}
