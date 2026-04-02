"use client";

import { ProductShell } from "@/app/_components/product-shell";
import {
  readFavoriteOwnerIds,
  writeFavoriteOwnerIds,
} from "@/lib/model-favorites";
import { profileCoverFor, profileImageFor, profileSlug } from "@/lib/profile-assets";
import { useHookedApp } from "@/lib/hooked-app";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SortMode = "recent" | "distance" | "activity" | "name";

function hashToUnit(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return (hash % 10_000) / 10_000;
}

export default function FavoritesPage() {
  const { state, currentAccount, currentUserMatches, discoverFeed } = useHookedApp();
  const [favoriteOwnerIds, setFavoriteOwnerIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [listMode, setListMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFavoriteOwnerIds(readFavoriteOwnerIds());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function removeFavorite(ownerId: string) {
    setFavoriteOwnerIds((prev) => {
      const next = prev.filter((id) => id !== ownerId);
      writeFavoriteOwnerIds(next);
      return next;
    });
  }

  const favoriteProfiles = useMemo(
    () => state.profiles.filter((profile) => favoriteOwnerIds.includes(profile.ownerId)),
    [favoriteOwnerIds, state.profiles],
  );

  const favoriteRank = useMemo(() => {
    const rank = new Map<string, number>();
    favoriteOwnerIds.forEach((ownerId, index) => {
      rank.set(ownerId, index);
    });
    return rank;
  }, [favoriteOwnerIds]);

  const matchesByOwner = useMemo(() => {
    const map = new Map<string, string>();
    currentUserMatches.forEach((match) => {
      if (match.peerProfile?.ownerId) {
        map.set(match.peerProfile.ownerId, match.id);
      }
    });
    return map;
  }, [currentUserMatches]);

  const enrichedFavorites = useMemo(() => {
    return favoriteProfiles.map((profile) => {
      const onlineRoll = hashToUnit(`${profile.ownerId}:online`);
      const verifiedRoll = hashToUnit(`${profile.ownerId}:verified`);
      const activityRoll = hashToUnit(`${profile.ownerId}:activity`);
      const minutesSinceActive = Math.floor(hashToUnit(`${profile.ownerId}:minutes`) * 57) + 3;
      const distanceKm = Math.floor(hashToUnit(`${profile.ownerId}:distance`) * 32) + 2;

      return {
        profile,
        addedRank: favoriteRank.get(profile.ownerId) ?? 10_000,
        onlineNow: onlineRoll > 0.56,
        verified: verifiedRoll > 0.33,
        newActivity: activityRoll > 0.72,
        minutesSinceActive,
        distanceKm,
      };
    });
  }, [favoriteProfiles, favoriteRank]);

  const visibleFavorites = useMemo(() => {
    const query = search.trim().toLowerCase();
    let items = enrichedFavorites.filter((item) => {
      if (!query) {
        return true;
      }
      return (
        item.profile.name.toLowerCase().includes(query) ||
        item.profile.city.toLowerCase().includes(query) ||
        item.profile.interests.some((interest) => interest.toLowerCase().includes(query))
      );
    });

    if (verifiedOnly) {
      items = items.filter((item) => item.verified);
    }
    if (onlineOnly) {
      items = items.filter((item) => item.onlineNow);
    }

    const sorted = [...items];
    if (sortMode === "recent") {
      sorted.sort((a, b) => a.addedRank - b.addedRank);
    } else if (sortMode === "distance") {
      sorted.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortMode === "activity") {
      sorted.sort((a, b) => Number(b.newActivity) - Number(a.newActivity) || Number(b.onlineNow) - Number(a.onlineNow));
    } else {
      sorted.sort((a, b) => a.profile.name.localeCompare(b.profile.name));
    }
    return sorted;
  }, [enrichedFavorites, onlineOnly, search, sortMode, verifiedOnly]);

  const stats = useMemo(() => {
    const saved = enrichedFavorites.length;
    const online = enrichedFavorites.filter((item) => item.onlineNow).length;
    const verified = enrichedFavorites.filter((item) => item.verified).length;
    const activity = enrichedFavorites.filter((item) => item.newActivity).length;
    return { saved, online, verified, activity };
  }, [enrichedFavorites]);

  const suggestedProfiles = useMemo(() => discoverFeed.slice(0, 4), [discoverFeed]);

  const recentActive = useMemo(
    () => [...enrichedFavorites].sort((a, b) => Number(b.onlineNow) - Number(a.onlineNow) || a.minutesSinceActive - b.minutesSinceActive).slice(0, 5),
    [enrichedFavorites],
  );

  return (
    <ProductShell
      title="Favorites"
      description="Your high-intent shortlist with quick filtering, trust signals, and one-tap actions into profile or chat."
    >
      <section className="app-surface app-section reveal-rise p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">Favorites command center</p>
            <p className="mt-1 text-sm text-text-muted">Search, sort, and act on saved profiles without losing context.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/discover" className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10">
              Browse more
            </Link>
            <Link href="/hookup" className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-[#1d1003]">
              Hook nearby
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Saved profiles" value={String(stats.saved)} tone="default" />
        <Stat title="Online now" value={String(stats.online)} tone="signal" />
        <Stat title="Verified" value={String(stats.verified)} tone="verified" />
        <Stat title="New activity" value={String(stats.activity)} tone="accent" />
      </section>

      <section className="app-surface app-section mt-4 p-4">
        <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, city, or interests"
            className="app-input rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="app-input rounded-xl px-3 py-2 text-sm"
          >
            <option value="recent">Sort: recently added</option>
            <option value="activity">Sort: activity first</option>
            <option value="distance">Sort: nearest first</option>
            <option value="name">Sort: name A-Z</option>
          </select>
          <button
            type="button"
            onClick={() => setOnlineOnly((prev) => !prev)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${onlineOnly ? "border-accent/55 bg-accent/15 text-accent-strong" : "border-white/20 text-white/85"}`}
          >
            {onlineOnly ? "Online only: on" : "Online only"}
          </button>
          <button
            type="button"
            onClick={() => setVerifiedOnly((prev) => !prev)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${verifiedOnly ? "border-emerald-400/45 bg-emerald-400/10 text-emerald-300" : "border-white/20 text-white/85"}`}
          >
            {verifiedOnly ? "Verified only: on" : "Verified only"}
          </button>
          <button
            type="button"
            onClick={() => setListMode((prev) => (prev === "grid" ? "list" : "grid"))}
            className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white/85"
          >
            {listMode === "grid" ? "List view" : "Grid view"}
          </button>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          {visibleFavorites.length > 0 ? (
            <section className={`reveal-rise reveal-rise-delay-1 grid gap-4 ${listMode === "grid" ? "md:grid-cols-2" : "grid-cols-1"}`}>
              {visibleFavorites.map((item) => {
                const profile = item.profile;
                const activeLabel = item.onlineNow ? "Online now" : `Active ${item.minutesSinceActive}m ago`;
                const existingMatchId = matchesByOwner.get(profile.ownerId);
                return (
            <article key={profile.id} className="spotlight-card app-surface app-section p-4">
              <Image
                src={profileCoverFor({ ownerId: profile.ownerId, name: profile.name })}
                alt=""
                width={640}
                height={360}
                className={`w-full rounded-xl border border-white/10 object-cover ${listMode === "grid" ? "h-24" : "h-32"}`}
                aria-hidden="true"
              />
              <div className="mt-3 flex items-start gap-2">
                <Image
                  src={profileImageFor({ ownerId: profile.ownerId, name: profile.name })}
                  alt={profile.name}
                  width={40}
                  height={40}
                  className="size-10 rounded-full border border-white/20 object-cover"
                />
                <div>
                  <p className="text-sm font-semibold">{profile.name}, {profile.age}</p>
                  <p className="text-xs text-text-muted">{profile.city} • {item.distanceKm} km away</p>
                  <p className="mt-1 text-[11px] text-text-muted">{activeLabel}</p>
                </div>
                <div className="ml-auto flex flex-wrap justify-end gap-1">
                  {item.verified ? <span className="rounded-full border border-emerald-400/45 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Verified</span> : null}
                  {item.newActivity ? <span className="rounded-full border border-accent/45 bg-accent/12 px-2 py-0.5 text-[10px] font-semibold text-accent-strong">New activity</span> : null}
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-text-muted">{profile.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.interests.slice(0, 3).map((interest) => (
                  <span key={interest} className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-text-muted">
                    {interest}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => removeFavorite(profile.ownerId)}
                  className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Remove
                </button>
                <Link
                  href={`/models/${profileSlug(profile.name)}`}
                  className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold"
                >
                  View profile
                </Link>
                <Link
                  href={!currentAccount ? "/auth/sign-in" : existingMatchId ? `/chat?match=${encodeURIComponent(existingMatchId)}` : "/hookup"}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-[#1d1003]"
                >
                  {!currentAccount ? "Sign in to unlock" : existingMatchId ? "Message" : "Hook now"}
                </Link>
              </div>
            </article>
                );
              })}
            </section>
          ) : (
            <div className="app-surface mt-1 rounded-2xl p-5 text-sm text-text-muted">
              No favorites match the current filters. Try resetting filters or browse <Link href="/models" className="underline">models</Link>.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <article className="app-surface app-section p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/90">Recently active</h2>
            <div className="mt-3 space-y-2">
              {recentActive.length === 0 ? (
                <p className="text-sm text-text-muted">No saved profiles yet.</p>
              ) : (
                recentActive.map((item) => (
                  <div key={item.profile.id} className="rounded-xl border border-white/10 bg-white/5 p-2 text-xs">
                    <p className="font-semibold text-white">{item.profile.name}</p>
                    <p className="text-text-muted">{item.onlineNow ? "Online now" : `Active ${item.minutesSinceActive}m ago`}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="app-surface app-section p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/90">You may also like</h2>
            <div className="mt-3 space-y-2">
              {suggestedProfiles.length === 0 ? (
                <p className="text-sm text-text-muted">No suggestions yet.</p>
              ) : (
                suggestedProfiles.map((profile) => (
                  <div key={profile.id} className="rounded-xl border border-white/10 bg-white/5 p-2 text-xs">
                    <p className="font-semibold text-white">{profile.name}</p>
                    <p className="text-text-muted">{profile.city}</p>
                  </div>
                ))
              )}
            </div>
            <Link href="/discover" className="mt-3 inline-flex text-xs font-semibold underline">Open discover</Link>
          </article>

          <article className="app-surface app-section p-4 text-xs text-text-muted">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/90">Trust and privacy</h2>
            <ul className="mt-3 space-y-1">
              <li>Encrypted sessions and account activity logs are active.</li>
              <li>Verified badges highlight lower-risk profiles.</li>
              <li>Block, report, and safety verification controls live in Safety.</li>
            </ul>
            <Link href="/safety" className="mt-3 inline-flex text-xs font-semibold underline">Open safety center</Link>
          </article>
        </aside>
      </section>
    </ProductShell>
  );
}

function Stat({ title, value, tone }: { title: string; value: string; tone: "default" | "signal" | "verified" | "accent" }) {
  const toneClass =
    tone === "signal"
      ? "text-emerald-300"
      : tone === "verified"
        ? "text-sky-300"
        : tone === "accent"
          ? "text-accent-strong"
          : "text-white";

  return (
    <article className="app-surface app-section p-3">
      <p className={`text-xl font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-text-muted">{title}</p>
    </article>
  );
}
