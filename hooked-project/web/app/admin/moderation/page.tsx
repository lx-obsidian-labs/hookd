"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { useState } from "react";

type ModerationUser = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  role: "user" | "model";
  gender: string;
  age: number;
  city: string;
  description: string;
  nicheTags: string[];
  lookingFor: string[];
  interestedInHookups: boolean;
  ageVerified: boolean;
  accountStatus?: "pending_verification" | "active" | "limited" | "under_review" | "banned" | "suspended";
  onboardingStep?: "account_created" | "age_confirmed" | "profile_basic" | "photo_added" | "ready";
  photoModerationStatus?: "none" | "pending" | "approved" | "rejected";
  failedLoginCount: number;
  lockedUntil: string | null;
  createdAt: string;
  fica: {
    status: "pending" | "submitted" | "verified" | "rejected";
    legalName: string;
    idNumber: string;
    documentUrl: string;
    submittedAt: string | null;
  };
};

export default function AdminModerationPage() {
  const [adminKey, setAdminKey] = useState(process.env.NODE_ENV !== "production" ? "dev-admin-key" : "");
  const [users, setUsers] = useState<ModerationUser[]>([]);
  const [message, setMessage] = useState("Enter admin key and load moderation queue.");
  const [loading, setLoading] = useState(false);

  async function loadQueue() {
    setLoading(true);
    setMessage("Loading moderation queue...");

    const response = await fetch("/api/admin/moderation/users", {
      headers: { "x-admin-key": adminKey },
    });
    const payload = (await response.json()) as {
      ok: boolean;
      message?: string;
      items?: ModerationUser[];
    };

    setLoading(false);
    if (!payload.ok || !payload.items) {
      setMessage(payload.message ?? "Could not load moderation queue.");
      return;
    }

    setUsers(payload.items);
    setMessage(`Loaded ${payload.items.length} accounts.`);
  }

  async function updateFicaStatus(
    accountId: string,
    status: "pending" | "submitted" | "verified" | "rejected",
  ) {
    const response = await fetch("/api/admin/moderation/fica", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ accountId, status }),
    });

    const payload = (await response.json()) as { ok: boolean; message?: string };
    if (!payload.ok) {
      setMessage(payload.message ?? "Could not update FICA status.");
      return;
    }
    setUsers((prev) =>
      prev.map((user) => (user.id === accountId ? { ...user, fica: { ...user.fica, status } } : user)),
    );
    setMessage("FICA status updated.");
  }

  async function unlockAccount(accountId: string) {
    const response = await fetch("/api/admin/moderation/unlock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ accountId }),
    });

    const payload = (await response.json()) as { ok: boolean; message?: string };
    if (!payload.ok) {
      setMessage(payload.message ?? "Could not unlock account.");
      return;
    }

    setUsers((prev) =>
      prev.map((user) =>
        user.id === accountId ? { ...user, failedLoginCount: 0, lockedUntil: null } : user,
      ),
    );
    setMessage("Account unlocked.");
  }

  async function saveClassification(accountId: string, nicheTags: string[], description: string) {
    const response = await fetch("/api/admin/moderation/classification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ accountId, nicheTags, description }),
    });

    const payload = (await response.json()) as { ok: boolean; message?: string };
    if (!payload.ok) {
      setMessage(payload.message ?? "Could not update classification.");
      return;
    }

    setMessage("Classification updated.");
    await loadQueue();
  }

  async function updatePhotoStatus(
    accountId: string,
    status: "none" | "pending" | "approved" | "rejected",
  ) {
    const response = await fetch("/api/admin/moderation/photo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ accountId, status }),
    });

    const payload = (await response.json()) as { ok: boolean; message?: string };
    if (!payload.ok) {
      setMessage(payload.message ?? "Could not update photo moderation status.");
      return;
    }

    setUsers((prev) =>
      prev.map((user) =>
        user.id === accountId ? { ...user, photoModerationStatus: status } : user,
      ),
    );
    setMessage("Photo moderation updated.");
  }

  return (
    <ProductShell
      title="Admin Moderation"
      description="Review onboarding compliance, approve FICA status, and adjust classification metadata."
    >
      <section className="sexy-frame rounded-2xl p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="Admin dashboard key"
            className="rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-sm text-white outline-none ring-accent/40 focus:ring"
          />
          <button
            type="button"
            onClick={loadQueue}
            disabled={loading || !adminKey.trim()}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#1d1003] disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Queue"}
          </button>
        </div>
        <p className="mt-3 text-sm text-text-muted">{message}</p>
      </section>

      <section className="mt-4 space-y-3">
        {users.map((user) => (
          <article key={user.id} className="glass-panel rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {user.displayName} (@{user.username})
              </h2>
              <span className="text-xs text-text-muted">{user.email}</span>
            </div>

            <p className="mt-1 text-sm text-text-muted">
              {user.role} | {user.gender} | {user.age} | {user.city}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Status: {user.accountStatus ?? "pending_verification"} | Onboarding: {user.onboardingStep ?? "account_created"}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Failed logins: {user.failedLoginCount} | Locked until: {user.lockedUntil ? new Date(user.lockedUntil).toLocaleString() : "Not locked"}
            </p>
            <p className="mt-2 text-sm text-text-muted">{user.description}</p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {user.nicheTags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/15 bg-white/5 px-2 py-1">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-text-muted">FICA</p>
                <p className="mt-1 text-sm">Status: {user.fica.status}</p>
                <p className="text-xs text-text-muted">Legal name: {user.fica.legalName}</p>
                <p className="text-xs text-text-muted">ID number: {user.fica.idNumber}</p>
                <a href={user.fica.documentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline">
                  Open document
                </a>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["pending", "submitted", "verified", "rejected"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateFicaStatus(user.id, status)}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs"
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => unlockAccount(user.id)}
                  className="mt-2 rounded-full border border-amber-300/45 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100"
                >
                  Unlock account
                </button>

                <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2">
                  <p className="text-xs text-text-muted">Photo moderation: {user.photoModerationStatus ?? "none"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["none", "pending", "approved", "rejected"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updatePhotoStatus(user.id, status)}
                        className="rounded-full border border-white/20 px-3 py-1 text-xs"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <ClassificationEditor user={user} onSave={saveClassification} />
            </div>
          </article>
        ))}
      </section>
    </ProductShell>
  );
}

function ClassificationEditor({
  user,
  onSave,
}: {
  user: ModerationUser;
  onSave: (accountId: string, nicheTags: string[], description: string) => Promise<void>;
}) {
  const [tagsInput, setTagsInput] = useState(user.nicheTags.join(", "));
  const [description, setDescription] = useState(user.description);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.08em] text-text-muted">Classification</p>
      <label className="mt-2 block text-xs text-text-muted">
        Niche tags
        <input
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-[#0d1b2c]/90 px-2 py-1.5 text-sm text-white outline-none ring-accent/40 focus:ring"
        />
      </label>
      <label className="mt-2 block text-xs text-text-muted">
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-white/15 bg-[#0d1b2c]/90 px-2 py-1.5 text-sm text-white outline-none ring-accent/40 focus:ring"
        />
      </label>
      <button
        type="button"
        onClick={() =>
          onSave(
            user.id,
            tagsInput
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            description,
          )
        }
        className="mt-2 rounded-full border border-accent/45 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-strong"
      >
        Save classification
      </button>
      <p className="mt-2 text-[11px] text-text-muted">
        Looking for: {user.lookingFor.join(", ")} | Hookups: {user.interestedInHookups ? "Yes" : "No"}
      </p>
    </div>
  );
}
