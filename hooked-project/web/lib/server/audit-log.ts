import { mkdir, appendFile, readFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const AUDIT_FILE = path.join(DATA_DIR, "audit.log.jsonl");

type AuditRecord = {
  at: string;
  action: string;
  actor: string;
  target: string | null;
  ip: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
};

export async function writeAuditLog(event: {
  action: string;
  actor: string;
  target?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}) {
  await mkdir(DATA_DIR, { recursive: true });
  const line = JSON.stringify({
    at: new Date().toISOString(),
    action: event.action,
    actor: event.actor,
    target: event.target ?? null,
    ip: event.ip ?? null,
    userAgent: event.userAgent ?? null,
    details: event.details ?? null,
  });
  await appendFile(AUDIT_FILE, `${line}\n`, "utf8");
}

export async function readAuditLogs(options?: {
  limit?: number;
  actionPrefix?: string;
  actor?: string;
  from?: string;
  to?: string;
}) {
  try {
    const limit = options?.limit ?? 200;
    const actionPrefix = options?.actionPrefix?.trim();
    const actor = options?.actor?.trim();
    const fromMs = options?.from ? new Date(options.from).getTime() : Number.NEGATIVE_INFINITY;
    const toMs = options?.to ? new Date(options.to).getTime() : Number.POSITIVE_INFINITY;

    const raw = await readFile(AUDIT_FILE, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const all = lines
      .map((line) => JSON.parse(line) as AuditRecord)
      .filter((item) => {
        const atMs = new Date(item.at).getTime();
        if (!Number.isFinite(atMs) || atMs < fromMs || atMs > toMs) {
          return false;
        }
        if (actionPrefix && !item.action.startsWith(actionPrefix)) {
          return false;
        }
        if (actor && item.actor !== actor) {
          return false;
        }
        return true;
      });

    return all.slice(-limit).reverse();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
