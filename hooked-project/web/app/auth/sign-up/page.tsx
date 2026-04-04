"use client";

import { ProductShell } from "@/app/_components/product-shell";
import type { AccountRole } from "@/lib/hooked-app";
import { useHookedApp } from "@/lib/hooked-app";
import { resolvePostAuthPath } from "@/lib/safe-next-path";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

function passwordChecks(password: string) {
  return [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Symbol", ok: /[^a-zA-Z0-9]/.test(password) },
  ];
}

export default function SignUpPage() {
  const router = useRouter();
  const { hydrated, syncSessionAccount } = useHookedApp();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [age, setAge] = useState(21);
  const [city, setCity] = useState("Johannesburg");
  const [gender, setGender] = useState("Female");
  const [lookingFor, setLookingFor] = useState<string[]>(["Long-term dating"]);
  const [interestedInHookups, setInterestedInHookups] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [nicheTagsInput, setNicheTagsInput] = useState("");
  const [savedPicsInput, setSavedPicsInput] = useState("");
  const [savedVideosInput, setSavedVideosInput] = useState("");
  const [ficaLegalName, setFicaLegalName] = useState("");
  const [ficaIdNumber, setFicaIdNumber] = useState("");
  const [ficaDocumentUrl, setFicaDocumentUrl] = useState("");
  const [ficaDocumentFile, setFicaDocumentFile] = useState<File | null>(null);
  const [ficaConsent, setFicaConsent] = useState(false);
  const [role, setRole] = useState<AccountRole>("user");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [optInMarketing, setOptInMarketing] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const checks = passwordChecks(password);
  const passwordReady = checks.every((item) => item.ok);

  async function uploadAsset(category: "profile-picture" | "saved-picture" | "saved-video" | "fica-document", file: File) {
    const formData = new FormData();
    formData.append("category", category);
    formData.append("file", file);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as { ok: boolean; message?: string; url?: string };
    if (!payload.ok || !payload.url) {
      throw new Error(payload.message ?? "Upload failed.");
    }
    return payload.url;
  }

  async function onUploadProfilePicture() {
    if (!profilePictureFile) {
      setMessage("Choose a profile picture file first.");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const url = await uploadAsset("profile-picture", profilePictureFile);
      setProfilePictureUrl(url);
      setMessage("Profile picture uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload profile picture.");
    } finally {
      setUploading(false);
    }
  }

  async function onUploadFicaDocument() {
    if (!ficaDocumentFile) {
      setMessage("Choose a FICA document file first.");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const url = await uploadAsset("fica-document", ficaDocumentFile);
      setFicaDocumentUrl(url);
      setMessage("FICA document uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload FICA document.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setMessage("You must accept the terms and safety policy.");
      return;
    }
    if (!passwordReady) {
      setMessage("Choose a stronger password to continue.");
      return;
    }
    if (!lookingFor.length) {
      setMessage("Select at least one preference for what you are looking for.");
      return;
    }
    setSubmitting(true);
    const requestedNextPath =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        displayName,
        firstName,
        surname,
        username,
        role,
        age,
        city,
        gender,
        lookingFor,
        interestedInHookups,
        profilePictureUrl,
        description,
        nicheTags: nicheTagsInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        savedPics: savedPicsInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        savedVideos: savedVideosInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        ficaLegalName,
        ficaIdNumber,
        ficaDocumentUrl,
        ficaConsent,
        nextPath: requestedNextPath ?? undefined,
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
    setSubmitting(false);

    if (!result.ok || !result.account) {
      setMessage(result.message ?? "Could not create account.");
      return;
    }

    syncSessionAccount(result.account);

    if (optInMarketing) {
      window.localStorage.setItem("hooked.marketing-opt-in", "1");
    }

    const nextPath = resolvePostAuthPath({
      role: result.account.role,
      requestedPath: result.nextPath,
    });
    setMessage("Account created successfully. Preparing your dashboard...");
    window.setTimeout(() => {
      router.push(nextPath);
    }, 400);
  }

  return (
    <ProductShell
      title="Create your Hooked account"
      description="Start with profile basics, verify age for premium access, and unlock a safer dating + creator experience."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <form className="app-surface app-section p-5" onSubmit={onSubmit}>
          <h2 className="text-lg font-semibold">Sign up</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {([
              { label: "User account", value: "user" },
              { label: "Model account", value: "model" },
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
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-text-muted">
              Display name
              <input
                 className="app-input mt-1 w-full rounded-xl px-3 py-2"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm text-text-muted">
                First name
                <input
                 className="app-input mt-1 w-full rounded-xl px-3 py-2"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm text-text-muted">
                Surname
                <input
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
                  value={surname}
                  onChange={(event) => setSurname(event.target.value)}
                  required
                />
              </label>
            </div>
            <label className="block text-sm text-text-muted">
              Username
              <input
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="lowercase_and_numbers"
                required
              />
            </label>
            <label className="block text-sm text-text-muted">
              Email
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm text-text-muted">
              Password
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="block text-sm text-text-muted">
              Confirm password
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-text-muted">
                Age
                <input
                  type="number"
                  min={18}
                  max={99}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
                  value={age}
                  onChange={(event) => setAge(Number(event.target.value))}
                />
              </label>
              <label className="block text-sm text-text-muted">
                City
                <input
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm text-text-muted">
              Gender
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              >
                <option>Female</option>
                <option>Male</option>
                <option>Trans woman</option>
                <option>Trans man</option>
                <option>Non-binary</option>
              </select>
            </label>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">What are you looking for?</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {["Long-term dating", "Casual dating", "Hookups", "Friendship", "Private calls"].map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm text-text-muted">
                    <input
                      type="checkbox"
                      checked={lookingFor.includes(item)}
                      onChange={(event) => {
                        setLookingFor((prev) =>
                          event.target.checked ? [...prev, item] : prev.filter((value) => value !== item),
                        );
                      }}
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={interestedInHookups}
                onChange={(event) => setInterestedInHookups(event.target.checked)}
              />
              <span>I am open to hookups.</span>
            </label>
            <label className="block text-sm text-text-muted">
              Profile picture URL
              <input
                type="url"
                value={profilePictureUrl}
                onChange={(event) => setProfilePictureUrl(event.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              />
            </label>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Upload profile picture</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setProfilePictureFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={onUploadProfilePicture}
                  disabled={uploading}
                  className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent-strong disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
            </div>
            <label className="block text-sm text-text-muted">
              Niche classification tags
              <input
                value={nicheTagsInput}
                onChange={(event) => setNicheTagsInput(event.target.value)}
                placeholder="fitness, roleplay, cosplay, dance"
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              />
            </label>
            <label className="block text-sm text-text-muted">
              Description / bio
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              />
            </label>
            <label className="block text-sm text-text-muted">
              Saved pictures URLs (comma-separated)
              <input
                value={savedPicsInput}
                onChange={(event) => setSavedPicsInput(event.target.value)}
                placeholder="https://... , https://..."
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              />
            </label>
            <label className="block text-sm text-text-muted">
              Saved videos URLs (comma-separated)
              <input
                value={savedVideosInput}
                onChange={(event) => setSavedVideosInput(event.target.value)}
                placeholder="https://... , https://..."
                className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
              />
            </label>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">FICA compliance</p>
              <p className="mt-2 text-xs text-text-muted">
                Optional at signup. You can complete verification later in Safety, but wallet and calls stay limited until approved.
              </p>
              <label className="mt-2 block text-sm text-text-muted">
                Legal name
                <input
                  value={ficaLegalName}
                  onChange={(event) => setFicaLegalName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
                />
              </label>
              <label className="mt-3 block text-sm text-text-muted">
                ID / Passport number
                <input
                  value={ficaIdNumber}
                  onChange={(event) => setFicaIdNumber(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-white outline-none ring-accent/40 focus:ring"
                />
              </label>
              <div className="mt-3">
                <p className="text-sm text-text-muted">FICA document upload (PDF/JPG/PNG)</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    onChange={(event) => setFicaDocumentFile(event.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-white/15 bg-[#0d1b2c]/90 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={onUploadFicaDocument}
                    disabled={uploading}
                    className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent-strong disabled:opacity-50"
                  >
                    Upload
                  </button>
                </div>
                {ficaDocumentUrl ? <p className="mt-2 text-xs text-emerald-300">Document uploaded</p> : null}
              </div>
              <label className="mt-3 flex items-start gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={ficaConsent}
                  onChange={(event) => setFicaConsent(event.target.checked)}
                />
                <span>I consent to FICA/KYC processing for compliance and fraud prevention.</span>
              </label>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Password strength</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {checks.map((item) => (
                  <p key={item.label} className={item.ok ? "text-emerald-300" : "text-text-muted"}>
                    {item.ok ? "[x] " : "[ ] "}
                    {item.label}
                  </p>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                required
              />
              <span>
                I confirm I am 18+ and accept the terms, privacy policy, and platform safety rules.
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={optInMarketing}
                onChange={(event) => setOptInMarketing(event.target.checked)}
              />
              <span>Send me product updates and feature announcements.</span>
            </label>
          </div>
          {message ? <p className="mt-3 text-sm text-amber-300">{message}</p> : null}
          <button
            type="submit"
            disabled={!hydrated || submitting}
             className="app-cta mt-5 rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-50"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
          <p className="mt-3 text-xs text-text-muted">
            Already have an account? <Link className="underline" href="/auth/sign-in">Sign in</Link>
          </p>
        </form>
        <article className="app-surface app-section stream-card overflow-hidden p-5">
          <Image
            src="/asset-velvet-card.svg"
            alt="Romantic ambience"
            width={900}
            height={520}
            className="h-32 w-full rounded-xl border border-white/10 object-cover"
          />
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-accent-strong">Made for meaningful sparks</p>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Build a profile that feels warm, real, and intentional. Once signup succeeds, you drop straight into your dashboard to keep momentum.
          </p>
        </article>
        <article className="app-surface app-section stream-card p-5">
          <h2 className="text-lg font-semibold">Signup checklist</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            <li>- Email or phone registration</li>
            <li>- Profile details and discovery preferences</li>
            <li>- Policy and consent confirmation</li>
            <li>- Age verification before monetized features</li>
          </ul>
        </article>
        <article className="app-surface app-section stream-card p-5">
          <h2 className="text-lg font-semibold">Why verification matters</h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            Hooked protects users and creators through identity checks,
            moderation workflows, and transparent billing records for paid
            interactions.
          </p>
        </article>
      </div>
    </ProductShell>
  );
}
