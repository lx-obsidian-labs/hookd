"use client";

import { ProductShell } from "@/app/_components/product-shell";
import type { AccountRole } from "@/lib/hooked-app";
import { useHookedApp } from "@/lib/hooked-app";
import { resolvePostAuthPath } from "@/lib/safe-next-path";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type SignInClientProps = {
  initialNextPath: string;
  initialMessage?: string;
};

type MessageTone = "info" | "success" | "error";

const HERO_ROTATION_MS = 2000;
const SIGN_IN_HERO_IMAGES = [
  "/cover-mila.svg",
  "/cover-nia.svg",
  "/cover-ari.svg",
  "/cover-skye.svg",
  "/cover-jules.svg",
  "/cover-avery.svg",
  "/cover-default.svg",
];

export function SignInClient({ initialNextPath, initialMessage }: SignInClientProps) {
  const router = useRouter();
  const { hydrated, syncSessionAccount } = useHookedApp();
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [role, setRole] = useState<AccountRole>("user");
  const [rememberSession, setRememberSession] = useState(true);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [messageTone, setMessageTone] = useState<MessageTone>(initialMessage ? "error" : "info");
  const [devOtpHint, setDevOtpHint] = useState("");
  const [devMagicLink, setDevMagicLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  const canRequestOtp = !submitting && phone.trim().length > 0;
  const canRequestMagicLink = !submitting && email.trim().length > 0;
  const canSubmit =
    hydrated &&
    !submitting &&
    (method === "phone"
      ? phone.trim().length > 0 && otpCode.trim().length > 0
      : email.trim().length > 0 && password.trim().length > 0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % SIGN_IN_HERO_IMAGES.length);
    }, HERO_ROTATION_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setMessage("");
    setMessageTone("info");
    setDevOtpHint("");
    setDevMagicLink("");
  }, [method]);

  async function onRequestOtp() {
    if (!phone.trim()) {
      setMessage("Please enter a phone number first.");
      setMessageTone("error");
      return;
    }

    setMessage("");
    setMessageTone("info");
    setDevOtpHint("");
    setDevMagicLink("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; devCode?: string };
      if (!payload.ok) {
        setMessage(payload.message ?? "Could not send code.");
        setMessageTone("error");
        return;
      }
      setMessage(payload.message ?? "Verification code sent.");
      setMessageTone("success");
      if (payload.devCode) {
        setDevOtpHint(`Dev code: ${payload.devCode}`);
      }
    } catch {
      setMessage("Could not send code right now. Please try again.");
      setMessageTone("error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onRequestMagicLink() {
    if (!email.trim()) {
      setMessage("Please enter your email first.");
      setMessageTone("error");
      return;
    }

    setMessage("");
    setMessageTone("info");
    setDevMagicLink("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; devLink?: string };
      if (!payload.ok) {
        setMessage(payload.message ?? "Could not send magic link.");
        setMessageTone("error");
        return;
      }
      setMessage(payload.message ?? "Magic link sent.");
      setMessageTone("success");
      if (payload.devLink) {
        setDevMagicLink(payload.devLink);
      }
    } catch {
      setMessage("Could not send magic link right now. Please try again.");
      setMessageTone("error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageTone("info");
    setSubmitting(true);
    try {
      const response =
        method === "phone"
          ? await fetch("/api/auth/otp/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: phone.trim(), code: otpCode.trim() }),
            })
          : await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: email.trim(),
                password,
                role,
                otpCode: otpCode.trim(),
                nextPath: initialNextPath,
              }),
            });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        account?: {
          id: string;
          email: string;
          displayName: string;
          role: AccountRole;
          age: number;
          city: string;
          ageVerified: boolean;
          ageVerifiedAt: string | null;
          createdAt: string;
        };
        nextPath?: string;
      };
      if (!result.ok || !result.account) {
        setMessage(result.message ?? "Could not sign in.");
        setMessageTone("error");
        return;
      }

      syncSessionAccount(result.account);

      const successMessage = rememberSession
        ? "Welcome back. Taking you to your dashboard..."
        : "Signed in. Session will be treated as short-lived on supported environments.";
      setMessage(successMessage);
      setMessageTone("success");

      const nextPath = resolvePostAuthPath({
        role: result.account.role,
        requestedPath: result.nextPath ?? initialNextPath,
      });
      window.setTimeout(() => {
        router.push(nextPath);
      }, 300);
    } catch {
      setMessage("Could not sign in right now. Please try again.");
      setMessageTone("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProductShell
      title="Welcome back to Hookchat"
      description="Sign in to continue your chats, live room sessions, and moderation-safe premium interactions."
    >
      <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <article className="app-surface app-section overflow-hidden">
          <div className="relative">
            <Image
              key={SIGN_IN_HERO_IMAGES[heroImageIndex]}
              src={SIGN_IN_HERO_IMAGES[heroImageIndex] ?? "/cover-default.svg"}
              alt="Featured creators"
              width={1600}
              height={1000}
              className="h-56 w-full object-cover transition-opacity duration-500 sm:h-72 lg:h-[520px]"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#07070b] via-[#07070baa] to-transparent p-5">
              <p className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Secure access
              </p>
              <h3 className="app-title mt-3 max-w-md text-2xl font-semibold sm:text-3xl">
                Continue your story with people who match your energy.
              </h3>
              <p className="mt-2 max-w-md text-sm text-white/85">
                Love-forward matching, affectionate conversations, and a safer premium experience - all in one dashboard.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-white/85">
                <li>- Login protection with lockout and audit tracing</li>
                <li>- Session-aware age-gated routing</li>
                <li>- FICA and moderation pipeline ready</li>
              </ul>
            </div>
          </div>
        </article>

        <form className="app-surface app-section p-6" onSubmit={onSubmit}>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-strong">Access Portal</p>
          <h2 className="app-title mt-2 text-xl font-semibold">Sign in</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod("phone")}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${method === "phone" ? "border-accent/60 bg-accent/12 text-accent-strong" : "border-white/15 bg-white/5 text-text-muted"}`}
            >
              Phone OTP
            </button>
            <button
              type="button"
              onClick={() => setMethod("email")}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${method === "email" ? "border-accent/60 bg-accent/12 text-accent-strong" : "border-white/15 bg-white/5 text-text-muted"}`}
            >
              Email login
            </button>
          </div>

          {method === "phone" ? (
            <>
              <label className="mt-4 block text-sm text-text-muted">
                Phone number
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+27..."
                  required
                  className="app-input mt-1 w-full rounded-xl px-3 py-2"
                />
              </label>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={onRequestOtp}
                  disabled={!canRequestOtp}
                  className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                >
                  Send OTP
                </button>
              </div>
              <label className="mt-4 block text-sm text-text-muted">
                OTP code
                <input
                  type="text"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  inputMode="numeric"
                  placeholder="123456"
                  autoComplete="one-time-code"
                  required
                  className="app-input mt-1 w-full rounded-xl px-3 py-2"
                />
              </label>
            </>
          ) : null}

          {method === "email" ? (
            <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {([
              { label: "User login", value: "user" },
              { label: "Model login", value: "model" },
            ] as const).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setRole(item.value)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${role === item.value ? "border-accent/60 bg-accent/12 text-accent-strong" : "border-white/15 bg-white/5 text-text-muted"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-sm text-text-muted">
            Account email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="app-input mt-1 w-full rounded-xl px-3 py-2"
            />
          </label>
          <div className="mt-2">
            <button
              type="button"
              onClick={onRequestMagicLink}
              disabled={!canRequestMagicLink}
              className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            >
              Send magic link
            </button>
          </div>

          <label className="mt-4 block text-sm text-text-muted">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="app-input mt-1 w-full rounded-xl px-3 py-2"
            />
          </label>

          <label className="mt-4 block text-sm text-text-muted">
            2FA or backup code (if enabled)
            <input
              type="text"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              inputMode="numeric"
              placeholder="123456 or ABCD-EFGH"
              className="app-input mt-1 w-full rounded-xl px-3 py-2"
            />
          </label>
            </>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-text-muted">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(event) => setRememberSession(event.target.checked)}
              />
              Remember this device
            </label>
            <Link href="/safety" className="underline">
              Forgot password?
            </Link>
          </div>

          {message ? (
            <p
              className={`mt-3 text-sm ${messageTone === "error" ? "text-rose-300" : messageTone === "success" ? "text-emerald-300" : "text-amber-300"}`}
              aria-live="polite"
            >
              {message}
            </p>
          ) : null}
          {devOtpHint ? <p className="mt-1 text-xs text-emerald-300">{devOtpHint}</p> : null}
          {devMagicLink ? (
            <p className="mt-1 text-xs text-emerald-300 break-all">
              Dev magic link: <a href={devMagicLink} className="underline">{devMagicLink}</a>
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="app-cta mt-5 w-full rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Enter Hookchat"}
          </button>

          <p className="mt-3 text-xs text-text-muted">
            Need an account? <Link href="/auth/sign-up" className="underline">Create one</Link>
          </p>
        </form>
      </div>
    </ProductShell>
  );
}
