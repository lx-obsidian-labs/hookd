"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { markAgeVerifiedCookie } from "@/lib/auth-session-client";
import { useHookedApp } from "@/lib/hooked-app";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type VerifyAgeClientProps = {
  initialNextPath: string;
};

export function VerifyAgeClient({ initialNextPath }: VerifyAgeClientProps) {
  const router = useRouter();
  const { currentAccount, verifyCurrentUserAge } = useHookedApp();
  const [idNumber, setIdNumber] = useState("");
  const [country, setCountry] = useState("South Africa");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idNumber.trim()) {
      setMessage("Government ID number is required for this demo verification step.");
      return;
    }

    const result = verifyCurrentUserAge();
    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    try {
      await markAgeVerifiedCookie();
    } catch {
      setMessage("Verification passed, but session update failed. Please refresh.");
      return;
    }

    router.push(initialNextPath || "/wallet");
  }

  return (
    <ProductShell
      title="Verify your age"
      description="Age verification is mandatory before paid and adult features, including wallet actions and private calls."
    >
      {!currentAccount ? (
        <div className="glass-panel rounded-2xl border border-amber-300/30 bg-amber-400/10 p-5 text-sm text-amber-100">
          Sign in first to complete age verification.
          <div className="mt-3">
            <Link href="/auth/sign-in" className="underline">
              Go to sign in
            </Link>
          </div>
        </div>
      ) : currentAccount.ageVerified ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="glass-panel rounded-2xl p-6">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">Verified</p>
            <h2 className="mt-2 text-xl font-semibold">Your account is already age-verified</h2>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              Premium features are unlocked, including paid media in chat, token purchases,
              and private calls.
            </p>
            <button
              type="button"
              onClick={() => router.push(initialNextPath || "/wallet")}
              className="mt-5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-[#1d1003] transition hover:bg-accent-strong"
            >
              Continue
            </button>
          </article>
          <article className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold">Verified at</h3>
            <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-text-muted">
              {currentAccount.ageVerifiedAt
                ? new Date(currentAccount.ageVerifiedAt).toLocaleString()
                : "Recently verified"}
            </p>
          </article>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={onSubmit} className="glass-panel rounded-2xl p-6">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent-strong">
              Verification Gate
            </p>
            <h2 className="mt-2 text-lg font-semibold">Age check</h2>
            <label className="mt-4 block text-sm text-text-muted">
              Government ID number
              <input
                value={idNumber}
                onChange={(event) => setIdNumber(event.target.value)}
                placeholder="ID or passport number"
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              />
            </label>
            <label className="mt-3 block text-sm text-text-muted">
              Country
              <input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              />
            </label>
            <p className="mt-3 text-xs text-text-muted">
              Demo mode: this form simulates a third-party age verification provider.
            </p>
            {message ? <p className="mt-3 text-sm text-amber-300">{message}</p> : null}
            <button
              type="submit"
              className="mt-5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-[#1d1003] transition hover:bg-accent-strong"
            >
              Verify and continue
            </button>
          </form>
          <article className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold">What unlocks after approval</h3>
            <ul className="mt-4 space-y-2 text-sm text-text-muted">
              <li className="rounded-xl border border-white/10 bg-white/5 p-3">Buy token bundles and review receipts.</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-3">Send paid media in matched chats.</li>
              <li className="rounded-xl border border-white/10 bg-white/5 p-3">Launch private live calls with minute metering.</li>
            </ul>
          </article>
        </div>
      )}
    </ProductShell>
  );
}
