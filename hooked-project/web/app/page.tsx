import Image from "next/image";
import Link from "next/link";

const productPillars = [
  {
    title: "Match to message in seconds",
    copy: "Users swipe, match, and start free text chat instantly. Keep conversation volume high before monetization prompts.",
    icon: "/icon-matches.svg",
  },
  {
    title: "Monetize high-intent moments",
    copy: "Paid media unlocks and per-minute calls trigger only when users are already engaged and ready.",
    icon: "/icon-wallet.svg",
  },
  {
    title: "Compliance by design",
    copy: "Age-gated premium surfaces, moderation workflows, and auditable events are built into the core flow.",
    icon: "/icon-safety.svg",
  },
];

const creatorSpotlights = [
  { name: "Mila", image: "/cover-mila.svg", online: "Live now" },
  { name: "Nia", image: "/cover-nia.svg", online: "Audience waiting" },
  { name: "Ari", image: "/cover-ari.svg", online: "New content" },
];

const conversionMoments = [
  {
    title: "Free text for matched users",
    detail: "Lower friction for first contact and D1 conversation depth.",
  },
  {
    title: "Paid image and video in chat",
    detail: "Transparent token prompts at send/unlock moments.",
  },
  {
    title: "Per-minute private calls",
    detail: "Live meter and low-balance guardrails with clear pricing.",
  },
];

const launchSignals = [
  { label: "Profile-to-match", value: "fast path" },
  { label: "Text chat cost", value: "free" },
  { label: "Premium trigger", value: "tokens" },
  { label: "Call billing", value: "per-minute" },
  { label: "Safety gate", value: "18+ required" },
];

const funnelSteps = [
  { name: "Discover", detail: "Swipe curated profiles and find mutual intent quickly." },
  { name: "Match", detail: "Open free text chat instantly after mutual like." },
  { name: "Unlock", detail: "Offer paid images/videos with visible token pricing." },
  { name: "Call", detail: "Start private sessions with live spend metering." },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-clip px-4 pb-20 pt-6 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 noise-overlay opacity-60" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-[#0a1220]/75 px-4 py-3 backdrop-blur sm:px-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-strong">Hooked</p>
          <p className="text-xs text-text-muted">Dating + Creator Platform</p>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/auth/sign-in" className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40">
            Sign in
          </Link>
          <Link href="/auth/sign-up" className="app-cta rounded-full px-4 py-2 text-sm font-semibold">
            Create account
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto mt-8 grid w-full max-w-6xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="mesh-backdrop sexy-frame reveal-rise rounded-3xl p-6 sm:p-8 lg:p-10">
          <p className="neon-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
            Production-first MVP
          </p>
          <h1 className="editorial-title mt-4 text-4xl font-bold sm:text-5xl lg:text-6xl">
            Build matches first.
            <br />
            Monetize intent second.
          </h1>
          <p className="app-subtitle mt-4 max-w-xl text-sm sm:text-base">
            Hooked combines dating discovery with creator monetization through free matched chat,
            paid media, and per-minute private calls, all with compliance gates built in.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/auth/sign-up" className="app-cta rounded-full px-5 py-2.5 text-sm font-semibold">
              Start onboarding
            </Link>
            <Link href="/auth/sign-in?next=%2Fdiscover" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/40">
              Explore discover flow
            </Link>
          </div>
          <div className="mt-7 grid gap-2 text-sm text-white/85 sm:grid-cols-3">
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Free matched text chat</p>
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Tokenized media unlocks</p>
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Per-minute live calls</p>
          </div>
        </article>

        <article className="reveal-rise reveal-rise-delay-1 sexy-frame rounded-3xl p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            <Image
              src="/asset-hero-orbit.svg"
              alt="Hooked interface orbit"
              width={1400}
              height={1000}
              className="h-48 w-full object-cover sm:h-56"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#070b13] to-transparent p-4">
              <p className="text-sm font-semibold">Primary funnel in one platform</p>
              <p className="text-xs text-white/70">Discover / Match / Chat / Unlock / Call</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {creatorSpotlights.map((creator) => (
              <div key={creator.name} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <Image
                  src={creator.image}
                  alt={`${creator.name} creator profile`}
                  width={420}
                  height={520}
                  className="h-36 w-full object-cover"
                />
                <div className="p-2.5">
                  <p className="text-sm font-semibold">{creator.name}</p>
                  <p className="text-xs text-signal">{creator.online}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="relative z-10 mx-auto mt-6 grid w-full max-w-6xl gap-4 md:grid-cols-3">
        {productPillars.map((pillar, index) => (
          <article
            key={pillar.title}
            className={`glass-panel reveal-rise rounded-2xl p-5 ${index === 1 ? "reveal-rise-delay-1" : ""} ${index === 2 ? "reveal-rise-delay-2" : ""}`}
          >
            <Image src={pillar.icon} alt="" aria-hidden width={24} height={24} className="h-6 w-6" />
            <h2 className="mt-3 text-lg font-semibold">{pillar.title}</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">{pillar.copy}</p>
          </article>
        ))}
      </section>

      <section className="relative z-10 mx-auto mt-5 grid w-full max-w-6xl gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {launchSignals.map((signal) => (
          <article key={signal.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.15em] text-white/55">{signal.label}</p>
            <p className="mt-1 text-sm font-semibold text-accent-strong">{signal.value}</p>
          </article>
        ))}
      </section>

      <section className="relative z-10 mx-auto mt-6 grid w-full max-w-6xl gap-5 lg:grid-cols-2">
        <article className="app-surface reveal-rise rounded-3xl p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent-strong">Primary monetization moments</p>
          <ul className="mt-4 space-y-3">
            {conversionMoments.map((moment) => (
              <li key={moment.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">{moment.title}</p>
                <p className="mt-1 text-sm text-text-muted">{moment.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-white/65">Pricing is always shown before paid actions to preserve trust and reduce support load.</p>
        </article>

        <article className="app-surface reveal-rise reveal-rise-delay-1 rounded-3xl p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">Visual feed preview</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Image src="/gallery-neon.svg" alt="Neon gallery preview" width={420} height={420} className="h-28 w-full rounded-xl object-cover" />
            <Image src="/gallery-teal.svg" alt="Teal gallery preview" width={420} height={420} className="h-28 w-full rounded-xl object-cover" />
            <Image src="/gallery-gold.svg" alt="Gold gallery preview" width={420} height={420} className="h-28 w-full rounded-xl object-cover" />
          </div>
          <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            Safety gates active: age verification required for wallet, calls, and premium interactions.
          </div>
        </article>
      </section>

      <section className="relative z-10 mx-auto mt-6 w-full max-w-6xl rounded-3xl border border-white/10 bg-[#0b1423]/70 p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">How Hooked converts</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {funnelSteps.map((step, index) => (
            <article key={step.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">Step {index + 1}</p>
              <h3 className="mt-1 text-base font-semibold">{step.name}</h3>
              <p className="mt-1 text-sm text-text-muted">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-8 w-full max-w-6xl rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent-strong">Launch-ready flow</p>
        <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Turn discovery into trusted premium interaction</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-text-muted sm:text-base">
          Start with free engagement, convert high-intent users with clear pricing, and run moderation-aware operations from day one.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth/sign-up" className="app-cta rounded-full px-6 py-2.5 text-sm font-semibold">
            Create account
          </Link>
          <Link href="/auth/sign-in" className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/40">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
