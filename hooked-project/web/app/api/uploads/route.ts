import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/server/audit-log";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/server/request-meta";
import { requireAuthenticatedSession } from "@/lib/server/session-auth";
import { canUploadCategoryForRole, type UploadCategory } from "@/lib/server/upload-policy";
import { getAccountProfileForAuthorization } from "@/lib/server/user-store";

export const runtime = "nodejs";

const ROOT_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const categoryRules = {
  "profile-picture": {
    maxBytes: 5 * 1024 * 1024,
    allowedTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
  },
  "saved-picture": {
    maxBytes: 8 * 1024 * 1024,
    allowedTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
  },
  "saved-video": {
    maxBytes: 40 * 1024 * 1024,
    allowedTypes: new Set(["video/mp4", "video/webm", "video/quicktime"]),
  },
  "fica-document": {
    maxBytes: 10 * 1024 * 1024,
    allowedTypes: new Set(["application/pdf", "image/jpeg", "image/png"]),
  },
} as const;

type Category = UploadCategory;

function extFromMime(mime: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
  };
  return map[mime] ?? "bin";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const session = await requireAuthenticatedSession();
  if (!session.ok) {
    return session.response;
  }

  const actorAccountId = session.accountId;
  const actorProfile = await getAccountProfileForAuthorization(actorAccountId);
  if (!actorProfile.ok) {
    return NextResponse.json({ ok: false, message: actorProfile.message }, { status: 401 });
  }

  const limit = await enforceRateLimit({
    key: `uploads:${actorAccountId}:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many uploads. Please wait and retry." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
      },
    );
  }

  const form = await request.formData();
  const categoryRaw = form.get("category");
  const file = form.get("file");

  if (typeof categoryRaw !== "string" || !(categoryRaw in categoryRules)) {
    return NextResponse.json({ ok: false, message: "Invalid upload category." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Missing file payload." }, { status: 400 });
  }

  const category = categoryRaw as Category;
  const rules = categoryRules[category];

  if (!canUploadCategoryForRole(actorProfile.profile.role, category)) {
    return NextResponse.json(
      { ok: false, message: "Your account role cannot upload this file category." },
      { status: 403 },
    );
  }

  if (!rules.allowedTypes.has(file.type)) {
    return NextResponse.json({ ok: false, message: "Unsupported file type." }, { status: 415 });
  }
  if (file.size > rules.maxBytes) {
    return NextResponse.json(
      { ok: false, message: `File too large. Max ${(rules.maxBytes / 1024 / 1024).toFixed(0)}MB.` },
      { status: 413 },
    );
  }

  const bytes = await file.arrayBuffer();
  const ext = extFromMime(file.type);
  const fileName = `${randomUUID()}.${ext}`;
  const absoluteDir = path.join(ROOT_UPLOAD_DIR, category);
  const absolutePath = path.join(absoluteDir, fileName);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, Buffer.from(bytes));

  await writeAuditLog({
    action: "upload.created",
    actor: actorAccountId,
    ip,
    userAgent,
    details: { category, mimeType: file.type, size: file.size, role: actorProfile.profile.role },
  });

  return NextResponse.json({
    ok: true,
    url: `/uploads/${category}/${fileName}`,
    mimeType: file.type,
    size: file.size,
  });
}
