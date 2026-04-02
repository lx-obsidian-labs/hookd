"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { PreviewGate } from "@/app/_components/preview-gate";
import { profileImageFor } from "@/lib/profile-assets";
import { useHookedApp } from "@/lib/hooked-app";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ChatClientProps = {
  initialMatchId: string;
};

export function ChatClient({ initialMatchId }: ChatClientProps) {
  const router = useRouter();
  const {
    currentAccount,
    currentUserMatches,
    getMessages,
    getUnreadMessageCount,
    markMatchAsRead,
    sendTextMessage,
    sendPaidMediaMessage,
    wallet,
  } = useHookedApp();
  const [selectedMatchId, setSelectedMatchId] = useState(initialMatchId);
  const [matchFilter, setMatchFilter] = useState<"all" | "unread">("all");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");

  const previewMessages = [
    { id: "preview-1", body: "You looked incredible in your last stream.", time: "21:04" },
    { id: "preview-2", body: "Thanks babe, want a private clip?", time: "21:05" },
    { id: "preview-3", body: "Unlocking now, send me the teaser first.", time: "21:06" },
  ];

  const matchesWithUnread = useMemo(
    () =>
      currentUserMatches.map((match) => ({
        ...match,
        unreadCount: getUnreadMessageCount(match.id),
      })),
    [currentUserMatches, getUnreadMessageCount],
  );

  const visibleMatches = useMemo(() => {
    if (matchFilter === "all") {
      return matchesWithUnread;
    }
    return matchesWithUnread.filter((match) => match.unreadCount > 0);
  }, [matchFilter, matchesWithUnread]);

  const resolvedMatchId = useMemo(() => {
    if (selectedMatchId && visibleMatches.some((match) => match.id === selectedMatchId)) {
      return selectedMatchId;
    }
    if (initialMatchId && visibleMatches.some((match) => match.id === initialMatchId)) {
      return initialMatchId;
    }
    return visibleMatches[0]?.id ?? "";
  }, [initialMatchId, selectedMatchId, visibleMatches]);

  const activeMatch = useMemo(
    () => visibleMatches.find((match) => match.id === resolvedMatchId) ?? null,
    [resolvedMatchId, visibleMatches],
  );
  const messages = activeMatch ? getMessages(activeMatch.id) : [];

  useEffect(() => {
    if (!activeMatch) {
      return;
    }
    markMatchAsRead(activeMatch.id);
  }, [activeMatch, markMatchAsRead, messages.length]);

  function onSelectMatch(matchId: string) {
    setSelectedMatchId(matchId);
    setNotice("");
    router.replace(`/chat?match=${encodeURIComponent(matchId)}`);
  }

  function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeMatch) {
      setNotice("Select a valid match to send messages.");
      return;
    }

    const result = sendTextMessage(activeMatch.id, draft);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }

    setDraft("");
    setNotice("Message sent.");
  }

  function onSendMedia(type: "image" | "video") {
    if (!activeMatch) {
      setNotice("Select a valid match to send media.");
      return;
    }

    const result = sendPaidMediaMessage(activeMatch.id, type, draft);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }

    setDraft("");
    setNotice(result.message);
  }

  function onMarkAllVisibleAsRead() {
    visibleMatches.forEach((match) => {
      if (match.unreadCount > 0) {
        markMatchAsRead(match.id);
      }
    });
    setNotice("Unread chats marked as read.");
  }

  return (
    <ProductShell
      title="Chat"
      description="Free text messaging drives engagement, while paid image and video sharing unlocks premium monetization."
    >
      <section className="app-surface app-section reveal-rise mb-4 p-3 sm:p-5">
        <Image
          src="/asset-neon-card.svg"
          alt=""
          width={640}
          height={420}
          className="h-28 w-full rounded-xl border border-white/10 object-cover sm:h-36"
          aria-hidden="true"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="neon-pill rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Chat Studio</span>
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-text-muted">Free text + paid media lane</span>
        </div>
      </section>

      {!currentAccount ? (
        <PreviewGate
          title="Chat preview mode"
          body="Browse a preview of the chat experience. Sign in to unlock real matched conversations."
        />
      ) : null}

      <div className="reveal-rise reveal-rise-delay-1 grid gap-4 sm:grid-cols-2">
        <article className="spotlight-card sexy-frame rounded-2xl border border-signal/40 bg-signal/10 p-5">
          <h2 className="text-lg font-semibold text-emerald-100">Free channel</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-100/85">
            Matched users can exchange text without token deductions to maximize
            first-message conversion and conversation retention.
          </p>
        </article>
        <article className="spotlight-card sexy-frame rounded-2xl border border-accent/35 bg-accent/10 p-5">
          <h2 className="text-lg font-semibold text-orange-100">Paid media lane</h2>
          <p className="mt-2 text-sm leading-6 text-orange-100/85">
            Image and video attachments trigger wallet checks and token debits
            before send or unlock, with full receipt logging.
          </p>
        </article>
      </div>

      {currentAccount && currentUserMatches.length > 0 ? (
        <div className="reveal-rise reveal-rise-delay-1 mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMatchFilter("all")}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${matchFilter === "all" ? "border-accent/55 bg-accent/15 text-accent-strong" : "border-white/20 text-white/85"}`}
            >
              All matches ({matchesWithUnread.length})
            </button>
            <button
              type="button"
              onClick={() => setMatchFilter("unread")}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${matchFilter === "unread" ? "border-accent/55 bg-accent/15 text-accent-strong" : "border-white/20 text-white/85"}`}
            >
              Unread only ({matchesWithUnread.filter((match) => match.unreadCount > 0).length})
            </button>
            <button
              type="button"
              onClick={onMarkAllVisibleAsRead}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/85"
            >
              Mark visible as read
            </button>
          </div>

          {visibleMatches.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-text-muted">
              No unread chats right now. Switch to All matches to continue conversations.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {visibleMatches.map((match) => {
            const isActive = match.id === activeMatch?.id;
            return (
              <button
                key={match.id}
                type="button"
                onClick={() => onSelectMatch(match.id)}
                className={`rounded-xl border p-3 text-left transition ${isActive ? "border-accent/60 bg-accent/12" : "border-white/10 bg-white/5 hover:border-white/25"}`}
              >
                <div className="flex items-center gap-2">
                  <Image
                    src={profileImageFor({
                      ownerId: match.peerProfile?.ownerId,
                      name: match.peerProfile?.name,
                    })}
                    alt={match.peerProfile?.name ?? "Match"}
                    width={28}
                    height={28}
                    className="size-7 rounded-full border border-white/20 object-cover"
                  />
                  <p className="text-sm font-semibold text-white">
                    {match.peerProfile?.name ?? "Match"}
                  </p>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Matched {new Date(match.createdAt).toLocaleDateString()}
                </p>
                {match.unreadCount > 0 ? (
                  <p className="mt-1 text-[11px] font-semibold text-accent-strong">{match.unreadCount} unread</p>
                ) : null}
              </button>
            );
          })}
            </div>
          )}
        </div>
      ) : null}

      {!currentAccount ? (
        <div className="sexy-frame mt-6 rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview conversation</h2>
            <span className="text-xs text-text-muted">Locked until sign-in</span>
          </div>
          <div className="locked-preview space-y-3 rounded-xl border border-white/10 bg-[#0d1b2c]/90 p-3">
            {previewMessages.map((message) => (
              <div key={message.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <p className="blurred-copy text-text-muted">{message.body}</p>
                <p className="mt-1 text-[11px] text-text-muted/80">{message.time}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/auth/sign-in" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#1d1003]">
              Unlock chat
            </Link>
            <Link href="/auth/sign-up" className="rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold text-white">
              Create account
            </Link>
          </div>
        </div>
      ) : null}

      {activeMatch ? (
        <div className="app-surface app-section reveal-rise reveal-rise-delay-2 mt-6 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src={profileImageFor({
                  ownerId: activeMatch.peerProfile?.ownerId,
                  name: activeMatch.peerProfile?.name,
                })}
                alt={activeMatch.peerProfile?.name ?? "match"}
                width={36}
                height={36}
                className="size-9 rounded-full border border-white/20 object-cover"
              />
              <h2 className="text-lg font-semibold">
                Chat with {activeMatch.peerProfile?.name ?? "match"}
              </h2>
            </div>
            <span className="text-xs text-text-muted">Text free | Wallet {wallet.available} tokens</span>
          </div>
          <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1b2c]/90 p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-text-muted">No messages yet. Send the first one.</p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-text-muted">{message.body}</p>
                    {message.type === "text" ? null : (
                      <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-strong">
                        {message.type} - {message.tokenCost} tokens
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted/80">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={onSend} className="mt-4 flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a free text message"
              className="app-input w-full rounded-xl px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#1d1003]"
            >
              Send text free
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSendMedia("image")}
              className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent-strong"
            >
              Send image (15 tokens)
            </button>
            <button
              type="button"
              onClick={() => onSendMedia("video")}
              className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent-strong"
            >
              Send video (40 tokens)
            </button>
            <p className="self-center text-xs text-text-muted">Media send uses your current message text as a caption/context.</p>
          </div>
          {notice ? <p className="mt-2 text-sm text-accent-strong">{notice}</p> : null}
        </div>
      ) : null}

      {!activeMatch && currentAccount ? (
        <div className="sexy-frame mt-6 rounded-2xl p-5 text-sm text-text-muted">
          Choose a match from <Link className="underline" href="/matches">matches</Link> to start free text chat. Standard chat is blocked for unmatched users.
        </div>
      ) : null}
    </ProductShell>
  );
}
