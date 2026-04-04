import type { AccountRole } from "@/lib/hooked-app";

const BLOCKED_PREFIXES = ["/auth", "/api"];

export function defaultDashboardPathForRole(role: AccountRole) {
  return role === "model" ? "/dashboard?view=creator" : "/dashboard?view=discover";
}

export function sanitizeNextPath(candidate: string | null | undefined, fallback: string) {
  const value = (candidate ?? "").trim();

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("://") || value.includes("\\")) {
    return fallback;
  }

  const lowered = value.toLowerCase();
  if (BLOCKED_PREFIXES.some((prefix) => lowered === prefix || lowered.startsWith(`${prefix}/`))) {
    return fallback;
  }

  return value;
}

export function resolvePostAuthPath(params: {
  role: AccountRole;
  requestedPath?: string | null;
}) {
  const fallback = defaultDashboardPathForRole(params.role);
  return sanitizeNextPath(params.requestedPath, fallback);
}
