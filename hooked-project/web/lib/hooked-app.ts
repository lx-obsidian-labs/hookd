"use client";

import { useEffect, useMemo, useState } from "react";

type AccountStatus = "active" | "locked";
export type AccountRole = "user" | "model";
type SwipeDecision = "like" | "pass";
type LedgerSide = "debit" | "credit";
type LedgerType = "seed" | "purchase" | "hold" | "consume" | "release" | "refund";
type MessageType = "text" | "image" | "video";

const PLATFORM_TREASURY = "platform:treasury";
const PLATFORM_MINT = "platform:mint";
const STORAGE_KEY = "hooked.web.state.v1";

export type Account = {
  id: string;
  email: string;
  passwordDigest?: string;
  displayName: string;
  role: AccountRole;
  status: AccountStatus;
  ageVerified: boolean;
  ageVerifiedAt: string | null;
  createdAt: string;
};

export type Profile = {
  id: string;
  ownerId: string;
  name: string;
  age: number;
  city: string;
  bio: string;
  interests: string[];
  likesYouByDefault: boolean;
};

export type Match = {
  id: string;
  userA: string;
  userB: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  type: MessageType;
  tokenCost: number;
  createdAt: string;
};

export type HookRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "accepted" | "rejected";
  createdAt: string;
  respondedAt: string;
};

type Swipe = {
  fromUserId: string;
  toUserId: string;
  decision: SwipeDecision;
};

export type LedgerEntry = {
  id: string;
  journalId: string;
  type: LedgerType;
  side: LedgerSide;
  amount: number;
  accountId: string;
  reference: string;
  description: string;
  createdAt: string;
};

type HookedState = {
  accounts: Account[];
  profiles: Profile[];
  swipes: Swipe[];
  matches: Match[];
  messages: ChatMessage[];
  hookRequests: HookRequest[];
  readMarkers: Record<string, string>;
  ledgerEntries: LedgerEntry[];
  processedCheckoutRefs: string[];
  currentUserId: string | null;
};

const tokenBundles = [
  { id: "bundle-100", tokens: 100, priceUsd: 10 },
  { id: "bundle-250", tokens: 250, priceUsd: 24 },
  { id: "bundle-600", tokens: 600, priceUsd: 55 },
];

export const mediaTokenCosts = {
  image: 15,
  video: 40,
} as const;

const seedProfiles: Profile[] = [];

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function resolveMatchId(userA: string, userB: string) {
  return [userA, userB].sort().join("::");
}

function heldAccountId(accountId: string) {
  return `${accountId}:held`;
}

function newSeedEntry(side: LedgerSide, accountId: string, amount: number): LedgerEntry {
  return {
    id: makeId("entry"),
    journalId: "seed-journal",
    type: "seed",
    side,
    amount,
    accountId,
    reference: "platform-seed",
    description: "Platform treasury seed",
    createdAt: new Date().toISOString(),
  };
}

function getInitialState(): HookedState {
  return {
    accounts: [],
    profiles: seedProfiles,
    swipes: [],
    matches: [],
    messages: [],
    hookRequests: [],
    readMarkers: {},
    ledgerEntries: [newSeedEntry("debit", PLATFORM_MINT, 1_000_000), newSeedEntry("credit", PLATFORM_TREASURY, 1_000_000)],
    processedCheckoutRefs: [],
    currentUserId: null,
  };
}

let memoryState: HookedState = getInitialState();

function loadStateFromStorage() {
  if (typeof window === "undefined") {
    return memoryState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return memoryState;
  }

  try {
    const parsed = JSON.parse(raw) as HookedState;
    const merged: HookedState = {
      ...getInitialState(),
      ...parsed,
      accounts: (parsed.accounts ?? []).map((account) => ({
        ...account,
        passwordDigest: account.passwordDigest ?? "",
        role: account.role ?? "user",
        ageVerified: account.ageVerified ?? false,
        ageVerifiedAt: account.ageVerifiedAt ?? null,
      })),
      profiles: parsed.profiles?.length ? parsed.profiles : seedProfiles,
      hookRequests: parsed.hookRequests ?? [],
      readMarkers: parsed.readMarkers ?? {},
      ledgerEntries: parsed.ledgerEntries?.length
        ? parsed.ledgerEntries
        : getInitialState().ledgerEntries,
      processedCheckoutRefs: parsed.processedCheckoutRefs ?? [],
    };
    memoryState = merged;
    return merged;
  } catch {
    return memoryState;
  }
}

function persistState(next: HookedState) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function postBalancedJournal(params: {
  state: HookedState;
  type: LedgerType;
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  reference: string;
  description: string;
}) {
  const now = new Date().toISOString();
  const journalId = makeId("journal");

  const debit: LedgerEntry = {
    id: makeId("entry"),
    journalId,
    type: params.type,
    side: "debit",
    amount: params.amount,
    accountId: params.debitAccountId,
    reference: params.reference,
    description: params.description,
    createdAt: now,
  };

  const credit: LedgerEntry = {
    id: makeId("entry"),
    journalId,
    type: params.type,
    side: "credit",
    amount: params.amount,
    accountId: params.creditAccountId,
    reference: params.reference,
    description: params.description,
    createdAt: now,
  };

  return {
    ...params.state,
    ledgerEntries: [...params.state.ledgerEntries, debit, credit],
  };
}

function accountBalance(entries: LedgerEntry[], accountId: string) {
  return entries.reduce((sum, entry) => {
    if (entry.accountId !== accountId) {
      return sum;
    }
    return sum + (entry.side === "credit" ? entry.amount : -entry.amount);
  }, 0);
}

function readMarkerKey(userId: string, matchId: string) {
  return `${userId}::${matchId}`;
}

function isStrongPassword(value: string) {
  return (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^a-zA-Z0-9]/.test(value)
  );
}

async function digestCredential(value: string) {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return value;
  }

  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((item) => item.toString(16).padStart(2, "0")).join("");
}

export function useHookedApp() {
  const [state, setState] = useState<HookedState>(() => getInitialState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadStateFromStorage();
    const timer = window.setTimeout(() => {
      setState(loaded);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateState(mutator: (draft: HookedState) => HookedState) {
    setState((prev) => {
      const next = mutator(prev);
      memoryState = next;
      persistState(next);
      return next;
    });
  }

  const currentAccount = useMemo(() => {
    if (!state.currentUserId) {
      return null;
    }
    return state.accounts.find((account) => account.id === state.currentUserId) ?? null;
  }, [state.accounts, state.currentUserId]);

  const currentProfile = useMemo(() => {
    if (!state.currentUserId) {
      return null;
    }
    return state.profiles.find((profile) => profile.ownerId === state.currentUserId) ?? null;
  }, [state.currentUserId, state.profiles]);

  const discoverFeed = useMemo(() => {
    if (!state.currentUserId) {
      return [] as Profile[];
    }

    const swipedIds = new Set(
      state.swipes
        .filter((swipe) => swipe.fromUserId === state.currentUserId)
        .map((swipe) => swipe.toUserId),
    );

    return state.profiles.filter(
      (profile) => profile.ownerId !== state.currentUserId && !swipedIds.has(profile.ownerId),
    );
  }, [state.currentUserId, state.profiles, state.swipes]);

  const currentUserMatches = useMemo(() => {
    if (!state.currentUserId) {
      return [] as Array<Match & { peerProfile: Profile | null }>;
    }

    return state.matches
      .filter(
        (match) => match.userA === state.currentUserId || match.userB === state.currentUserId,
      )
      .map((match) => {
        const peerId = match.userA === state.currentUserId ? match.userB : match.userA;
        const peerProfile = state.profiles.find((profile) => profile.ownerId === peerId) ?? null;
        return { ...match, peerProfile };
      });
  }, [state.currentUserId, state.matches, state.profiles]);

  useEffect(() => {
    if (!hydrated || !state.currentUserId) {
      return;
    }

    let active = true;
    fetch("/api/chat/read")
      .then((response) => response.json())
      .then((payload: { ok: boolean; readMarkers?: Record<string, string> }) => {
        if (!active || !payload.ok || !payload.readMarkers) {
          return;
        }

        updateState((prev) => {
          const accountId = prev.currentUserId;
          if (!accountId) {
            return prev;
          }

          const nextReadMarkers = { ...prev.readMarkers };
          for (const [matchId, marker] of Object.entries(payload.readMarkers ?? {})) {
            const key = readMarkerKey(accountId, matchId);
            const existing = nextReadMarkers[key] ?? "";
            if (marker > existing) {
              nextReadMarkers[key] = marker;
            }
          }

          return { ...prev, readMarkers: nextReadMarkers };
        });
      })
      .catch(() => {
        // silent
      });

    return () => {
      active = false;
    };
  }, [hydrated, state.currentUserId]);

  const wallet = useMemo(() => {
    if (!state.currentUserId) {
      return { available: 0, held: 0, total: 0 };
    }
    const available = accountBalance(state.ledgerEntries, state.currentUserId);
    const held = accountBalance(state.ledgerEntries, heldAccountId(state.currentUserId));
    return { available, held, total: available + held };
  }, [state.currentUserId, state.ledgerEntries]);

  const currentUserHookRequests = useMemo(() => {
    if (!state.currentUserId) {
      return [] as HookRequest[];
    }

    return state.hookRequests
      .filter((item) => item.fromUserId === state.currentUserId || item.toUserId === state.currentUserId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.currentUserId, state.hookRequests]);

  const purchaseReceipts = useMemo(() => {
    if (!state.currentUserId) {
      return [] as LedgerEntry[];
    }

    return state.ledgerEntries
      .filter(
        (entry) =>
          entry.type === "purchase" &&
          entry.side === "credit" &&
          entry.accountId === state.currentUserId,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.currentUserId, state.ledgerEntries]);

  async function createAccount(params: {
    email: string;
    displayName: string;
    age: number;
    city: string;
    role: AccountRole;
    password: string;
  }) {
    const normalizedEmail = params.email.trim().toLowerCase();
    const normalizedName = params.displayName.trim();
    const normalizedCity = params.city.trim();
    const normalizedPassword = params.password.trim();

    if (!normalizedEmail || !normalizedName) {
      return { ok: false as const, message: "Display name and email are required." };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { ok: false as const, message: "Enter a valid email address." };
    }

    if (normalizedName.length < 2 || normalizedName.length > 40) {
      return { ok: false as const, message: "Display name must be between 2 and 40 characters." };
    }

    if (params.age < 18 || params.age > 99) {
      return { ok: false as const, message: "You must provide a valid age between 18 and 99." };
    }

    if (normalizedCity.length < 2 || normalizedCity.length > 64) {
      return { ok: false as const, message: "City must be between 2 and 64 characters." };
    }

    if (!isStrongPassword(normalizedPassword)) {
      return {
        ok: false as const,
        message: "Password must include uppercase, lowercase, number, and symbol (8+ chars).",
      };
    }

    if (state.accounts.some((account) => account.email === normalizedEmail)) {
      return { ok: false as const, message: "An account with this email already exists." };
    }

    const passwordDigest = await digestCredential(normalizedPassword);

    const accountId = makeId("acct");
    const now = new Date().toISOString();
    const account: Account = {
      id: accountId,
      email: normalizedEmail,
      passwordDigest,
      displayName: normalizedName,
      role: params.role,
      status: "active",
      ageVerified: false,
      ageVerifiedAt: null,
      createdAt: now,
    };

    const profile: Profile = {
      id: makeId("profile"),
      ownerId: accountId,
      name: normalizedName,
      age: params.age,
      city: normalizedCity,
      bio:
        params.role === "model"
          ? "Creator with premium content and live interaction sessions."
          : "Open to meaningful connections and authentic conversations.",
      interests:
        params.role === "model"
          ? ["Creator", "Live", "Lifestyle"]
          : ["Dating", "Lifestyle"],
      likesYouByDefault: false,
    };

    updateState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, account],
      profiles: [...prev.profiles, profile],
      currentUserId: accountId,
    }));
    return { ok: true as const, accountId, ageVerified: false as const };
  }

  async function signIn(email: string, role: AccountRole, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const account = state.accounts.find((item) => item.email === normalizedEmail);

    if (!account) {
      return { ok: false as const, message: "No account found for this email." };
    }
    if (account.status === "locked") {
      return { ok: false as const, message: "Account is locked. Contact support." };
    }
    if (account.role !== role) {
      return {
        ok: false as const,
        message:
          account.role === "model"
            ? "This email is a model account. Switch to model login."
            : "This email is a user account. Switch to user login.",
      };
    }

    if (account.passwordDigest) {
      const attemptedDigest = await digestCredential(normalizedPassword);
      if (attemptedDigest !== account.passwordDigest) {
        return { ok: false as const, message: "Incorrect password." };
      }
    }

    updateState((prev) => ({ ...prev, currentUserId: account.id }));
    return { ok: true as const, accountId: account.id, ageVerified: account.ageVerified };
  }

  function signOut() {
    updateState((prev) => ({ ...prev, currentUserId: null }));
  }

  function verifyCurrentUserAge() {
    if (!state.currentUserId) {
      return { ok: false as const, message: "Sign in required." };
    }

    const now = new Date().toISOString();
    updateState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((account) =>
        account.id === prev.currentUserId
          ? { ...account, ageVerified: true, ageVerifiedAt: now }
          : account,
      ),
    }));
    return { ok: true as const, message: "Age verification completed." };
  }

  function addSwipe(toUserId: string, decision: SwipeDecision) {
    if (!state.currentUserId) {
      return { ok: false as const, message: "Sign in required." };
    }

    const alreadySwiped = state.swipes.some(
      (swipe) => swipe.fromUserId === state.currentUserId && swipe.toUserId === toUserId,
    );
    if (alreadySwiped) {
      return { ok: false as const, message: "You already swiped on this profile." };
    }

    const targetProfile = state.profiles.find((profile) => profile.ownerId === toUserId);
    const shouldMatch = decision === "like" && targetProfile?.likesYouByDefault;

    updateState((prev) => {
      const nextSwipes = [...prev.swipes, { fromUserId: prev.currentUserId!, toUserId, decision }];
      if (!shouldMatch) {
        return { ...prev, swipes: nextSwipes };
      }

      const matchId = resolveMatchId(prev.currentUserId!, toUserId);
      if (prev.matches.some((match) => match.id === matchId)) {
        return { ...prev, swipes: nextSwipes };
      }

      const match: Match = {
        id: matchId,
        userA: prev.currentUserId!,
        userB: toUserId,
        createdAt: new Date().toISOString(),
      };

      return { ...prev, swipes: nextSwipes, matches: [...prev.matches, match] };
    });

    return { ok: true as const, matched: Boolean(shouldMatch) };
  }

  function sendHookRequest(toUserId: string) {
    if (!state.currentUserId) {
      return { ok: false as const, message: "Sign in required." };
    }

    if (toUserId === state.currentUserId) {
      return { ok: false as const, message: "You cannot hook with your own profile." };
    }

    const targetProfile = state.profiles.find((profile) => profile.ownerId === toUserId);
    if (!targetProfile) {
      return { ok: false as const, message: "Profile not found." };
    }

    const alreadyAccepted = state.hookRequests.some(
      (item) => item.fromUserId === state.currentUserId && item.toUserId === toUserId && item.status === "accepted",
    );
    if (alreadyAccepted) {
      return { ok: true as const, status: "accepted" as const, message: "Already accepted. Open chat from matches." };
    }

    const now = new Date().toISOString();
    const accepted = targetProfile.likesYouByDefault || Math.random() < 0.42;
    const status = accepted ? "accepted" : "rejected";

    updateState((prev) => {
      const nextRequest: HookRequest = {
        id: makeId("hook"),
        fromUserId: prev.currentUserId!,
        toUserId,
        status,
        createdAt: now,
        respondedAt: now,
      };

      let nextMatches = prev.matches;
      if (accepted) {
        const matchId = resolveMatchId(prev.currentUserId!, toUserId);
        if (!prev.matches.some((match) => match.id === matchId)) {
          nextMatches = [
            ...prev.matches,
            {
              id: matchId,
              userA: prev.currentUserId!,
              userB: toUserId,
              createdAt: now,
            },
          ];
        }
      }

      return {
        ...prev,
        hookRequests: [nextRequest, ...prev.hookRequests].slice(0, 500),
        matches: nextMatches,
      };
    });

    return {
      ok: true as const,
      status,
      message: accepted ? "Hook request accepted. You can chat now." : "Hook request rejected. Try another nearby profile.",
    };
  }

  function getMessages(matchId: string) {
    return state.messages
      .filter((message) => message.matchId === matchId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function getUnreadMessageCount(matchId?: string) {
    if (!state.currentUserId) {
      return 0;
    }

    const relevantMessages = state.messages.filter((message) => {
      if (message.senderId === state.currentUserId) {
        return false;
      }
      if (!matchId) {
        return true;
      }
      return message.matchId === matchId;
    });

    return relevantMessages.filter((message) => {
      const key = readMarkerKey(state.currentUserId!, message.matchId);
      const marker = state.readMarkers[key] ?? "";
      return message.createdAt > marker;
    }).length;
  }

  function markMatchAsRead(matchId: string) {
    if (!state.currentUserId) {
      return;
    }

    const key = readMarkerKey(state.currentUserId, matchId);
    const latestMessage = state.messages
      .filter((message) => message.matchId === matchId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .at(-1);
    const nextMarker = latestMessage?.createdAt ?? new Date().toISOString();

    updateState((prev) => {
      const existingMarker = prev.readMarkers[key] ?? "";
      if (existingMarker >= nextMarker) {
        return prev;
      }

      return {
        ...prev,
        readMarkers: {
          ...prev.readMarkers,
          [key]: nextMarker,
        },
      };
    });

    fetch("/api/chat/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, readAt: nextMarker }),
    }).catch(() => {
      // silent
    });
  }

  function sendTextMessage(matchId: string, body: string) {
    if (!state.currentUserId) {
      return { ok: false as const, message: "Sign in required." };
    }

    const hasMatch = state.matches.some(
      (match) =>
        match.id === matchId &&
        (match.userA === state.currentUserId || match.userB === state.currentUserId),
    );

    if (!hasMatch) {
      return { ok: false as const, message: "Standard chat requires a mutual match." };
    }

    const trimmed = body.trim();
    if (!trimmed) {
      return { ok: false as const, message: "Message cannot be empty." };
    }

    const nextMessage: ChatMessage = {
      id: makeId("msg"),
      matchId,
      senderId: state.currentUserId,
      body: trimmed,
      type: "text",
      tokenCost: 0,
      createdAt: new Date().toISOString(),
    };

    updateState((prev) => ({ ...prev, messages: [...prev.messages, nextMessage] }));
    return { ok: true as const };
  }

  function sendPaidMediaMessage(matchId: string, type: "image" | "video", body: string) {
    if (!state.currentUserId) {
      return { ok: false as const, message: "Sign in required." };
    }

    const hasMatch = state.matches.some(
      (match) =>
        match.id === matchId &&
        (match.userA === state.currentUserId || match.userB === state.currentUserId),
    );

    if (!hasMatch) {
      return { ok: false as const, message: "Media send requires a mutual match." };
    }

    if (!currentAccount?.ageVerified) {
      return {
        ok: false as const,
        message: "Age verification is required before sending paid media.",
      };
    }

    const trimmed = body.trim();
    if (!trimmed) {
      return { ok: false as const, message: "Add a caption or media context before sending." };
    }

    const tokenCost = mediaTokenCosts[type];
    const available = accountBalance(state.ledgerEntries, state.currentUserId);
    if (available < tokenCost) {
      return {
        ok: false as const,
        message: `Insufficient balance. ${type} messages require ${tokenCost} tokens.`,
      };
    }

    const reference = `media-${type}-${matchId}-${Date.now()}`;

    updateState((prev) => {
      const withJournal = postBalancedJournal({
        state: prev,
        type: "consume",
        amount: tokenCost,
        debitAccountId: prev.currentUserId!,
        creditAccountId: PLATFORM_TREASURY,
        reference,
        description: `${type} message send in matched chat`,
      });

      const nextMessage: ChatMessage = {
        id: makeId("msg"),
        matchId,
        senderId: prev.currentUserId!,
        body: trimmed,
        type,
        tokenCost,
        createdAt: new Date().toISOString(),
      };

      return { ...withJournal, messages: [...withJournal.messages, nextMessage] };
    });

    return { ok: true as const, message: `${type} sent for ${tokenCost} tokens.` };
  }

  function purchaseTokens(bundleId: string) {
    if (!state.currentUserId) {
      return { ok: false as const, message: "Sign in required." };
    }

    const bundle = tokenBundles.find((item) => item.id === bundleId);
    if (!bundle) {
      return { ok: false as const, message: "Unknown bundle." };
    }

    const reference = `checkout-${bundle.id}-${state.currentUserId}`;
    if (state.processedCheckoutRefs.includes(reference)) {
      return { ok: true as const, message: "Checkout already processed.", idempotent: true };
    }

    updateState((prev) => {
      const withJournal = postBalancedJournal({
        state: prev,
        type: "purchase",
        amount: bundle.tokens,
        debitAccountId: PLATFORM_TREASURY,
        creditAccountId: prev.currentUserId!,
        reference,
        description: `Token bundle purchase ${bundle.tokens} for $${bundle.priceUsd}`,
      });

      return {
        ...withJournal,
        processedCheckoutRefs: [...withJournal.processedCheckoutRefs, reference],
      };
    });

    return {
      ok: true as const,
      message: `Purchased ${bundle.tokens} tokens for $${bundle.priceUsd}.`,
      idempotent: false,
    };
  }

  function updateCurrentProfile(params: {
    displayName: string;
    city: string;
    bio: string;
    interests: string[];
  }) {
    if (!state.currentUserId) {
      return { ok: false as const, message: "Sign in required." };
    }

    const displayName = params.displayName.trim();
    if (!displayName) {
      return { ok: false as const, message: "Display name is required." };
    }

    const city = params.city.trim() || "Not set";
    const bio = params.bio.trim() || "Open to meaningful connections and authentic conversations.";
    const interests = params.interests.filter((item) => item.trim()).slice(0, 8);

    updateState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((account) =>
        account.id === prev.currentUserId ? { ...account, displayName } : account,
      ),
      profiles: prev.profiles.map((profile) =>
        profile.ownerId === prev.currentUserId
          ? {
              ...profile,
              name: displayName,
              city,
              bio,
              interests: interests.length ? interests : profile.interests,
            }
          : profile,
      ),
    }));

    return { ok: true as const, message: "Profile updated." };
  }

  function syncSessionAccount(account: {
    id: string;
    email: string;
    displayName: string;
    role: AccountRole;
    age: number;
    city: string;
    ageVerified: boolean;
    ageVerifiedAt: string | null;
    createdAt: string;
  }) {
    updateState((prev) => {
      const existingAccount = prev.accounts.find((item) => item.id === account.id);
      const existingProfile = prev.profiles.find((item) => item.ownerId === account.id);

      const nextAccount: Account = {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        role: account.role,
        status: "active",
        ageVerified: account.ageVerified,
        ageVerifiedAt: account.ageVerifiedAt,
        createdAt: account.createdAt,
      };

      const nextProfile: Profile = {
        id: existingProfile?.id ?? makeId("profile"),
        ownerId: account.id,
        name: account.displayName,
        age: account.age,
        city: account.city,
        bio:
          existingProfile?.bio ??
          (account.role === "model"
            ? "Creator with premium content and live interaction sessions."
            : "Open to meaningful connections and authentic conversations."),
        interests:
          existingProfile?.interests ??
          (account.role === "model" ? ["Creator", "Live", "Lifestyle"] : ["Dating", "Lifestyle"]),
        likesYouByDefault: existingProfile?.likesYouByDefault ?? false,
      };

      return {
        ...prev,
        accounts: existingAccount
          ? prev.accounts.map((item) => (item.id === account.id ? { ...item, ...nextAccount } : item))
          : [...prev.accounts, nextAccount],
        profiles: existingProfile
          ? prev.profiles.map((item) => (item.ownerId === account.id ? { ...item, ...nextProfile } : item))
          : [...prev.profiles, nextProfile],
        currentUserId: account.id,
      };
    });
  }

  return {
    hydrated,
    state,
    tokenBundles,
    currentAccount,
    currentProfile,
    discoverFeed,
    currentUserMatches,
    wallet,
    purchaseReceipts,
    currentUserHookRequests,
    createAccount,
    signIn,
    signOut,
    verifyCurrentUserAge,
    addSwipe,
    sendHookRequest,
    getMessages,
    getUnreadMessageCount,
    markMatchAsRead,
    sendTextMessage,
    sendPaidMediaMessage,
    purchaseTokens,
    updateCurrentProfile,
    syncSessionAccount,
  };
}
