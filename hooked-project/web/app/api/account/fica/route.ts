import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { requireAuthenticatedSession } from "@/lib/server/session-auth";
import { submitFicaForUser } from "@/lib/server/user-store";

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }
  const { accountId } = session;

  let body: {
    legalName?: string;
    idNumber?: string;
    documentUrl?: string;
    consent?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  const result = await submitFicaForUser({
    accountId,
    legalName: body.legalName ?? "",
    idNumber: body.idNumber ?? "",
    documentUrl: body.documentUrl ?? "",
    consent: Boolean(body.consent),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  await writeAuditLog({
    action: "account.fica.submitted",
    actor: accountId,
    target: accountId,
    details: { status: result.user.fica.status },
  });

  const response = NextResponse.json({ ok: true, account: result.user });
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("hooked_fica_verified", result.user.fica.status === "verified" ? "1" : "0", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
