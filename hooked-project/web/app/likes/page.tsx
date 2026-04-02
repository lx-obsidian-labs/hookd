"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { useHookedApp } from "@/lib/hooked-app";
import Link from "next/link";
import { useMemo } from "react";

export default function LikesPage() {
  const { currentAccount, state, state: { profiles } } = useHookedApp();

  const outgoingLikes = useMemo(() => {
    if (!currentAccount) {
      return [];
    }
    const likedIds = state.swipes
      .filter((swipe) => swipe.fromUserId === currentAccount.id && swipe.decision === "like")
      .map((swipe) => swipe.toUserId);
    return profiles.filter((profile) => likedIds.includes(profile.ownerId));
  }, [currentAccount, profiles, state.swipes]);

  return (
    <ProductShell
      title="Likes"
      description="Track profiles you liked and revisit them quickly for follow-up actions."
    >
      <section className="app-surface app-section p-4">
        <p className="text-sm text-text-muted">
          Total outgoing likes: <span className="font-semibold text-white">{outgoingLikes.length}</span>
        </p>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {outgoingLikes.map((profile) => (
          <article key={profile.id} className="app-surface app-section p-4">
            <p className="text-base font-semibold">{profile.name}</p>
            <p className="text-xs text-text-muted">{profile.city} • {profile.age}</p>
            <p className="mt-2 line-clamp-2 text-sm text-text-muted">{profile.bio}</p>
            <Link href="/discover" className="mt-3 inline-flex text-xs font-semibold underline">
              Continue in discover
            </Link>
          </article>
        ))}
      </section>

      {outgoingLikes.length === 0 ? (
        <section className="app-surface app-section mt-4 p-4 text-sm text-text-muted">
          No likes yet. Browse <Link href="/discover" className="underline">discover</Link> and like profiles to build your list.
        </section>
      ) : null}
    </ProductShell>
  );
}
