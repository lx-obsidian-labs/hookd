import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/server/auth-cookies";
import { getActiveSessionRecord } from "@/lib/server/session-store";

type SessionValidationFailure = {
  ok: false;
  reason: "missing" | "invalid";
};

type SessionAuthSuccess = {
  ok: true;
  accountId: string;
  sessionToken: string;
};

type SessionValidationResult = SessionValidationFailure | SessionAuthSuccess;

type SessionAuthFailure = SessionValidationFailure & {
  response: NextResponse;
};

export type SessionAuthResult = SessionAuthFailure | SessionAuthSuccess;

function unauthorizedResponse(message: string, clearCookies = false) {
  const response = NextResponse.json({ ok: false, message }, { status: 401 });
  if (clearCookies) {
    clearAuthCookies(response);
  }
  return response;
}

export async function requireAuthenticatedSession(): Promise<SessionAuthResult> {
  const jar = await cookies();
  const validation = await validateSessionIdentity({
    accountId: jar.get("hooked_session")?.value,
    sessionToken: jar.get("hooked_session_token")?.value,
  });

  if (!validation.ok) {
    return {
      ...validation,
      response: unauthorizedResponse(
        validation.reason === "missing" ? "No active session." : "Session is invalid or expired.",
        validation.reason === "invalid",
      ),
    };
  }

  return validation;
}

export async function validateSessionIdentity(input: {
  accountId?: string | null;
  sessionToken?: string | null;
}): Promise<SessionValidationResult> {
  const accountId = input.accountId?.trim() ?? "";
  const sessionToken = input.sessionToken?.trim() ?? "";

  if (!accountId || !sessionToken) {
    return { ok: false, reason: "missing" };
  }

  const session = await getActiveSessionRecord(sessionToken);
  if (!session || session.accountId !== accountId) {
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    accountId,
    sessionToken,
  };
}
