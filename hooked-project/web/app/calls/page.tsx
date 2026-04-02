"use client";

import { ProductShell } from "@/app/_components/product-shell";
import { PreviewGate } from "@/app/_components/preview-gate";
import { useHookedApp } from "@/lib/hooked-app";
import Image from "next/image";
import Link from "next/link";

const roomMessages = [
  { id: "m1", user: "leo_thelion", body: "You look amazing tonight", time: "21:14" },
  { id: "m2", user: "cody_live", body: "Can we do a dance challenge next?", time: "21:15" },
  { id: "m3", user: "anika93", body: "Sending support from Cape Town", time: "21:15" },
  { id: "m4", user: "mike_vr", body: "Private room in 5 min?", time: "21:16" },
];

const tipMenu = [
  { id: "t1", label: "Shoutout with my name", price: 5 },
  { id: "t2", label: "Song request", price: 10 },
  { id: "t3", label: "Dance request", price: 20 },
  { id: "t4", label: "Private room invite", price: 60 },
];

export default function CallsPage() {
  const { currentAccount, wallet } = useHookedApp();

  return (
    <ProductShell
      title="Live Rooms"
      description="Real-time streaming rooms with public chat, tipping controls, and private session upsell."
    >
        {!currentAccount ? (
          <PreviewGate
            title="Calls preview mode"
            body="Preview call rooms and controls. Sign in to unlock private sessions and tipping."
          />
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[1.28fr_0.95fr]">
          <section className="app-surface app-section overflow-hidden bg-[#0e1117]">
            <div className="flex items-center gap-3 border-b border-white/10 bg-[#20242b] px-3 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Image
                  src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=240&q=80"
                  alt="Host avatar"
                  width={32}
                  height={32}
                  unoptimized
                  className="size-8 rounded-full object-cover"
                />
                <p className="font-semibold">tammy_brown</p>
              </div>
              <span className="rounded-full bg-[#163122] px-2 py-0.5 text-xs font-semibold text-[#4de38e]">
                Live 6.7k viewers
              </span>
              <span className="ml-auto text-text-muted">Next model</span>
            </div>

            <div className="relative">
              <Image
                src="https://images.unsplash.com/photo-1512310604669-443f26c35f52?auto=format&fit=crop&w=1600&q=80"
                alt="Live room"
                width={1600}
                height={900}
                unoptimized
                className="h-[260px] w-full object-cover sm:h-[340px] lg:h-[560px]"
                loading="eager"
              />
              <div className="absolute left-3 top-3 rounded-md border border-rose-300/40 bg-[#be1d2f]/88 px-2 py-1 text-xs font-bold uppercase">
                Live now
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 sm:p-4">
                <div className="mb-2 flex items-center gap-2 text-xs sm:text-sm">
                  <span className="rounded-full border border-[#f0bf37]/60 px-3 py-1 font-semibold text-[#f0bf37]">
                    Private Show 12 tk/min
                  </span>
                  <button
                    type="button"
                    className="rounded-full bg-[#6bab33] px-3 py-1 font-semibold text-white"
                  >
                    Send Tip
                  </button>
                </div>
                <p className="max-w-3xl text-sm text-white/90 sm:text-base">
                  Goal: 3000 tokens - control machine 5 minutes
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-[38%] bg-[#8cdf43]" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#171b23] px-3 py-2 text-sm text-text-muted">
              <p>Session meter: 22 tokens/min</p>
              <p>Wallet balance: {wallet.available} tokens</p>
              <p>Tip this room: 100 tokens total</p>
            </div>
          </section>

          <aside className="app-surface app-section overflow-hidden bg-[#111318]">
            <div className="flex items-center gap-3 border-b border-white/10 bg-[#1b1f27] px-3 py-2.5">
              <button type="button" className="border-b-2 border-[#e43145] pb-1 text-sm font-semibold text-white">
                Public
              </button>
              <button type="button" className="pb-1 text-sm text-text-muted">
                Private
              </button>
              <span className="ml-auto text-sm text-white/70">11 online</span>
            </div>

            <div className="h-[300px] space-y-2 overflow-y-auto border-b border-white/10 bg-[#151821] p-3 sm:h-[380px] lg:h-[470px]">
              <div className="rounded-lg border border-[#7f6a1f] bg-[#2a2412] px-3 py-2 text-sm">
                <p className="font-semibold text-[#ffcf53]">New goal - 3000 tk</p>
                <p className="text-white/80">control machine 5 minutes</p>
              </div>

              {roomMessages.map((message) => (
                <article key={message.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <p className="font-semibold text-[#8db7ff]">{message.user}</p>
                  <p className="mt-1 text-white/90">{message.body}</p>
                  <p className="mt-1 text-[11px] text-white/50">{message.time}</p>
                </article>
              ))}

              <div className="rounded-lg border border-white/10 bg-[#1b212e] p-3">
                <p className="text-sm font-semibold">Tip menu</p>
                <div className="mt-2 space-y-2">
                  {tipMenu.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm">
                      <span>{item.label}</span>
                      <span className="font-semibold text-[#71c9ff]">{item.price} tk</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#101318] p-3">
              <input
                placeholder="Public message..."
                className="app-input w-full rounded-full px-4 py-2 text-sm"
              />
              <button
                type="button"
                className="app-cta rounded-full px-4 py-2 text-sm font-semibold"
              >
                Send
              </button>
            </div>

            {!currentAccount ? (
              <div className="border-t border-white/10 bg-[#191315] px-3 py-2 text-xs text-[#ffb0b9]">
                Sign in to join private rooms, tip, and access in-session controls.
                <Link href="/auth/sign-in" className="ml-2 underline">
                  Unlock now
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
    </ProductShell>
  );
}
