"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useHookedApp } from "@/lib/hooked-app";
import { clearSessionCookie } from "@/lib/auth-session-client";
import { readFavoriteOwnerIds } from "@/lib/model-favorites";
import { profileSlug } from "@/lib/profile-assets";

type ProductShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

type NavItem = { label: string; href: string };
type SidebarSection = { title: string; items: NavItem[] };
type TopTab = { label: string; href: string };
type QuickResult = { id: string; label: string; meta: string; reason: string; href: string };

const publicTopTabs = [
  { label: "Girls", href: "/models" },
  { label: "Couples", href: "/discover" },
  { label: "Guys", href: "/matches" },
  { label: "Trans", href: "/calls" },
];

const userTopTabs = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Discover", href: "/discover" },
  { label: "Hookup", href: "/hookup" },
  { label: "Models", href: "/models" },
  { label: "Matches", href: "/matches" },
];

const modelTopTabs = [
  { label: "Dashboard", href: "/profile" },
  { label: "Audience", href: "/matches" },
  { label: "Messages", href: "/chat" },
  { label: "Live", href: "/calls" },
];

const userSidebarSections: SidebarSection[] = [
  {
    title: "Main",
    items: [
      { label: "Home", href: "/dashboard" },
      { label: "Discover", href: "/discover" },
      { label: "Hookup Radar", href: "/hookup" },
      { label: "Feed", href: "/models" },
      { label: "Likes", href: "/likes" },
      { label: "Favorites", href: "/favorites" },
    ],
  },
  {
    title: "Library",
    items: [
      { label: "Matches", href: "/matches" },
      { label: "Watch History", href: "/chat" },
      { label: "Best for Privates", href: "/calls" },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "Profile", href: "/profile" },
      { label: "Safety", href: "/safety" },
      { label: "AI Companion", href: "/ai-companion" },
    ],
  },
];

const modelSidebarSections: SidebarSection[] = [
  {
    title: "Studio",
    items: [
      { label: "Creator Home", href: "/profile" },
      { label: "Incoming Matches", href: "/matches" },
      { label: "Chat Inbox", href: "/chat" },
      { label: "Live Rooms", href: "/calls" },
      { label: "Wallet", href: "/wallet" },
      { label: "Safety", href: "/safety" },
      { label: "AI Companion", href: "/ai-companion" },
    ],
  },
];

const mobileQuickItems = [
  { label: "Home", href: "/dashboard" },
  { label: "Hook", href: "/hookup" },
  { label: "Chat", href: "/chat" },
  { label: "Calls", href: "/calls" },
  { label: "AI", href: "/ai-companion" },
];

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

export function ProductShell({
  title,
  description,
  children,
}: ProductShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, currentAccount, currentUserMatches, discoverFeed, state, getUnreadMessageCount, signOut } = useHookedApp();
  const accountForRender = hydrated ? currentAccount : null;
  const [accountStatus, setAccountStatus] = useState<"pending_verification" | "active" | "limited" | "under_review" | "banned" | "suspended" | null>(null);
  const [limits, setLimits] = useState<{ wallet: boolean; calls: boolean; monetization: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  async function onSignOut() {
    signOut();
    try {
      await clearSessionCookie();
    } catch {
      // keep local logout state
    }
    router.push("/auth/sign-in");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const topTabs: TopTab[] =
    accountForRender?.role === "model"
      ? modelTopTabs
      : accountForRender?.role === "user"
        ? userTopTabs
        : publicTopTabs;

  const sidebarSections = accountForRender?.role === "model" ? modelSidebarSections : userSidebarSections;

  const mobileItems = accountForRender
    ? [
        mobileQuickItems[0],
        mobileQuickItems[1],
        mobileQuickItems[2],
        mobileQuickItems[3],
        { label: "Profile", href: "/profile" },
      ]
    : mobileQuickItems;

  const unreadChatCount = accountForRender
    ? currentUserMatches.reduce((sum, match) => sum + getUnreadMessageCount(match.id), 0)
    : 0;

  const modelProfileCount = useMemo(() => {
    const modelAccountIds = new Set(
      state.accounts.filter((account) => account.role === "model").map((account) => account.id),
    );
    return state.profiles.filter((profile) => modelAccountIds.has(profile.ownerId)).length;
  }, [state.accounts, state.profiles]);

  const favoriteCount = hydrated ? readFavoriteOwnerIds().length : 0;

  const quickResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return [] as QuickResult[];
    }

    return state.profiles
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
      .slice(0, 6)
      .map((item) => ({
        id: item.profile.id,
        label: item.profile.name,
        meta: `${item.profile.city} • ${item.profile.age}`,
        reason: item.reason,
        href: `/models/${profileSlug(item.profile.name)}`,
      }));
  }, [searchQuery, state.profiles]);

  function onGlobalSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    const firstResult = quickResults[0];
    if (firstResult) {
      router.push(firstResult.href);
    } else {
      router.push(`/discover?q=${encodeURIComponent(query)}`);
    }
    setSearchOpen(false);
  }

  function onGuestTopTabClick(href: string) {
    router.push(`/auth/sign-in?next=${encodeURIComponent(href)}`);
  }

  function topTabCount(href: string) {
    if (href === "/chat") {
      return unreadChatCount > 0 ? `${unreadChatCount} unread` : "inbox";
    }
    if (href === "/discover") {
      return `${discoverFeed.length} new`;
    }
    if (href === "/hookup") {
      return `${Math.min(discoverFeed.length, 12)} near`;
    }
    if (href === "/models") {
      return `${modelProfileCount} live`;
    }
    if (href === "/matches") {
      return `${currentUserMatches.length} matches`;
    }
    if (href === "/dashboard" || href === "/profile") {
      return accountStatus ? accountStatus.replace("_", " ") : "overview";
    }
    if (href === "/calls") {
      return "rooms";
    }
    return "open";
  }

  function topTabChipClass(href: string) {
    if (href === "/chat") {
      return unreadChatCount > 0
        ? "border-accent/55 bg-accent/16 text-accent-strong"
        : "border-white/20 bg-white/5 text-white/75";
    }

    if (href === "/dashboard" || href === "/profile") {
      if (!accountStatus) {
        return "border-white/20 bg-white/5 text-white/75";
      }
      if (accountStatus === "active") {
        return "border-emerald-400/45 bg-emerald-400/10 text-emerald-300";
      }
      if (accountStatus === "pending_verification" || accountStatus === "limited") {
        return "border-amber-400/45 bg-amber-400/10 text-amber-300";
      }
      if (accountStatus === "under_review") {
        return "border-orange-400/45 bg-orange-400/10 text-orange-300";
      }
      return "border-rose-400/45 bg-rose-400/10 text-rose-300";
    }

    if (href === "/matches") {
      return currentUserMatches.length > 0
        ? "border-sky-400/45 bg-sky-400/10 text-sky-300"
        : "border-white/20 bg-white/5 text-white/75";
    }

    if (href === "/discover" || href === "/hookup") {
      return discoverFeed.length > 0
        ? "border-accent/50 bg-accent/12 text-accent-strong"
        : "border-white/20 bg-white/5 text-white/75";
    }

    return "border-white/20 bg-white/5 text-white/75";
  }

  useEffect(() => {
    if (!accountForRender) {
      return;
    }

    let active = true;
    fetch("/api/account/status")
      .then((response) => response.json())
      .then(
        (payload: {
          ok: boolean;
          status?: "pending_verification" | "active" | "limited" | "under_review" | "banned" | "suspended";
          limits?: { wallet: boolean; calls: boolean; monetization: boolean };
        }) => {
          if (!active || !payload.ok || !payload.status) {
            return;
          }
          setAccountStatus(payload.status);
          setLimits(payload.limits ?? null);
        },
      )
      .catch(() => {
        // silent
      });

    return () => {
      active = false;
    };
  }, [accountForRender]);

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <header className="sticky top-0 z-30 border-b border-black/40">
        <div className="flex items-center gap-3 bg-[#151a21] px-3 py-2.5 sm:px-4">
          <span className="text-xl font-black tracking-tight sm:text-3xl">HOOKCHAT</span>
          <span className="hidden rounded-full border border-[#ef4f5d]/40 bg-[#ef4f5d]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#ffb7be] md:inline-flex">
            live
          </span>
          <div className="ml-auto hidden w-full max-w-xl lg:block">
            <form onSubmit={onGlobalSearchSubmit} className="relative">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setSearchOpen(false), 120);
                }}
                placeholder="Search people, tags, and cities"
                className="w-full rounded-full border border-white/14 bg-[#0d1118] px-4 py-2 pr-16 text-sm text-white/85"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchOpen(false);
                  }}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full border border-white/20 px-2 py-0.5 text-[11px] font-semibold text-white/70 hover:text-white"
                >
                  Clear
                </button>
              ) : null}
              {searchOpen && searchQuery.trim() ? (
                <div className="absolute top-[calc(100%+8px)] z-40 w-full rounded-xl border border-white/10 bg-[#0d1118] p-2 shadow-2xl">
                  {quickResults.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-white/65">No direct matches. Press Enter to search discover.</p>
                  ) : (
                    <div>
                      <div className="mb-1 flex items-center justify-between px-1 text-[11px] text-white/55">
                        <span>Top matches</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSearchOpen(false);
                          }}
                          className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white/70 hover:text-white"
                        >
                          reset
                        </button>
                      </div>
                      <div className="space-y-1">
                      {quickResults.map((result) => (
                        <Link
                          key={result.id}
                          href={result.href}
                          className="block rounded-lg border border-transparent px-2 py-1.5 text-sm text-white/85 hover:border-white/10 hover:bg-white/5"
                        >
                          <p className="font-semibold">{highlightQuery(result.label, searchQuery)}</p>
                          <p className="text-[11px] text-white/60">{highlightQuery(result.meta, searchQuery)}</p>
                          <p className="text-[10px] text-accent-strong">{result.reason}</p>
                        </Link>
                      ))}
                    </div>
                    </div>
                  )}
                </div>
              ) : null}
            </form>
          </div>
          {accountForRender ? (
            <>
              <Link
                href="/wallet"
                className="hidden rounded-full bg-[#d0e63e] px-4 py-2 text-xs font-bold text-[#141a00] transition hover:brightness-105 lg:inline-flex"
              >
                Wallet
              </Link>
              <Link
                href="/likes"
                className="hidden rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white md:inline-flex"
              >
                Alerts {unreadChatCount > 0 ? `(${unreadChatCount})` : ""}
              </Link>
            </>
          ) : null}
          {accountForRender ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/profile"
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {accountForRender.displayName}
              </Link>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/auth/sign-in"
                className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Login
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-[#141a00]"
              >
                Join
              </Link>
            </div>
          )}
        </div>
        <nav className="flex gap-6 overflow-x-auto border-t border-white/6 bg-[#222730] px-4 py-2 text-sm text-white/85 sm:px-5">
          {topTabs.map((tab) => (
            accountForRender ? (
            <Link
              key={tab.label}
              href={tab.href}
              className={`app-nav-link ${isActive(tab.href) ? "app-nav-link-active" : ""}`}
            >
                <span className="inline-flex items-center gap-2">
                  {tab.label}
                  {tab.href === "/chat" && unreadChatCount > 0 ? (
                    <span className="rounded-full border border-accent/55 bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent-strong">
                      {unreadChatCount}
                    </span>
                  ) : null}
                  <span className={`hidden rounded-full px-1.5 py-0.5 text-[10px] sm:inline-flex ${topTabChipClass(tab.href)}`}>
                    {topTabCount(tab.href)}
                  </span>
              </span>
            </Link>
            ) : (
              <button
                key={tab.label}
                type="button"
                onClick={() => onGuestTopTabClick(tab.href)}
                className="app-nav-link inline-flex items-center gap-2 opacity-85 transition hover:opacity-100"
                title="Preview only - sign in to unlock"
                aria-label={`${tab.label} preview. Sign in required.`}
              >
                <span>{tab.label}</span>
                <span className="rounded-full border border-white/25 bg-white/10 px-1.5 py-0.5 text-[10px] text-white/85">
                  Preview
                </span>
                <span className="rounded-full border border-white/20 bg-black/30 px-1.5 py-0.5 text-[10px] text-white/75">
                  Lock
                </span>
              </button>
            )
          ))}
        </nav>
      </header>

      <main className="grid min-h-[calc(100vh-92px)] lg:grid-cols-[255px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#101318] px-3 py-4 lg:block">
          <div className="space-y-4">
            {sidebarSections.map((section) => (
              <div key={section.title}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{section.title}</p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`app-side-link ${isActive(item.href) ? "app-side-link-active" : ""}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {item.label}
                        {item.href === "/chat" && unreadChatCount > 0 ? (
                          <span className="rounded-full border border-accent/55 bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent-strong">
                            {unreadChatCount}
                          </span>
                        ) : null}
                        {item.href === "/favorites" && favoriteCount > 0 ? (
                          <span className="rounded-full border border-white/25 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
                            {favoriteCount}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
            Session Safety: encrypted auth, audit logs, and moderation checks enabled.
          </div>
        </aside>

        <section className="px-4 py-4 pb-24 sm:px-6 sm:py-5 sm:pb-6">
          {accountForRender && accountStatus && accountStatus !== "active" ? (
            <div className="app-surface mb-4 rounded-xl px-3 py-2 text-xs text-amber-100">
              Account status: {accountStatus.replace("_", " ")}.
              {limits ? ` Wallet: ${limits.wallet ? "on" : "limited"}, Calls: ${limits.calls ? "on" : "limited"}, Monetization: ${limits.monetization ? "on" : "limited"}.` : ""}
              {" "}
              <Link href="/safety" className="underline">Complete verification</Link>
            </div>
          ) : null}
          <header className="app-surface app-section app-panel-pad mb-5">
            <h1 className="app-title text-2xl font-bold sm:text-3xl">{title}</h1>
            <p className="app-subtitle mt-1 text-sm">{description}</p>
          </header>
          <div>{children}</div>
        </section>
      </main>

      {accountForRender ? (
        <button
          type="button"
          onClick={onSignOut}
          className="fixed right-3 bottom-16 z-30 rounded-full border border-white/30 bg-[#121822]/95 px-3 py-1.5 text-xs font-semibold text-white lg:hidden"
        >
          Logout
        </button>
      ) : null}

      <footer className="border-t border-white/10 bg-[#0b1017] px-4 py-5 text-xs text-text-muted">
        <div className="mx-auto grid w-full max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-semibold text-white">Hookchat</p>
            <p className="mt-2 leading-5">Private connections with verification-first trust, encrypted sessions, and moderated interactions.</p>
            <p className="mt-2 text-[11px] text-white/60">© {new Date().getFullYear()} Hookchat.</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">Product</p>
            <div className="mt-2 flex flex-col gap-1.5">
              <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
              <Link href="/discover" className="hover:text-white">Discover</Link>
              <Link href="/hookup" className="hover:text-white">Hookup Radar</Link>
              <Link href="/matches" className="hover:text-white">Matches</Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">Account</p>
            <div className="mt-2 flex flex-col gap-1.5">
              <Link href="/profile" className="hover:text-white">Profile & Security</Link>
              <Link href="/wallet" className="hover:text-white">Wallet</Link>
              <Link href="/safety" className="hover:text-white">Safety Center</Link>
              <Link href="/verify-age" className="hover:text-white">Verification</Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">Trust</p>
            <div className="mt-2 space-y-1.5 text-[11px]">
              <p>Encrypted auth sessions</p>
              <p>Photo and account moderation</p>
              <p>Rate limits and audit logs</p>
            </div>
            <a href="mailto:support@hookchat.app" className="mt-3 inline-flex hover:text-white">support@hookchat.app</a>
          </div>
        </div>
      </footer>

      <nav className="app-mobile-dock fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-2 px-2 py-2 lg:hidden">
        {mobileItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`app-mobile-dock-link ${isActive(item.href) ? "app-mobile-dock-link-active" : ""}`}
          >
            <span className="inline-flex items-center gap-1">
              {item.label}
              {item.href === "/chat" && unreadChatCount > 0 ? (
                <>
                  <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
                  <span className="rounded-full border border-accent/55 bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent-strong">
                    {unreadChatCount}
                  </span>
                </>
              ) : null}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
