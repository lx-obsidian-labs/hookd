type SessionPayload = {
  accountId: string;
  ageVerified: boolean;
  ficaVerified?: boolean;
};

export async function persistSessionCookie(payload: SessionPayload) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Could not persist session cookie.");
  }
}

export async function clearSessionCookie() {
  const response = await fetch("/api/auth/session", { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Could not clear session cookie.");
  }
}

export async function markAgeVerifiedCookie() {
  const response = await fetch("/api/auth/age", { method: "POST" });
  if (!response.ok) {
    throw new Error("Could not update age verification cookie.");
  }
}
