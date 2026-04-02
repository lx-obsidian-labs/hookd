import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getReadMarkersForAccount, setReadMarkerForAccount } from "@/lib/server/user-store";

type ReadMarkerBody = {
  matchId?: string;
  readAt?: string;
};

export async function GET() {
  const jar = await cookies();
  const accountId = jar.get("hooked_session")?.value;
  if (!accountId) {
    return NextResponse.json({ ok: false, message: "No active session." }, { status: 401 });
  }

  const result = await getReadMarkersForAccount(accountId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const jar = await cookies();
  const accountId = jar.get("hooked_session")?.value;
  if (!accountId) {
    return NextResponse.json({ ok: false, message: "No active session." }, { status: 401 });
  }

  let body: ReadMarkerBody;
  try {
    body = (await request.json()) as ReadMarkerBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  const result = await setReadMarkerForAccount({
    accountId,
    matchId: body.matchId ?? "",
    readAt: body.readAt,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
