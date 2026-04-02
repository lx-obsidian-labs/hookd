"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { profileImageFor } from "@/lib/profile-assets";
import { useHookedApp } from "@/lib/hooked-app";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type Coords = { lat: number; lon: number };

function hashToUnit(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return (hash % 10_000) / 10_000;
}

function haversineKm(a: Coords, b: Coords) {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function pseudoProfileCoords(userCoords: Coords, seed: string): Coords {
  const latJitter = (hashToUnit(`${seed}:lat`) - 0.5) * 0.6;
  const lonJitter = (hashToUnit(`${seed}:lon`) - 0.5) * 0.8;
  return {
    lat: userCoords.lat + latJitter,
    lon: userCoords.lon + lonJitter,
  };
}

export default function HookupPage() {
  const { hydrated, currentAccount, discoverFeed, currentUserHookRequests, sendHookRequest } = useHookedApp();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [notice, setNotice] = useState("");
  const [locationError, setLocationError] = useState("");

  const latestOutgoing = useMemo(() => {
    const map = new Map<string, { status: "accepted" | "rejected"; createdAt: string }>();
    for (const item of currentUserHookRequests) {
      if (item.fromUserId !== currentAccount?.id) {
        continue;
      }
      if (!map.has(item.toUserId)) {
        map.set(item.toUserId, { status: item.status, createdAt: item.createdAt });
      }
    }
    return map;
  }, [currentAccount?.id, currentUserHookRequests]);

  const nearbyProfiles = useMemo(() => {
    if (!coords) {
      return discoverFeed.slice(0, 12).map((profile) => ({ profile, distanceKm: null as number | null }));
    }

    return discoverFeed
      .map((profile) => {
        const target = pseudoProfileCoords(coords, profile.ownerId);
        return { profile, distanceKm: haversineKm(coords, target) };
      })
      .filter((entry) => entry.distanceKm <= 40)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12);
  }, [coords, discoverFeed]);

  const recentResponses = useMemo(
    () => currentUserHookRequests.filter((item) => item.fromUserId === currentAccount?.id).slice(0, 6),
    [currentAccount?.id, currentUserHookRequests],
  );

  function onUseLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        setLocationError("");
      },
      () => {
        setLocationError("Location permission denied. Enable location to see nearby profiles.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }

  function onHook(ownerId: string) {
    const result = sendHookRequest(ownerId);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setNotice(result.status === "accepted" ? "Accepted. Jump into chat from matches." : "Rejected. Keep exploring nearby people.");
  }

  return (
    <ProductShell
      title="Hookup Radar"
      description="Tap Hook to send instant connection requests. Nearby results get ranked with your location for faster replies."
    >
      {!hydrated ? <p className="text-sm text-text-muted">Loading hookup radar...</p> : null}
      {notice ? <p className="app-surface mb-4 rounded-xl px-3 py-2 text-sm text-accent-strong">{notice}</p> : null}

      <section className="app-surface app-section mb-4 flex flex-wrap items-center gap-2 p-4">
        <button
          type="button"
          onClick={onUseLocation}
          className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
        >
          Use my location
        </button>
        <span className="text-xs text-text-muted">
          {coords ? `Tracking near ${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}` : "Location off. Enable for nearby sorting."}
        </span>
        {locationError ? <span className="text-xs text-amber-300">{locationError}</span> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {nearbyProfiles.map(({ profile, distanceKm }) => {
            const latest = latestOutgoing.get(profile.ownerId);
            return (
              <article key={profile.id} className="app-surface app-section p-4">
                <div className="flex items-center gap-3">
                  <Image
                    src={profileImageFor({ ownerId: profile.ownerId, name: profile.name })}
                    alt={profile.name}
                    width={46}
                    height={46}
                    className="size-11 rounded-full border border-white/20 object-cover"
                  />
                  <div>
                    <p className="font-semibold">{profile.name}, {profile.age}</p>
                    <p className="text-xs text-text-muted">
                      {distanceKm === null ? profile.city : `${distanceKm.toFixed(1)} km away`}
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-text-muted">{profile.bio}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onHook(profile.ownerId)}
                    disabled={!currentAccount}
                    className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-[#1d1003] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hook
                  </button>
                  {latest ? (
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${latest.status === "accepted" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-rose-400/40 bg-rose-400/10 text-rose-300"}`}>
                      {latest.status}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="app-surface app-section p-4">
          <h2 className="text-base font-semibold">Recent hook responses</h2>
          {recentResponses.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No responses yet. Send your first hook request.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {recentResponses.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-text-muted">
                  <p>
                    Request {item.status} at {new Date(item.respondedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
          <Link href="/matches" className="mt-3 inline-flex text-xs font-semibold underline">Open matches</Link>
        </aside>
      </section>
    </ProductShell>
  );
}
