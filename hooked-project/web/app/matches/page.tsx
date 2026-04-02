"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { PreviewGate } from "@/app/_components/preview-gate";
import {
  readFavoriteOwnerIds,
  toggleFavoriteOwner,
  writeFavoriteOwnerIds,
} from "@/lib/model-favorites";
import { profileImageFor, profileSlug } from "@/lib/profile-assets";
import { useHookedApp } from "@/lib/hooked-app";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function MatchesPage() {
  const { hydrated, currentAccount, currentUserMatches, getUnreadMessageCount, getMessages } = useHookedApp();
  const [favoriteOwnerIds, setFavoriteOwnerIds] = useState<string[]>(() => readFavoriteOwnerIds());

  const previewMatches = [
    {
      id: "preview-1",
      name: "Nia Blaze",
      bio: "Loves late-night chats, live sessions, and playful voice notes.",
    },
    {
      id: "preview-2",
      name: "Ari Nova",
      bio: "Creator energy, quick replies, and premium content drops.",
    },
  ];

  function onToggleFavorite(ownerId: string) {
    setFavoriteOwnerIds((prev) => {
      const next = toggleFavoriteOwner(prev, ownerId);
      writeFavoriteOwnerIds(next);
      return next;
    });
  }

  return (
    <ProductShell
      title="Matches"
      description="See mutual likes, prioritize active conversations, and launch chat with one click."
    >
      <section className="sexy-frame reveal-rise mb-4 rounded-2xl p-3 sm:p-5">
        <Image
          src="/asset-lounge-card.svg"
          alt=""
          width={640}
          height={420}
          className="h-28 w-full rounded-xl border border-white/10 object-cover sm:h-36"
          aria-hidden="true"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="neon-pill rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Mutual lane</span>
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-text-muted">Fast path into active chat</span>
        </div>
      </section>

      {!hydrated ? <p className="text-sm text-text-muted">Loading matches...</p> : null}
      {!currentAccount && hydrated ? (
        <PreviewGate
          title="Matches preview mode"
          body="Preview the match experience. Sign in to unlock real mutual matches and start chats."
        />
      ) : null}

      <div className="reveal-rise reveal-rise-delay-1 grid gap-4 md:grid-cols-2">
        {currentAccount
          ? currentUserMatches.map((match) => {
              const unreadCount = getUnreadMessageCount(match.id);
              const latestMessage = getMessages(match.id).at(-1);
              return (
            <article key={match.id} className="spotlight-card sexy-frame rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <Image
                    src={profileImageFor({
                      ownerId: match.peerProfile?.ownerId,
                      name: match.peerProfile?.name,
                    })}
                    alt={match.peerProfile?.name ?? "Match"}
                    width={44}
                    height={44}
                    className="size-11 rounded-full border border-white/20 object-cover"
                  />
                  <h2 className="text-lg font-semibold">
                    {match.peerProfile?.name ? (
                      <Link href={`/models/${profileSlug(match.peerProfile.name)}`} className="hover:underline">
                        {match.peerProfile.name}
                      </Link>
                    ) : (
                      "Match"
                    )}
                  </h2>
                  {unreadCount > 0 ? (
                    <span className="ml-auto rounded-full border border-accent/55 bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent-strong">
                      {unreadCount} unread
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-text-muted">{match.peerProfile?.bio ?? "No bio available."}</p>
                <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <p className="truncate text-xs text-text-muted">
                    {latestMessage?.body ?? "No messages yet. Send the first one from chat."}
                  </p>
                  <p className="mt-1 text-[11px] text-text-muted/80">
                    {latestMessage ? `Last message ${new Date(latestMessage.createdAt).toLocaleString()}` : "No activity yet"}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                  <span>Matched on {new Date(match.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    {match.peerProfile?.ownerId ? (
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(match.peerProfile!.ownerId)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${favoriteOwnerIds.includes(match.peerProfile!.ownerId) ? "border-accent/55 bg-accent/15 text-accent-strong" : "border-white/25 text-white"}`}
                      >
                        {favoriteOwnerIds.includes(match.peerProfile!.ownerId) ? "Saved" : "Save"}
                      </button>
                    ) : null}
                    <Link href={`/chat?match=${encodeURIComponent(match.id)}`} className="rounded-full bg-accent px-4 py-2 font-semibold text-[#1d1003]">
                      Open chat
                    </Link>
                  </div>
                </div>
              </article>
            );
            })
          : previewMatches.map((match) => (
              <article key={match.id} className="spotlight-card sexy-frame locked-preview rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <Image
                    src={profileImageFor({ name: match.name })}
                    alt={match.name}
                    width={44}
                    height={44}
                    className="size-11 rounded-full border border-white/20 object-cover"
                  />
                  <h2 className="text-lg font-semibold">
                    <Link href={`/models/${profileSlug(match.name)}`} className="hover:underline">
                      {match.name}
                    </Link>
                  </h2>
                </div>
                <p className="blurred-copy mt-2 text-sm text-text-muted">{match.bio}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                  <span>Mutual match preview</span>
                  <Link href="/auth/sign-in" className="rounded-full border border-accent/50 bg-accent/10 px-4 py-2 font-semibold text-accent-strong">
                    Unlock chat
                  </Link>
                </div>
              </article>
            ))}
      </div>

      {currentAccount && currentUserMatches.length === 0 ? (
        <div className="sexy-frame rounded-2xl p-5 text-sm text-text-muted">
          No matches yet. Head to <Link href="/discover" className="underline">discover</Link> and like profiles to create conversation opportunities.
        </div>
      ) : null}
    </ProductShell>
  );
}
