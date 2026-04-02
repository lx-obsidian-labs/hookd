import { readStoreValue, writeStoreValue } from "@/lib/server/kv-store";

type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

const bucket = new Map<string, number[]>();
let writeQueue: Promise<void> = Promise.resolve();

async function readStore() {
  const store = await readStoreValue<Record<string, number[]>>("rate-limit", {});
  return store && typeof store === "object" ? store : {};
}

async function writeStore(data: Record<string, number[]>) {
  await writeStoreValue("rate-limit", data);
}

function computeRateLimit(input: RateLimitInput, existing: number[]) {
  const now = Date.now();
  const lowerBound = now - input.windowMs;
  const recent = existing.filter((timestamp) => timestamp > lowerBound);

  if (recent.length >= input.limit) {
    const oldest = recent[0] ?? now;
    const retryAfterMs = Math.max(0, oldest + input.windowMs - now);
    return {
      result: { ok: false, remaining: 0, retryAfterMs } as RateLimitResult,
      nextTimestamps: recent,
    };
  }

  recent.push(now);
  return {
    result: {
      ok: true,
      remaining: Math.max(0, input.limit - recent.length),
      retryAfterMs: 0,
    } as RateLimitResult,
    nextTimestamps: recent,
  };
}

export async function enforceRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const memoryExisting = bucket.get(input.key);
  if (memoryExisting) {
    const { result, nextTimestamps } = computeRateLimit(input, memoryExisting);
    bucket.set(input.key, nextTimestamps);
    return result;
  }

  return new Promise((resolve, reject) => {
    writeQueue = writeQueue
      .then(async () => {
        const store = await readStore();
        const existing = store[input.key] ?? [];
        const { result, nextTimestamps } = computeRateLimit(input, existing);
        store[input.key] = nextTimestamps;
        bucket.set(input.key, nextTimestamps);

        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const key of Object.keys(store)) {
          const filtered = (store[key] ?? []).filter((timestamp) => timestamp > cutoff);
          if (filtered.length === 0) {
            delete store[key];
          } else {
            store[key] = filtered;
          }
        }

        await writeStore(store);
        resolve(result);
      })
      .catch(reject);
  });
}
