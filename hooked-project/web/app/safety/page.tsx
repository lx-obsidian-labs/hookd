"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { PreviewGate } from "@/app/_components/preview-gate";
import { useHookedApp } from "@/lib/hooked-app";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SafetyPageContent() {
  const searchParams = useSearchParams();
  const { currentAccount } = useHookedApp();
  const [legalName, setLegalName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function uploadDocument() {
    if (!documentFile) {
      setMessage("Select a document first.");
      return;
    }
    const formData = new FormData();
    formData.append("category", "fica-document");
    formData.append("file", documentFile);

    setSubmitting(true);
    const response = await fetch("/api/uploads", { method: "POST", body: formData });
    const payload = (await response.json()) as { ok: boolean; message?: string; url?: string };
    setSubmitting(false);
    if (!payload.ok || !payload.url) {
      setMessage(payload.message ?? "Could not upload document.");
      return;
    }
    setDocumentUrl(payload.url);
    setMessage("Document uploaded. Submit verification when ready.");
  }

  async function submitVerification() {
    setSubmitting(true);
    const response = await fetch("/api/account/fica", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legalName, idNumber, documentUrl, consent }),
    });
    const payload = (await response.json()) as { ok: boolean; message?: string };
    setSubmitting(false);
    if (!payload.ok) {
      setMessage(payload.message ?? "Could not submit verification.");
      return;
    }
    setMessage("Verification submitted. Access will expand once approved.");
  }

  return (
    <ProductShell
      title="Safety and Compliance"
      description="Hooked enforces age checks, moderation actions, and reporting tools to keep interactions legal and safer."
    >
      {!currentAccount ? (
        <PreviewGate
          title="Safety preview mode"
          body="Browse our safety standards. Sign in to submit reports, manage blocks, and track case outcomes."
        />
      ) : null}

      {currentAccount && searchParams.get("reason") === "verification" ? (
        <div className="app-surface mb-4 rounded-xl p-3 text-sm text-amber-100">
          Your account has limited access until compliance checks are approved. Submit FICA details below.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <article className="stream-card glass-panel rounded-2xl p-5">
          <h2 className="text-base font-semibold">18+ verification</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Adult and paid surfaces are locked until verification is completed.
          </p>
        </article>
        <article className="stream-card glass-panel rounded-2xl p-5">
          <h2 className="text-base font-semibold">Moderation queue</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            AI-assisted triage routes urgent reports to human review with audit
            trails and clear case outcomes.
          </p>
        </article>
        <article className="stream-card glass-panel rounded-2xl p-5">
          <h2 className="text-base font-semibold">User controls</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Block, report, and privacy settings are accessible across matching,
            chat, and call experiences.
          </p>
        </article>
      </div>

      {!currentAccount ? (
        <div className="glass-panel mt-6 rounded-2xl p-5">
          <h2 className="text-base font-semibold">Reporter dashboard preview</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-text-muted">Case #A293 - Under review</p>
            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-text-muted">Case #A241 - Actioned and closed</p>
          </div>
        </div>
      ) : null}

      {currentAccount ? (
        <section className="app-surface mt-6 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Verification center</h2>
          <p className="mt-2 text-sm text-text-muted">
            Upload now or later. Monetized features stay limited until compliance approval.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-text-muted">
              Legal name
              <input
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
                className="app-input mt-1 w-full rounded-xl px-3 py-2"
              />
            </label>
            <label className="text-sm text-text-muted">
              ID / Passport number
              <input
                value={idNumber}
                onChange={(event) => setIdNumber(event.target.value)}
                className="app-input mt-1 w-full rounded-xl px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
              className="app-input w-full rounded-xl px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={uploadDocument}
              disabled={submitting}
              className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent-strong disabled:opacity-60"
            >
              Upload document
            </button>
          </div>

          <label className="mt-3 flex items-start gap-2 text-sm text-text-muted">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>I consent to FICA/KYC verification processing.</span>
          </label>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={submitVerification}
              disabled={submitting}
              className="app-cta rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Submit verification
            </button>
            {message ? <p className="text-sm text-text-muted">{message}</p> : null}
          </div>
        </section>
      ) : null}
    </ProductShell>
  );
}

export default function SafetyPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-text-muted">Loading safety page...</p>}>
      <SafetyPageContent />
    </Suspense>
  );
}
