"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { PreviewGate } from "@/app/_components/preview-gate";
import { useHookedApp } from "@/lib/hooked-app";
import Image from "next/image";
import { useState } from "react";

export default function WalletPage() {
  const { currentAccount, tokenBundles, wallet, purchaseReceipts, purchaseTokens } = useHookedApp();
  const [notice, setNotice] = useState("");

  function onBuy(bundleId: string) {
    const result = purchaseTokens(bundleId);
    setNotice(result.message);
  }

  return (
    <ProductShell
      title="Wallet"
      description="Manage token balances, purchases, and receipts with transparent transaction history."
    >
      <section className="sexy-frame reveal-rise mb-4 rounded-2xl p-3 sm:p-5">
        <Image
          src="/asset-velvet-card.svg"
          alt=""
          width={640}
          height={420}
          className="h-28 w-full rounded-xl border border-white/10 object-cover sm:h-36"
          aria-hidden="true"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="neon-pill rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Wallet Desk</span>
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-text-muted">Transparent billing + receipts</span>
        </div>
      </section>

      {!currentAccount ? (
        <PreviewGate
          title="Wallet preview mode"
          body="You can preview pricing and billing flow. Sign in to purchase bundles and access your real wallet."
        />
      ) : null}

      {notice ? <p className="mb-4 text-sm text-accent-strong">{notice}</p> : null}

      <div className="reveal-rise reveal-rise-delay-1 grid gap-4 md:grid-cols-2">
        <article className="sexy-frame rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Balance and bundles</h2>
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-text-muted">
            <p>
              Available tokens: <strong className="text-white">{currentAccount ? wallet.available : "-"}</strong>
            </p>
            <p>
              Held tokens: <strong className="text-white">{currentAccount ? wallet.held : "-"}</strong>
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {tokenBundles.map((bundle) => (
              <button
                key={bundle.id}
                type="button"
                onClick={() => onBuy(bundle.id)}
                disabled={!currentAccount}
                className="stream-card flex items-center justify-between rounded-xl border border-white/15 bg-[#0c1727]/90 px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-sm text-white">{bundle.tokens} tokens</span>
                <span className="text-sm font-semibold text-accent">${bundle.priceUsd}</span>
              </button>
            ))}
          </div>
        </article>
        <article className="sexy-frame rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Receipts</h2>
          {!currentAccount ? (
            <ul className="locked-preview mt-3 space-y-2 text-sm text-text-muted">
              {["Top-up 250 tokens", "Paid image send", "Private call session"].map((item) => (
                <li key={item} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="blurred-copy text-white">{item}</p>
                  <p className="text-xs">Locked preview</p>
                </li>
              ))}
            </ul>
          ) : purchaseReceipts.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-text-muted">
              No token purchases yet. Buy a bundle to generate your first receipt.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-text-muted">
              {purchaseReceipts.map((receipt) => (
                <li key={receipt.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-white">{receipt.amount} tokens credited</p>
                  <p className="text-xs">{new Date(receipt.createdAt).toLocaleString()}</p>
                  <p className="text-xs">Reference: {receipt.reference}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </ProductShell>
  );
}
