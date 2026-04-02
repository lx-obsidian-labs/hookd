"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { PreviewGate } from "@/app/_components/preview-gate";
import {
  readFavoriteOwnerIds,
  toggleFavoriteOwner,
  writeFavoriteOwnerIds,
} from "@/lib/model-favorites";
import { profileCoverFor, profileGalleryFor, profileImageFor, profileSlug } from "@/lib/profile-assets";
import { useHookedApp } from "@/lib/hooked-app";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReactNode, Suspense, useEffect, useMemo, useState } from "react";

function highlightQuery(text: string, query: string): ReactNode {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const chunks: ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const matchIndex = lowerText.indexOf(normalized, cursor);
    if (matchIndex === -1) {
      chunks.push(text.slice(cursor));
      break;
    }

    if (matchIndex > cursor) {
      chunks.push(text.slice(cursor, matchIndex));
    }

    const matchText = text.slice(matchIndex, matchIndex + normalized.length);
    chunks.push(
      <span key={`${matchIndex}-${matchText}`} className="rounded-sm bg-accent/20 px-0.5 text-accent-strong">
        {matchText}
      </span>,
    );
    cursor = matchIndex + normalized.length;
  }

  return chunks;
}

function DiscoverPageContent() {
  const searchParams = useSearchParams();
  const { hydrated, currentAccount, discoverFeed, state, addSwipe } = useHookedApp();
  const [notice, setNotice] = useState("");
  const [favoriteOwnerIds, setFavoriteOwnerIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFavoriteOwnerIds(readFavoriteOwnerIds());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const baseFeed = currentAccount ? discoverFeed : state.profiles.slice(0, 9);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const rankedResults = useMemo(() => {
    if (!query) {
      return [] as Array<{ profile: (typeof baseFeed)[number]; reason: string }>;
    }

    return baseFeed
      .map((profile) => {
        const name = profile.name.toLowerCase();
        const city = profile.city.toLowerCase();
        const interests = profile.interests.join(" ").toLowerCase();
        const bio = profile.bio.toLowerCase();

        let score = 0;
        let reason = "Matched profile";
        if (name === query) {
          score += 100;
          reason = "Exact name match";
        } else if (name.startsWith(query)) {
          score += 70;
          reason = "Name starts with query";
        } else if (name.includes(query)) {
          score += 45;
          reason = "Name contains query";
        }

        if (city === query) {
          score += 30;
          if (reason === "Matched profile") {
            reason = "City match";
          }
        } else if (city.includes(query)) {
          score += 18;
          if (reason === "Matched profile") {
            reason = "City contains query";
          }
        }

        if (interests.includes(query)) {
          score += 12;
          if (reason === "Matched profile") {
            reason = "Interest match";
          }
        }
        if (bio.includes(query)) {
          score += 5;
          if (reason === "Matched profile") {
            reason = "Bio match";
          }
        }

        return { profile, score, reason };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => ({ profile: item.profile, reason: item.reason }));
  }, [baseFeed, query]);

  const previewFeed = query ? rankedResults.map((item) => item.profile) : baseFeed;
  const reasonByProfileId = useMemo(() => {
    return new Map(rankedResults.map((item) => [item.profile.id, item.reason]));
  }, [rankedResults]);

  function onSwipe(userId: string, decision: "like" | "pass") {
    const result = addSwipe(userId, decision);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setNotice(result.matched ? "It is a match. Start chatting now." : "Saved. Keep exploring.");
  }

  function onToggleFavorite(ownerId: string) {
    setFavoriteOwnerIds((prev) => {
      const next = toggleFavoriteOwner(prev, ownerId);
      writeFavoriteOwnerIds(next);
      return next;
    });
  }

  return (
    <ProductShell
      title="Discover"
      description="Swipe through verified profiles, match with people you are interested in, and move quickly into conversation."
    >
      <section className="app-surface app-section reveal-rise mb-4 p-3 sm:p-5">
        <Image
          src="/asset-lounge-card.svg"
          alt=""
          width={640}
          height={420}
          className="h-28 w-full rounded-xl border border-white/10 object-cover sm:h-36"
          aria-hidden="true"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="neon-pill rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Swipe Mode</span>
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-text-muted">Find your best fit in seconds</span>
        </div>
      </section>

      {!hydrated ? <p className="text-sm text-text-muted">Loading profile feed...</p> : null}
      {!currentAccount && hydrated ? (
        <PreviewGate
          title="Discover preview mode"
          body="Browse model previews freely. Sign in to unlock likes, matching, chat, and paid experiences."
        />
      ) : null}

      {notice ? <p className="app-surface mb-4 rounded-xl px-3 py-2 text-sm text-accent-strong">{notice}</p> : null}
      {query ? (
        <div className="app-surface mb-4 rounded-xl px-3 py-2 text-xs text-text-muted">
          Search results for <span className="font-semibold text-white">&quot;{query}&quot;</span>: {previewFeed.length}
          <Link href="/discover" className="ml-2 underline">Clear search</Link>
        </div>
      ) : null}

      <div className="reveal-rise reveal-rise-delay-1 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {previewFeed.map((profile) => (
          <article
            key={profile.id}
            className={`spotlight-card app-surface app-section p-5 ${!currentAccount ? "locked-preview" : ""}`}
          >
            <Image
              src={profileCoverFor({ ownerId: profile.ownerId, name: profile.name })}
              alt=""
              width={640}
              height={360}
              className="mb-3 h-24 w-full rounded-xl border border-white/10 object-cover"
              aria-hidden="true"
            />
            <div className="mb-3 flex items-center gap-3">
              <Image
                src={profileImageFor({ ownerId: profile.ownerId, name: profile.name })}
                alt={profile.name}
                width={44}
                height={44}
                className="size-11 rounded-full border border-white/20 object-cover"
              />
              <p className="text-xs uppercase tracking-[0.14em] text-accent">{highlightQuery(profile.city, query)}</p>
            </div>
            <h2 className="text-base font-semibold">
              <Link href={`/models/${profileSlug(profile.name)}`} className="hover:underline">
                {highlightQuery(profile.name, query)}, {profile.age}
              </Link>
            </h2>
            {query ? (
              <p className="mt-1 text-[11px] font-semibold text-accent-strong">
                {reasonByProfileId.get(profile.id) ?? "Matched profile"}
              </p>
            ) : null}
            <p className={`mt-3 text-sm leading-6 text-text-muted ${!currentAccount ? "blurred-copy" : ""}`}>
              {currentAccount
                ? profile.bio
                : "Profile details are hidden in preview mode. Sign in to view full bios and live experience."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(currentAccount ? profile.interests : profile.interests.slice(0, 2)).map((interest) => (
                <span key={interest} className="rounded-full border border-white/10 px-2 py-1 text-xs text-text-muted">
                  {highlightQuery(interest, query)}
                </span>
              ))}
              {!currentAccount ? (
                <span className="rounded-full border border-accent/35 bg-accent/10 px-2 py-1 text-xs text-accent-strong">
                  Locked
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {profileGalleryFor({ ownerId: profile.ownerId, name: profile.name }).map((assetPath, index) => (
                <Image
                  key={`${assetPath}-${index}`}
                  src={assetPath}
                  alt=""
                  width={200}
                  height={120}
                  className={`h-14 w-full rounded-lg border border-white/10 object-cover ${!currentAccount ? "blurred-copy" : ""}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => onToggleFavorite(profile.ownerId)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${favoriteOwnerIds.includes(profile.ownerId) ? "border-accent/55 bg-accent/15 text-accent-strong" : "border-white/25 text-white hover:bg-white/10"}`}
              >
                {favoriteOwnerIds.includes(profile.ownerId) ? "Saved" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => onSwipe(profile.ownerId, "pass")}
                disabled={!currentAccount}
                className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pass
              </button>
              <button
                type="button"
                onClick={() => onSwipe(profile.ownerId, "like")}
                disabled={!currentAccount}
                className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-[#1d1003] transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                Like
              </button>
            </div>
            {!currentAccount ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                <span className="rounded-full border border-accent/45 bg-[#0a1522]/90 px-3 py-1 text-[11px] font-semibold text-accent-strong">
                  Unlock full profile
                </span>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {currentAccount && previewFeed.length === 0 ? (
        <div className="glass-panel mt-6 rounded-2xl p-5 text-sm text-text-muted">
          {query
            ? <>No profiles matched this search. Try another term or open <Link href="/discover" className="underline">full discover</Link>.</>
            : <>You have reviewed every profile in this demo feed. Open <Link href="/matches" className="underline">matches</Link> to continue conversations.</>}
        </div>
      ) : null}

      {!currentAccount ? (
        <div className="glass-panel mt-6 rounded-2xl p-5 text-sm text-text-muted">
          Want full profiles, unlimited swipes, and instant chat unlocks? <Link href="/auth/sign-up" className="underline">Create your account</Link>.
        </div>
      ) : null}
    </ProductShell>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-text-muted">Loading discover feed...</p>}>
      <DiscoverPageContent />
    </Suspense>
  );
}
