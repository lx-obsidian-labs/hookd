import { readFile } from "node:fs/promises";
import path from "node:path";
import { getStorageBackend, writeStoreValue, type JsonValue } from "@/lib/server/kv-store";

const DATA_DIR = path.join(process.cwd(), ".data");

async function readJsonIfExists<T>(fileName: string): Promise<T | null> {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function migrateLegacyJsonStores() {
  const users = await readJsonIfExists<JsonValue>("users.json");
  const sessions = await readJsonIfExists<JsonValue>("sessions.json");
  const rateLimit = await readJsonIfExists<JsonValue>("rate-limit.json");

  if (users !== null) {
    await writeStoreValue("users", users);
  }
  if (sessions !== null) {
    await writeStoreValue("sessions", sessions);
  }
  if (rateLimit !== null) {
    await writeStoreValue("rate-limit", rateLimit);
  }

  return {
    ok: true as const,
    backend: getStorageBackend(),
    migrated: {
      users: Array.isArray(users) ? users.length : users === null ? 0 : 1,
      sessions: Array.isArray(sessions) ? sessions.length : sessions === null ? 0 : 1,
      rateLimitKeys:
        rateLimit && typeof rateLimit === "object"
          ? Object.keys(rateLimit).length
          : 0,
    },
  };
}
