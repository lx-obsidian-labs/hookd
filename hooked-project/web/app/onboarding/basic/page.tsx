"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { useHookedApp } from "@/lib/hooked-app";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function OnboardingBasicPage() {
  const router = useRouter();
  const { currentAccount } = useHookedApp();

  const [displayName, setDisplayName] = useState(currentAccount?.displayName ?? "");
  const [gender, setGender] = useState("Undisclosed");
  const [city, setCity] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>(["Dating"]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const canSubmit = useMemo(() => displayName.trim().length >= 2 && lookingFor.length > 0, [displayName, lookingFor]);

  async function submitProfile() {
    if (!canSubmit) {
      setMessage("Complete display name and at least one preference.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    const response = await fetch("/api/profile/basic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        gender,
        city,
        profilePictureUrl,
        lookingFor,
      }),
    });

    const payload = (await response.json()) as { ok: boolean; message?: string };
    setSubmitting(false);
    if (!payload.ok) {
      setMessage(payload.message ?? "Could not save profile basics.");
      return;
    }

    router.push("/dashboard");
  }

  function skipForNow() {
    router.push("/dashboard");
  }

  return (
    <ProductShell
      title="Complete your profile"
      description="Set profile basics in under a minute. You can skip photo and finish it later with limited access."
    >
      <section className="app-surface app-section p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-text-muted">
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="app-input mt-1 w-full rounded-xl px-3 py-2"
            />
          </label>
          <label className="text-sm text-text-muted">
            Gender
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className="app-input mt-1 w-full rounded-xl px-3 py-2"
            >
              <option>Undisclosed</option>
              <option>Female</option>
              <option>Male</option>
              <option>Trans woman</option>
              <option>Trans man</option>
              <option>Non-binary</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-text-muted">
            City
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="app-input mt-1 w-full rounded-xl px-3 py-2"
            />
          </label>
          <label className="text-sm text-text-muted">
            Profile photo URL (optional)
            <input
              value={profilePictureUrl}
              onChange={(event) => setProfilePictureUrl(event.target.value)}
              placeholder="https://..."
              className="app-input mt-1 w-full rounded-xl px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Interested in</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {["Dating", "Casual", "Friendship", "Private calls", "Long-term"].map((item) => (
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={submitProfile}
            disabled={submitting || !canSubmit}
            className="app-cta rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save and continue"}
          </button>
          <button
            type="button"
            onClick={skipForNow}
            className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold"
          >
            Skip for now
          </button>
          {message ? <p className="text-sm text-amber-300">{message}</p> : null}
        </div>
      </section>
    </ProductShell>
  );
}
