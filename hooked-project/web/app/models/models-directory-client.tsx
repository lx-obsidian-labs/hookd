"use client";

import { ProductShell } from "@/app/_components/product-shell";
import {
  readFavoriteOwnerIds,
  toggleFavoriteOwner,
  writeFavoriteOwnerIds,
} from "@/lib/model-favorites";
import { profileCoverFor, profileImageFor, profileSlug } from "@/lib/profile-assets";
import { useHookedApp } from "@/lib/hooked-app";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function minuteRate(name: string) {
  return 18 + (name.length % 5) * 3;
}

function isOnline(ownerId: string) {
  return ownerId.includes("jules") || ownerId.includes("nia");
}

export function ModelsDirectoryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, currentAccount } = useHookedApp();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [city, setCity] = useState(() => searchParams.get("city") ?? "all");
  const [maxRate, setMaxRate] = useState(() => {
    const parsed = Number(searchParams.get("maxRate") ?? "36");
    return Number.isFinite(parsed) ? Math.min(36, Math.max(18, parsed)) : 36;
  });
  const [onlineOnly, setOnlineOnly] = useState(() => searchParams.get("online") === "1");
  const [favoritesOnly, setFavoritesOnly] = useState(() => searchParams.get("fav") === "1");
  const [sort, setSort] = useState(() => searchParams.get("sort") ?? "popular");
  const [favoriteOwnerIds, setFavoriteOwnerIds] = useState<string[]>([]);
  const [shareNotice, setShareNotice] = useState("");

  const activeFilterCount =
    Number(search.trim().length > 0) +
    Number(city !== "all") +
    Number(maxRate !== 36) +
    Number(onlineOnly) +
    Number(favoritesOnly) +
    Number(sort !== "popular");

  function clearFilters() {
    setSearch("");
    setCity("all");
    setMaxRate(36);
    setOnlineOnly(false);
    setFavoritesOnly(false);
    setSort("popular");
  }

  function toggleFavorite(ownerId: string) {
    setFavoriteOwnerIds((prev) => {
      const next = toggleFavoriteOwner(prev, ownerId);
      writeFavoriteOwnerIds(next);
      return next;
    });
  }

  async function copyShareLink() {
    if (typeof window === "undefined") {
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareNotice("Share link copied.");
    } catch {
      setShareNotice("Could not copy link.");
    }
    setTimeout(() => setShareNotice(""), 1800);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFavoriteOwnerIds(readFavoriteOwnerIds());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("q", search.trim());
    }
    if (city !== "all") {
      params.set("city", city);
    }
    if (maxRate !== 36) {
      params.set("maxRate", String(maxRate));
    }
    if (onlineOnly) {
      params.set("online", "1");
    }
    if (favoritesOnly) {
      params.set("fav", "1");
    }
    if (sort !== "popular") {
      params.set("sort", sort);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [city, favoritesOnly, maxRate, onlineOnly, pathname, router, search, sort]);

  const cities = useMemo(() => {
    const unique = Array.from(new Set(state.profiles.map((profile) => profile.city)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [state.profiles]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.profiles.filter((profile) => {
      const matchesQuery =
        !query ||
        profile.name.toLowerCase().includes(query) ||
        profile.interests.some((interest) => interest.toLowerCase().includes(query));
      const matchesCity = city === "all" || profile.city === city;
      const rate = minuteRate(profile.name);
      const matchesRate = rate <= maxRate;
      const matchesOnline = !onlineOnly || isOnline(profile.ownerId);
      const matchesFavorites = !favoritesOnly || favoriteOwnerIds.includes(profile.ownerId);
      return matchesQuery && matchesCity && matchesRate && matchesOnline && matchesFavorites;
    });
  }, [city, favoriteOwnerIds, favoritesOnly, maxRate, onlineOnly, search, state.profiles]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === "lowest-rate") {
      return list.sort((a, b) => minuteRate(a.name) - minuteRate(b.name));
    }
    if (sort === "newest") {
      const indexById = new Map(state.profiles.map((item, index) => [item.id, index]));
      return list.sort((a, b) => (indexById.get(b.id) ?? 0) - (indexById.get(a.id) ?? 0));
    }
    return list.sort((a, b) => {
      const onlineScore = Number(isOnline(b.ownerId)) - Number(isOnline(a.ownerId));
      if (onlineScore !== 0) {
        return onlineScore;
      }
      return a.name.localeCompare(b.name);
    });
  }, [filtered, sort, state.profiles]);

  return (
    <ProductShell
      title="Models"
      description="Browse creator profiles, compare rates, and open profiles before matching or unlocking premium sessions."
    >
      <section className="app-surface app-section reveal-rise p-3 sm:p-5">
        <Image
          src="/asset-neon-card.svg"
          alt=""
          width={640}
          height={420}
          className="h-28 w-full rounded-xl border border-white/10 object-cover sm:h-36"
          aria-hidden="true"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="neon-pill rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Directory</span>
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-text-muted">Live availability + rates</span>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <label className="text-sm text-text-muted">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or interest"
               className="app-input mt-1 w-full rounded-xl px-3 py-2"
            />
          </label>
          <label className="text-sm text-text-muted">
            City
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
               className="app-input mt-1 w-full rounded-xl px-3 py-2"
            >
              <option value="all">All cities</option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-text-muted">
            Max rate: {maxRate} tokens/min
            <input
              type="range"
              min={18}
              max={36}
              step={3}
              value={maxRate}
              onChange={(event) => setMaxRate(Number(event.target.value))}
              className="mt-3 w-full"
            />
          </label>
          <label className="flex items-end gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={(event) => setOnlineOnly(event.target.checked)}
              className="mb-0.5"
            />
            Online now only
          </label>
          <label className="flex items-end gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(event) => setFavoritesOnly(event.target.checked)}
              className="mb-0.5"
            />
            Favorites only
          </label>
          <label className="text-sm text-text-muted">
            Sort by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
               className="app-input mt-1 w-full rounded-xl px-3 py-2"
              >
                <option value="popular">Most popular</option>
                <option value="lowest-rate">Lowest rate</option>
                <option value="newest">Newest</option>
              </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-text-muted">
            {sorted.length} models
          </span>
          <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs text-accent-strong">
            {activeFilterCount} active filters
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-text-muted">
            {favoriteOwnerIds.length} saved models
          </span>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white"
          >
            Clear filters
          </button>
          <button
            type="button"
            onClick={copyShareLink}
            className="rounded-full border border-accent/45 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-strong"
          >
            Copy share link
          </button>
          {shareNotice ? <span className="text-xs text-text-muted">{shareNotice}</span> : null}
        </div>
      </section>

      <section className="reveal-rise reveal-rise-delay-1 mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map((profile) => {
          const rate = minuteRate(profile.name);
          const online = isOnline(profile.ownerId);
          const saved = favoriteOwnerIds.includes(profile.ownerId);
          return (
            <article key={profile.id} className="spotlight-card app-surface app-section p-4">
              <Image
                src={profileCoverFor({ ownerId: profile.ownerId, name: profile.name })}
                alt=""
                width={640}
                height={360}
                className="h-24 w-full rounded-xl border border-white/10 object-cover"
                aria-hidden="true"
              />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src={profileImageFor({ ownerId: profile.ownerId, name: profile.name })}
                    alt={profile.name}
                    width={40}
                    height={40}
                    className="size-10 rounded-full border border-white/20 object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold">{profile.name}</p>
                    <p className="text-xs text-text-muted">{profile.city}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${online ? "border-signal/40 bg-signal/10 text-signal" : "border-white/15 bg-white/5 text-text-muted"}`}
                >
                  {online ? "Online" : "Offline"}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-text-muted">{profile.bio}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                <span>{rate} tokens/min</span>
                <span>Media from 15 tokens</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleFavorite(profile.ownerId)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${saved ? "border-accent/55 bg-accent/15 text-accent-strong" : "border-white/25 text-white"}`}
                >
                  {saved ? "Saved" : "Save"}
                </button>
                <Link
                  href={`/models/${profileSlug(profile.name)}`}
                  className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold"
                >
                  View profile
                </Link>
                <Link
                  href={currentAccount ? "/discover" : "/auth/sign-in"}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-[#1d1003]"
                >
                  {currentAccount ? "Match in discover" : "Sign in to unlock"}
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      {sorted.length === 0 ? (
        <div className="sexy-frame mt-4 rounded-2xl p-5 text-sm text-text-muted">
          No models match your filters. Adjust city, rate, or search terms.
        </div>
      ) : null}
    </ProductShell>
  );
}
