"use client";

import { PreviewGate } from "@/app/_components/preview-gate";
import {
  readFavoriteOwnerIds,
  toggleFavoriteOwner,
  writeFavoriteOwnerIds,
} from "@/lib/model-favorites";
import { ProductShell } from "@/app/_components/product-shell";
import { profileCoverFor, profileGalleryFor, profileImageFor, profileSlug } from "@/lib/profile-assets";
import { useHookedApp } from "@/lib/hooked-app";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type ModelProfileClientProps = {
  slug: string;
};

export function ModelProfileClient({ slug }: ModelProfileClientProps) {
  const { currentAccount, state, currentUserMatches } = useHookedApp();
  const [favoriteOwnerIds, setFavoriteOwnerIds] = useState<string[]>(() => readFavoriteOwnerIds());

  const profile = state.profiles.find((item) => profileSlug(item.name) === slug) ?? null;
  const matched = profile
    ? currentUserMatches.find((match) => match.peerProfile?.ownerId === profile.ownerId)
    : null;

  function onToggleFavorite(ownerId: string) {
    setFavoriteOwnerIds((prev) => {
      const next = toggleFavoriteOwner(prev, ownerId);
      writeFavoriteOwnerIds(next);
      return next;
    });
  }

  if (!profile) {
    return (
      <ProductShell
        title="Model profile"
        description="This profile was not found in the current feed."
      >
        <div className="glass-panel rounded-2xl p-6 text-sm text-text-muted">
          We could not find this model. Head back to <Link href="/discover" className="underline">discover</Link>.
        </div>
      </ProductShell>
    );
  }

  return (
    <ProductShell
      title={`${profile.name} profile`}
      description="Creator profile preview with gallery, pricing lane, and unlock actions."
    >
      {!currentAccount ? (
        <PreviewGate
          title="Model profile preview"
          body="Browse profile highlights and gallery previews. Sign in to match, chat, and unlock premium interactions."
        />
      ) : null}

      <article className={`sexy-frame reveal-rise rounded-2xl p-5 ${!currentAccount ? "locked-preview" : ""}`}>
        <Image
          src={profileCoverFor({ ownerId: profile.ownerId, name: profile.name })}
          alt=""
          width={640}
          height={360}
          className="h-48 w-full rounded-xl border border-white/10 object-cover"
          aria-hidden="true"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Image
            src={profileImageFor({ ownerId: profile.ownerId, name: profile.name })}
            alt={profile.name}
            width={64}
            height={64}
            className="size-16 rounded-full border border-white/20 object-cover"
          />
          <div>
            <h2 className="text-xl font-semibold">{profile.name}, {profile.age}</h2>
            <p className="text-sm text-accent-strong">{profile.city}</p>
          </div>
          <span className="neon-pill rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em]">
            Live creator
          </span>
          <button
            type="button"
            onClick={() => onToggleFavorite(profile.ownerId)}
            className={`ml-auto rounded-full border px-3 py-1.5 text-xs font-semibold ${favoriteOwnerIds.includes(profile.ownerId) ? "border-accent/55 bg-accent/15 text-accent-strong" : "border-white/25 text-white"}`}
          >
            {favoriteOwnerIds.includes(profile.ownerId) ? "Saved" : "Save"}
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { label: "Call rate", value: "22 tokens/min" },
            { label: "Media unlock", value: "15-40 tokens" },
            { label: "Response", value: "Fast replies" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-text-muted">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
        <p className={`mt-4 text-sm leading-6 text-text-muted ${!currentAccount ? "blurred-copy" : ""}`}>
          {currentAccount ? profile.bio : "Full bio and preferences are visible after sign-in."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(currentAccount ? profile.interests : profile.interests.slice(0, 2)).map((interest) => (
            <span key={interest} className="rounded-full border border-white/10 px-2 py-1 text-xs text-text-muted">
              {interest}
            </span>
          ))}
        </div>
      </article>

      <section className="reveal-rise reveal-rise-delay-1 mt-4 grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <article className="sexy-frame rounded-2xl p-5">
          <h3 className="text-base font-semibold">Gallery</h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {profileGalleryFor({ ownerId: profile.ownerId, name: profile.name }).map((assetPath, index) => (
              <Image
                key={`${assetPath}-${index}`}
                src={assetPath}
                alt=""
                width={200}
                height={120}
                className={`spotlight-card h-24 w-full rounded-lg border border-white/10 object-cover ${!currentAccount ? "blurred-copy" : ""}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Image
              src="/asset-lounge-card.svg"
              alt=""
              width={640}
              height={420}
              className="h-28 w-full rounded-lg border border-white/10 object-cover"
              aria-hidden="true"
            />
            <Image
              src="/asset-neon-card.svg"
              alt=""
              width={640}
              height={420}
              className="h-28 w-full rounded-lg border border-white/10 object-cover"
              aria-hidden="true"
            />
          </div>
        </article>

        <article className="sexy-frame rounded-2xl p-5">
          <h3 className="text-base font-semibold">Premium menu</h3>
          <div className="mt-3 space-y-2 text-sm text-text-muted">
            <p className="rounded-xl border border-white/10 bg-white/5 p-3">Photo unlock from 15 tokens</p>
            <p className="rounded-xl border border-white/10 bg-white/5 p-3">Video unlock from 40 tokens</p>
            <p className="rounded-xl border border-white/10 bg-white/5 p-3">Private call from 22 tokens/min</p>
          </div>
          <div className="mt-3 rounded-xl border border-accent/35 bg-[#1f1714]/84 p-3 text-xs text-text-muted">
            Transparent pricing before every paid action. You always see token cost before unlock.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!currentAccount ? (
              <>
                <Link href="/auth/sign-in" className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-[#1d1003]">
                  Sign in to unlock
                </Link>
                <Link href="/auth/sign-up" className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white">
                  Create account
                </Link>
              </>
            ) : matched ? (
              <Link
                href={`/chat?match=${encodeURIComponent(matched.id)}`}
                className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-[#1d1003]"
              >
                Open chat
              </Link>
            ) : (
              <Link href="/discover" className="rounded-full border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent-strong">
                Match first in discover
              </Link>
            )}
          </div>
        </article>
      </section>
    </ProductShell>
  );
}
