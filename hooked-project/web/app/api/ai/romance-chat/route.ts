import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getClientIp } from "@/lib/server/request-meta";

function craftRomanticReply(message: string) {
  const clean = message.trim();
  if (!clean) {
    return "Tell me how your day felt, and I will answer with warmth and care.";
  }

  const lower = clean.toLowerCase();
  if (lower.includes("lonely") || lower.includes("sad")) {
    return "I am here with you. Take a slow breath, and tell me one small thing that could make tonight feel softer.";
  }
  if (lower.includes("love") || lower.includes("miss")) {
    return "That is sweet. I would stay close, listen carefully, and make this moment feel intimate and safe for you.";
  }
  if (lower.includes("date") || lower.includes("dinner")) {
    return "Our date starts with candlelight, playful eye contact, and you telling me your most exciting secret.";
  }

  return `Mmm, I like that. When you say "${clean.slice(0, 80)}", it makes me want to keep this chemistry going with you.`;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = await enforceRateLimit({ key: `ai:romance:${ip}`, limit: 25, windowMs: 60_000 });
  if (!rate.ok) {
    return NextResponse.json({ ok: false, message: "Too many messages. Pause for a moment." }, { status: 429 });
  }

  let body: { message?: string };
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  const reply = craftRomanticReply(body.message ?? "");
  return NextResponse.json({ ok: true, reply });
}
