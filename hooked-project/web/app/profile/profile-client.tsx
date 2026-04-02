"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { useHookedApp } from "@/lib/hooked-app";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type ActiveSession = {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

type SecuritySnapshot = {
  accountId: string;
  ageVerified: boolean;
  ficaStatus: "pending" | "submitted" | "verified" | "rejected";
  twoFactorEnabled: boolean;
  backupCodesRemaining: number;
  failedLoginCount: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  lastPasswordChangeAt: string | null;
};

export function ProfileClient() {
  const { currentAccount, currentProfile, updateCurrentProfile } = useHookedApp();
  const [displayName, setDisplayName] = useState(currentAccount?.displayName ?? "");
  const [city, setCity] = useState(currentProfile?.city ?? "");
  const [bio, setBio] = useState(currentProfile?.bio ?? "");
  const [interests, setInterests] = useState((currentProfile?.interests ?? []).join(", "));
  const [notice, setNotice] = useState("");
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionNotice, setSessionNotice] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [security, setSecurity] = useState<SecuritySnapshot | null>(null);
  const [securityNotice, setSecurityNotice] = useState("");
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorUri, setTwoFactorUri] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = updateCurrentProfile({
      displayName,
      city,
      bio,
      interests: interests
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    setNotice(result.message);
  }

  useEffect(() => {
    if (!currentAccount) {
      return;
    }

    let active = true;
    fetch("/api/auth/sessions")
      .then((response) => response.json())
      .then((payload: { ok: boolean; sessions?: ActiveSession[] }) => {
        if (!active || !payload.ok || !payload.sessions) {
          return;
        }
        setSessions(payload.sessions);
      })
      .catch(() => {
        if (active) {
          setSessionNotice("Could not load active sessions.");
        }
      });

    return () => {
      active = false;
    };
  }, [currentAccount]);

  useEffect(() => {
    if (!currentAccount) {
      return;
    }

    let active = true;
    fetch("/api/account/security")
      .then((response) => response.json())
      .then((payload: { ok: boolean; security?: SecuritySnapshot; message?: string }) => {
        if (!active) {
          return;
        }
        if (!payload.ok || !payload.security) {
          setSecurityNotice(payload.message ?? "Could not load security status.");
          return;
        }
        setSecurity(payload.security);
      })
      .catch(() => {
        if (active) {
          setSecurityNotice("Could not load security status.");
        }
      });

    return () => {
      active = false;
    };
  }, [currentAccount]);

  async function revokeSession(sessionId: string) {
    const response = await fetch("/api/auth/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    const payload = (await response.json()) as { ok: boolean; message?: string };
    if (!payload.ok) {
      setSessionNotice(payload.message ?? "Could not revoke session.");
      return;
    }

    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    setSessionNotice("Session revoked.");
  }

  async function revokeOtherSessions() {
    const response = await fetch("/api/auth/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revokeOthers: true }),
    });

    const payload = (await response.json()) as { ok: boolean; message?: string; revoked?: number };
    if (!payload.ok) {
      setSessionNotice(payload.message ?? "Could not revoke other sessions.");
      return;
    }

    setSessions((prev) => prev.filter((session) => session.current));
    setSessionNotice(`Revoked ${payload.revoked ?? 0} other session(s).`);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordNotice("");

    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, nextPassword }),
    });

    const payload = (await response.json()) as { ok: boolean; message?: string };
    if (!payload.ok) {
      setPasswordNotice(payload.message ?? "Could not change password.");
      return;
    }

    setCurrentPassword("");
    setNextPassword("");
    setPasswordNotice("Password updated successfully.");
    setSecurity((prev) =>
      prev ? { ...prev, lastPasswordChangeAt: new Date().toISOString(), failedLoginCount: 0, lockedUntil: null } : prev,
    );
  }

  async function beginTwoFactor() {
    const response = await fetch("/api/account/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "begin_2fa" }),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      secret?: string;
      otpauthUrl?: string;
      message?: string;
    };
    if (!payload.ok || !payload.secret || !payload.otpauthUrl) {
      setSecurityNotice(payload.message ?? "Could not begin 2FA setup.");
      return;
    }
    setTwoFactorSecret(payload.secret);
    setTwoFactorUri(payload.otpauthUrl);
    setSecurityNotice("2FA secret generated. Add it in your authenticator and verify below.");
  }

  async function verifyTwoFactor() {
    const response = await fetch("/api/account/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_2fa", code: twoFactorCode }),
    });
    const payload = (await response.json()) as { ok: boolean; message?: string };
    if (!payload.ok) {
      setSecurityNotice(payload.message ?? "Could not verify 2FA.");
      return;
    }
    setSecurity((prev) => (prev ? { ...prev, twoFactorEnabled: true } : prev));
    setTwoFactorCode("");
    setTwoFactorSecret("");
    setTwoFactorUri("");
    setSecurityNotice("Two-factor enabled.");
  }

  async function disableTwoFactorNow() {
    const response = await fetch("/api/account/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable_2fa" }),
    });
    const payload = (await response.json()) as { ok: boolean; message?: string };
    if (!payload.ok) {
      setSecurityNotice(payload.message ?? "Could not disable 2FA.");
      return;
    }
    setSecurity((prev) => (prev ? { ...prev, twoFactorEnabled: false } : prev));
    setSecurityNotice("Two-factor disabled.");
  }

  async function generateBackupCodesNow() {
    const response = await fetch("/api/account/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_backup_codes" }),
    });
    const payload = (await response.json()) as { ok: boolean; codes?: string[]; message?: string };
    if (!payload.ok || !payload.codes) {
      setSecurityNotice(payload.message ?? "Could not generate backup codes.");
      return;
    }
    setBackupCodes(payload.codes);
    setSecurity((prev) =>
      prev ? { ...prev, backupCodesRemaining: payload.codes ? payload.codes.length : prev.backupCodesRemaining } : prev,
    );
    setSecurityNotice("Backup codes generated. Save them now; they are shown once.");
  }

  if (!currentAccount || !currentProfile) {
    return (
      <ProductShell
        title="Profile"
        description="Sign in to edit your profile settings."
      >
        <div className="glass-panel rounded-2xl p-5 text-sm text-text-muted">
          Please <Link href="/auth/sign-in" className="underline">sign in</Link> to manage your profile.
        </div>
      </ProductShell>
    );
  }

  return (
    <ProductShell
      title="Profile Settings"
      description="Keep your profile fresh so you show up better in discover and convert more matches."
    >
      <section className="sexy-frame reveal-rise mb-4 rounded-2xl p-3 sm:p-5">
        <Image
          src="/asset-hero-orbit.svg"
          alt=""
          width={1280}
          height={820}
          className="h-28 w-full rounded-xl border border-white/10 object-cover sm:h-36"
          aria-hidden="true"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="neon-pill rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Identity studio</span>
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-text-muted">Tune your profile for stronger conversions</span>
        </div>
      </section>

      <div className="reveal-rise reveal-rise-delay-1 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={onSubmit} className="sexy-frame rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Edit profile</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-text-muted">
              Display name
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              />
            </label>
            <label className="block text-sm text-text-muted">
              City
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              />
            </label>
            <label className="block text-sm text-text-muted">
              Bio
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              />
            </label>
            <label className="block text-sm text-text-muted">
              Interests (comma separated)
              <input
                value={interests}
                onChange={(event) => setInterests(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-[#1d1003]"
          >
            Save changes
          </button>
          {notice ? <p className="mt-3 text-sm text-accent-strong">{notice}</p> : null}
        </form>

        <article className="sexy-frame rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Profile preview</h2>
          <p className="mt-2 text-sm text-text-muted">Role: {currentAccount.role}</p>
          <p className="mt-1 text-sm text-text-muted">
            Verification: {currentAccount.ageVerified ? "Verified" : "Pending"}
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-base font-semibold">{displayName || currentProfile.name}</p>
            <p className="text-xs text-accent-strong">{city || currentProfile.city}</p>
            <p className="mt-2 text-sm text-text-muted">{bio || currentProfile.bio}</p>
          </div>
        </article>
      </div>

      <section className="app-surface app-section mt-6 p-5">
        <h2 className="text-lg font-semibold">Active sessions</h2>
        <p className="mt-2 text-sm text-text-muted">
          Review devices signed into your account and revoke unknown sessions.
        </p>

        <div className="mt-3 space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <p className="font-semibold">
                {session.current ? "Current device" : "Active device"}
              </p>
              <p className="text-xs text-text-muted">IP: {session.ip}</p>
              <p className="text-xs text-text-muted">Agent: {session.userAgent}</p>
              <p className="text-xs text-text-muted">
                Created: {new Date(session.createdAt).toLocaleString()}
              </p>
              {!session.current ? (
                <button
                  type="button"
                  onClick={() => revokeSession(session.id)}
                  className="mt-2 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold"
                >
                  Revoke
                </button>
              ) : null}
            </div>
          ))}
          {sessions.length === 0 ? <p className="text-sm text-text-muted">No active sessions found.</p> : null}
        </div>
        <button
          type="button"
          onClick={revokeOtherSessions}
          className="mt-3 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold"
        >
          Revoke all other sessions
        </button>
        {sessionNotice ? <p className="mt-2 text-sm text-accent-strong">{sessionNotice}</p> : null}
      </section>

      <section className="app-surface app-section mt-6 p-5">
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="mt-2 text-sm text-text-muted">Change your password and keep account access secure.</p>

        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-text-muted">
          <p>Age verification: {security?.ageVerified ? "verified" : "pending"}</p>
          <p>FICA status: {security?.ficaStatus ?? "loading"}</p>
          <p>Backup codes remaining: {security?.backupCodesRemaining ?? 0}</p>
          <p>Failed logins: {security?.failedLoginCount ?? 0}</p>
          <p>Locked until: {security?.lockedUntil ? new Date(security.lockedUntil).toLocaleString() : "Not locked"}</p>
          <p>Last login: {security?.lastLoginAt ? new Date(security.lastLoginAt).toLocaleString() : "Unknown"}</p>
          <p>
            Last password change: {security?.lastPasswordChangeAt ? new Date(security.lastPasswordChangeAt).toLocaleString() : "Never"}
          </p>
          {security?.twoFactorEnabled ? (
            <button
              type="button"
              onClick={disableTwoFactorNow}
              className="mt-2 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold"
            >
              Disable 2FA
            </button>
          ) : (
            <div className="mt-2 space-y-2">
              <button
                type="button"
                onClick={beginTwoFactor}
                className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold"
              >
                Start 2FA setup
              </button>
              {twoFactorSecret ? (
                <>
                  <div className="rounded border border-white/10 bg-black/20 p-2 text-[11px] break-all">
                    Secret: {twoFactorSecret}
                  </div>
                  {twoFactorUri ? (
                    <Image
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(twoFactorUri)}`}
                      alt="2FA QR code"
                      width={180}
                      height={180}
                      unoptimized
                      className="h-[180px] w-[180px] rounded border border-white/10 bg-white p-1"
                    />
                  ) : null}
                </>
              ) : null}
              <div className="flex gap-2">
                <input
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value)}
                  placeholder="Enter 6-digit code"
                  className="app-input rounded-xl px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={verifyTwoFactor}
                  className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold"
                >
                  Verify
                </button>
              </div>
            </div>
          )}
          {security?.twoFactorEnabled ? (
            <button
              type="button"
              onClick={generateBackupCodesNow}
              className="mt-2 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold"
            >
              Generate backup codes
            </button>
          ) : null}
          {backupCodes.length > 0 ? (
            <div className="mt-2 rounded border border-amber-200/30 bg-amber-300/10 p-2 text-[11px] text-amber-100">
              <p className="mb-1 font-semibold">Recovery codes (save securely):</p>
              <div className="grid grid-cols-2 gap-1">
                {backupCodes.map((code) => (
                  <code key={code}>{code}</code>
                ))}
              </div>
            </div>
          ) : null}
          {securityNotice ? <p className="mt-2 text-accent-strong">{securityNotice}</p> : null}
        </div>

        <form onSubmit={changePassword} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-text-muted">
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="app-input mt-1 w-full rounded-xl px-3 py-2"
            />
          </label>
          <label className="text-sm text-text-muted">
            New password
            <input
              type="password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              className="app-input mt-1 w-full rounded-xl px-3 py-2"
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="app-cta rounded-full px-4 py-2 text-sm font-semibold">
              Update password
            </button>
          </div>
        </form>
        {passwordNotice ? <p className="mt-2 text-sm text-accent-strong">{passwordNotice}</p> : null}
      </section>
    </ProductShell>
  );
}
