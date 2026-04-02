import { checkStoreHealth, getStorageBackend, isPostgresConfigured } from "@/lib/server/kv-store";

export async function checkDatabaseHealth() {
  const storeHealth = await checkStoreHealth(["users", "sessions", "rate-limit"]);

  return {
    ok: storeHealth.ok,
    backend: getStorageBackend(),
    postgresConfigured: isPostgresConfigured(),
    checks: {
      profileStore: storeHealth.checks.users,
      authStore: storeHealth.checks.sessions,
      rateLimitStore: storeHealth.checks["rate-limit"],
    },
  };
}
