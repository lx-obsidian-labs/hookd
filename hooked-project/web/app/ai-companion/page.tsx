"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { useState } from "react";

type Message = { id: string; role: "user" | "ai"; body: string };

export default function AiCompanionPage() {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      body: "Hey you. I am your romantic AI companion tonight. Tell me what vibe you want.",
    },
  ]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) {
      return;
    }

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", body };
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setSending(true);

    const response = await fetch("/api/ai/romance-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: body }),
    });
    const payload = (await response.json()) as { ok: boolean; reply?: string; message?: string };
    setSending(false);

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "ai",
        body: payload.ok ? payload.reply ?? "I am here." : payload.message ?? "I could not reply just now.",
      },
    ]);
  }

  return (
    <ProductShell
      title="AI Romantic Companion"
      description="Private AI chat with romantic tone. Built for emotional presence, flirting, and gentle conversation."
    >
      <section className="app-surface app-section p-4">
        <div className="max-h-[60vh] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-[#0b111c] p-3">
          {messages.map((message) => (
            <div
              key={message.id}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${message.role === "user" ? "ml-auto app-cta" : "bg-white/10 text-white"}`}
              >
                {message.body}
              </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tell your AI companion what you feel..."
            className="app-input w-full rounded-xl px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="app-cta rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </section>
    </ProductShell>
  );
}
