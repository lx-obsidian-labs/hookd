import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeAuditLog } from "@/lib/server/audit-log";
import { submitFicaForUser } from "@/lib/server/user-store";

export async function POST(request: Request) {
  const jar = await cookies();
  const accountId = jar.get("hooked_session")?.value;
  if (!accountId) {
    return NextResponse.json({ ok: false, message: "No active session." }, { status: 401 });
  }

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
