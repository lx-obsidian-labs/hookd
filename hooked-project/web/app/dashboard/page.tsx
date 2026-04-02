"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { useHookedApp } from "@/lib/hooked-app";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardPayload = {
  ok: boolean;
  dashboard?: {
    user: {
      displayName: string;
      profileCompletion: number;
    };
    stats: {
      newLikes: number;
      newMatches: number;
      unreadMessages: number;
      profileViews: number;
    };
    suggestions: Array<{ id: string; displayName: string; city: string; interests: string[] }>;
    recentMatches: Array<{ id: string; displayName: string; createdAt: string }>;
    verification: {
      age: boolean;
      fica: string;
      photo: string;
    };
    status: {
      accountStatus: string;
      onboardingStep: string;
    };
  };
};

export default function DashboardPage() {
  const { hydrated, currentUserMatches, getMessages, getUnreadMessageCount } = useHookedApp();
  const [data, setData] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard")
      .then((response) => response.json())
      .then((payload: DashboardPayload) => {
        if (active && payload.ok) {
          setData(payload);
        }
      })
      .catch(() => {
        // silent
      });

    return () => {
      active = false;
    };
  }, []);

  const dashboard = data?.dashboard;
  const localRecentChats = useMemo(() => {
    if (!hydrated || currentUserMatches.length === 0) {
      return [] as Array<{ matchId: string; peerName: string; body: string; createdAt: string; unreadCount: number }>;
    }

      return currentUserMatches
      .map((match) => {
        const messages = getMessages(match.id);
        const latest = messages[messages.length - 1];
        return {
          matchId: match.id,
          peerName: match.peerProfile?.name ?? "Match",
          body: latest?.body ?? "No messages yet",
          createdAt: latest?.createdAt ?? match.createdAt,
          unreadCount: getUnreadMessageCount(match.id),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [currentUserMatches, getMessages, getUnreadMessageCount, hydrated]);

  const liveUnread = useMemo(() => {
    return localRecentChats.reduce((sum, chat) => sum + chat.unreadCount, 0);
  }, [localRecentChats]);
  const unreadTotal = Math.max(dashboard?.stats.unreadMessages ?? 0, liveUnread);
  const checklist = [
    {
      label: "Age verification",
      done: Boolean(dashboard?.verification.age),
      href: "/verify-age",
    },
    {
      label: "Photo approved",
      done: dashboard?.verification.photo === "approved",
      href: "/onboarding/basic",
    },
    {
      label: "FICA approved",
      done: dashboard?.verification.fica === "verified",
      href: "/safety",
    },
    {
      label: "Complete profile basics",
      done: (dashboard?.user.profileCompletion ?? 0) >= 65,
      href: "/onboarding/basic",
    },
  ];

  return (
    <ProductShell
      title={`Welcome${dashboard?.user.displayName ? `, ${dashboard.user.displayName}` : ""}`}
      description="Your private command center for discovery, matches, chats, trust, and account safety controls."
    >
      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="app-surface app-section p-4">
          <h2 className="text-lg font-semibold">Activity overview</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <Stat label="New suggestions" value={String(dashboard?.suggestions.length ?? 0)} />
            <Stat label="Matches" value={String(dashboard?.stats.newMatches ?? 0)} />
            <Stat label="Unread messages" value={String(unreadTotal)} />
            <Stat label="Profile strength" value={`${dashboard?.user.profileCompletion ?? 0}%`} />
          </div>
        </article>

        <article className="app-surface app-section p-4">
          <h2 className="text-lg font-semibold">Trust and verification</h2>
          <div className="mt-3 space-y-1 text-sm text-text-muted">
            <p>Account status: {dashboard?.status.accountStatus ?? "loading"}</p>
            <p>Onboarding: {dashboard?.status.onboardingStep ?? "loading"}</p>
            <p>Photo moderation: {dashboard?.verification.photo ?? "loading"}</p>
            <p>Age verification: {dashboard?.verification.age ? "verified" : "pending"}</p>
            <p>FICA status: {dashboard?.verification.fica ?? "pending"}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/safety" className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold">
              Verification center
            </Link>
            <Link href="/profile" className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold">
              Profile & security
            </Link>
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <article className="app-surface app-section p-4">
          <h2 className="text-lg font-semibold">Live message previews</h2>
          {localRecentChats.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No active conversations yet. Match with someone to start chatting.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {localRecentChats.map((chat) => (
                <Link
                  key={chat.matchId}
                  href={`/chat?match=${encodeURIComponent(chat.matchId)}`}
                  className="block rounded-xl border border-white/10 bg-white/5 p-3 text-sm transition hover:border-white/30 hover:bg-white/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{chat.peerName}</p>
                    {chat.unreadCount > 0 ? (
                      <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-strong">
                        {chat.unreadCount} unread
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-text-muted">{chat.body}</p>
                  <p className="mt-1 text-[11px] text-text-muted">{new Date(chat.createdAt).toLocaleString()}</p>
                </Link>
              ))}
            </div>
          )}
          <Link href="/chat" className="mt-3 inline-flex text-xs font-semibold underline">Open chats</Link>
        </article>

        <article className="app-surface app-section p-4">
          <h2 className="text-lg font-semibold">Suggested profiles</h2>
          {!dashboard || dashboard.suggestions.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No live suggestions yet. Complete onboarding and refresh discover.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {dashboard.suggestions.slice(0, 4).map((profile) => (
                <div key={profile.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <p className="font-semibold">{profile.displayName}</p>
                  <p className="text-xs text-text-muted">{profile.city}</p>
                  {profile.interests.length ? (
                    <p className="mt-1 text-[11px] text-text-muted">{profile.interests.join(" • ")}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <Link href="/discover" className="mt-3 inline-flex text-xs font-semibold underline">Open discover</Link>
        </article>

        <article className="app-surface app-section p-4">
          <h2 className="text-lg font-semibold">Recent matches</h2>
          {!dashboard || dashboard.recentMatches.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No matches yet. Like profiles in discover to start conversations.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {dashboard.recentMatches.slice(0, 4).map((match) => (
                <div key={match.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <p className="font-semibold">{match.displayName}</p>
                  <p className="text-xs text-text-muted">Matched {new Date(match.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
          <Link href="/matches" className="mt-3 inline-flex text-xs font-semibold underline">Open matches</Link>
        </article>
      </section>

      <section className="mt-4 app-surface app-section p-4">
        <h2 className="text-lg font-semibold">Profile completion checklist</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <p className={item.done ? "text-emerald-300" : "text-white"}>{item.done ? "[x]" : "[ ]"} {item.label}</p>
              {!item.done ? (
                <Link href={item.href} className="mt-1 inline-flex text-xs font-semibold underline">Complete now</Link>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <QuickAction title="Privacy controls" body="Manage visibility, online status, and account pause options." href="/profile" />
        <QuickAction title="Safety center" body="Submit reports, manage verification, and review compliance." href="/safety" />
        <QuickAction title="Premium controls" body="Calls, wallet, and monetization stay limited until trust checks pass." href="/wallet" />
      </section>
    </ProductShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

function QuickAction({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <article className="app-surface app-section p-4">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-text-muted">{body}</p>
      <Link href={href} className="mt-3 inline-flex text-xs font-semibold underline">Open</Link>
    </article>
  );
}
