import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type MagicLinkRecord = {
  email: string;
  tokenHash: string;
  expiresAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "magic-links.json");
const TTL_MS = 1000 * 60 * 15;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function readStore(): Promise<MagicLinkRecord[]> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    return JSON.parse(raw) as MagicLinkRecord[];
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeStore(records: MagicLinkRecord[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(records, null, 2), "utf8");
}

function compact(records: MagicLinkRecord[]) {
  const now = Date.now();
  return records.filter((item) => new Date(item.expiresAt).getTime() > now);
}

export async function requestMagicLink(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const token = randomUUID();
  const next = compact(await readStore()).filter((item) => item.email !== normalizedEmail);
  next.push({
    email: normalizedEmail,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
  });
  await writeStore(next);
  return token;
}

export async function consumeMagicLink(token: string) {
  const tokenHash = hashToken(token.trim());
  const records = compact(await readStore());
  const index = records.findIndex((item) => item.tokenHash === tokenHash);
  if (index === -1) {
    await writeStore(records);
    return { ok: false as const, message: "Magic link is invalid or expired." };
  }

  const record = records[index];
  const next = records.filter((_, itemIndex) => itemIndex !== index);
  await writeStore(next);
  return { ok: true as const, email: record.email };
}
