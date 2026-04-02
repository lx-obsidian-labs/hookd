import { createHash, randomInt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type OtpRecord = {
  identifier: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  resendAvailableAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const OTP_FILE = path.join(DATA_DIR, "otp-codes.json");
const EXPIRY_MS = 5 * 60 * 1000;
const RESEND_MS = 30 * 1000;
const MAX_ATTEMPTS = 6;

function hashCode(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function readOtps(): Promise<OtpRecord[]> {
  try {
    const raw = await readFile(OTP_FILE, "utf8");
    return JSON.parse(raw) as OtpRecord[];
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeOtps(records: OtpRecord[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OTP_FILE, JSON.stringify(records, null, 2), "utf8");
}

function clean(records: OtpRecord[]) {
  const now = Date.now();
  return records.filter((record) => new Date(record.expiresAt).getTime() > now);
}

export async function requestOtp(identifier: string) {
  const key = identifier.trim().toLowerCase();
  if (!key) {
    return { ok: false as const, message: "Identifier is required." };
  }

  const records = clean(await readOtps());
  const now = Date.now();
  const existing = records.find((item) => item.identifier === key);
  if (existing && new Date(existing.resendAvailableAt).getTime() > now) {
    const waitSeconds = Math.ceil((new Date(existing.resendAvailableAt).getTime() - now) / 1000);
    return { ok: false as const, message: `Please wait ${waitSeconds}s before requesting another code.` };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const next: OtpRecord = {
    identifier: key,
    codeHash: hashCode(code),
    expiresAt: new Date(now + EXPIRY_MS).toISOString(),
    attempts: 0,
    resendAvailableAt: new Date(now + RESEND_MS).toISOString(),
  };

  const withoutCurrent = records.filter((item) => item.identifier !== key);
  withoutCurrent.push(next);
  await writeOtps(withoutCurrent);

  return { ok: true as const, code };
}

export async function verifyOtp(identifier: string, code: string) {
  const key = identifier.trim().toLowerCase();
  const normalizedCode = code.trim();
  const records = clean(await readOtps());
  const index = records.findIndex((item) => item.identifier === key);
  if (index === -1) {
    return { ok: false as const, message: "Code is invalid or expired." };
  }

  const record = records[index];
  if (record.attempts >= MAX_ATTEMPTS) {
    const updated = records.filter((item) => item.identifier !== key);
    await writeOtps(updated);
    return { ok: false as const, message: "Code expired. Request a new one." };
  }

  if (record.codeHash !== hashCode(normalizedCode)) {
    records[index] = { ...record, attempts: record.attempts + 1 };
    await writeOtps(records);
    return { ok: false as const, message: "Code is invalid or expired." };
  }

  const updated = records.filter((item) => item.identifier !== key);
  await writeOtps(updated);
  return { ok: true as const };
}
