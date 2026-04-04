import type { NextResponse } from "next/server";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type ApplyAuthCookiesInput = {
  accountId: string;
  ageVerified: boolean;
  ficaVerified: boolean;
  sessionToken: string;
};

function cookieBase() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function applyAuthCookies(response: NextResponse, input: ApplyAuthCookiesInput) {
  const base = cookieBase();

  response.cookies.set("hooked_session", input.accountId, {
    ...base,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  response.cookies.set("hooked_age_verified", input.ageVerified ? "1" : "0", {
    ...base,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  response.cookies.set("hooked_fica_verified", input.ficaVerified ? "1" : "0", {
    ...base,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  response.cookies.set("hooked_session_token", input.sessionToken, {
    ...base,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookies(response: NextResponse) {
  const base = cookieBase();

  response.cookies.set("hooked_session", "", { ...base, maxAge: 0 });
  response.cookies.set("hooked_age_verified", "0", { ...base, maxAge: 0 });
  response.cookies.set("hooked_fica_verified", "0", { ...base, maxAge: 0 });
  response.cookies.set("hooked_session_token", "", { ...base, maxAge: 0 });
}

export function setAgeVerifiedCookie(response: NextResponse, verified: boolean) {
  const base = cookieBase();
  response.cookies.set("hooked_age_verified", verified ? "1" : "0", {
    ...base,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}
