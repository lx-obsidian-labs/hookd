import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_KV = path.join(DATA_DIR, "kv-store.json");
const POSTGRES_URL = process.env.DATABASE_URL?.trim() ?? "";

let pool: Pool | null = null;
let ensureTablePromise: Promise<void> | null = null;
let fileWriteQueue: Promise<void> = Promise.resolve();

function shouldUsePostgres() {
  return POSTGRES_URL.startsWith("postgres://") || POSTGRES_URL.startsWith("postgresql://");
}

function assertStorageConfigured() {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !shouldUsePostgres()) {
    throw new Error("DATABASE_URL is required in production. File JSON storage is disabled.");
  }
}

export function isPostgresConfigured() {
  return shouldUsePostgres();
}

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: POSTGRES_URL, max: 5 });
  }
  return pool;
}

async function ensurePostgresTable() {
  if (!shouldUsePostgres()) {
    return;
  }
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      const db = getPool();
      await db.query(`
        CREATE TABLE IF NOT EXISTS app_kv (
          store_key TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    })();
  }
  return ensureTablePromise;
}

async function readFileStore() {
  try {
    const raw = await readFile(FILE_KV, "utf8");
    const parsed = JSON.parse(raw) as Record<string, JsonValue>;
    return parsed;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return {} as Record<string, JsonValue>;
    }
    throw error;
  }
}

async function writeFileStore(data: Record<string, JsonValue>) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_KV, JSON.stringify(data, null, 2), "utf8");
}

export function getStorageBackend() {
  return shouldUsePostgres() ? ("postgres" as const) : ("file-json" as const);
}

export async function readStoreValue<T extends JsonValue>(key: string, fallback: T): Promise<T> {
  assertStorageConfigured();

  if (shouldUsePostgres()) {
    await ensurePostgresTable();
    const db = getPool();
    const result = await db.query<{ payload: T }>(
      "SELECT payload FROM app_kv WHERE store_key = $1 LIMIT 1",
      [key],
    );
    if (result.rowCount && result.rows[0]) {
      return result.rows[0].payload;
    }
    await writeStoreValue(key, fallback);
    return fallback;
  }

  const store = await readFileStore();
  if (key in store) {
    return store[key] as T;
  }

  await writeStoreValue(key, fallback);
  return fallback;
}

export async function writeStoreValue<T extends JsonValue>(key: string, value: T) {
  assertStorageConfigured();

  if (shouldUsePostgres()) {
    await ensurePostgresTable();
    const db = getPool();
    await db.query(
      `
      INSERT INTO app_kv (store_key, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (store_key)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
      `,
      [key, JSON.stringify(value)],
    );
    return;
  }

  return new Promise<void>((resolve, reject) => {
    fileWriteQueue = fileWriteQueue
      .then(async () => {
        const store = await readFileStore();
        store[key] = value;
        await writeFileStore(store);
        resolve();
      })
      .catch(reject);
  });
}

export async function checkStoreHealth(requiredKeys: string[]) {
  const backend = getStorageBackend();
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  for (const key of requiredKeys) {
    const value = await readStoreValue<JsonValue>(key, null);
    checks[key] = {
      ok: true,
      detail:
        value === null
          ? `${key} initialized`
          : `${key} ready (${Array.isArray(value) ? value.length : typeof value})`,
    };
  }

  return {
    ok: Object.values(checks).every((item) => item.ok),
    backend,
    checks,
  };
}
