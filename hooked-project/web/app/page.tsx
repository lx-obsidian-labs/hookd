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
  { name: "Mila", image: "/images/romantic-creator-1.jpg", online: "Live now" },
  { name: "Nia", image: "/images/romantic-creator-2.jpg", online: "Audience waiting" },
  { name: "Ari", image: "/images/romantic-creator-3.jpg", online: "New content" },
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

const photoWall = [
  { name: "Mila", image: "/images/romantic-creator-1.jpg" },
  { name: "Nia", image: "/images/romantic-creator-2.jpg" },
  { name: "Ari", image: "/images/romantic-creator-3.jpg" },
  { name: "Date Night", image: "/images/romantic-gallery-1.jpg" },
  { name: "Lounge", image: "/images/romantic-gallery-2.jpg" },
  { name: "Sunset", image: "/images/romantic-gallery-3.jpg" },
];

const premiumScenes = [
  { title: "Neon After Dark", image: "/images/romantic-gallery-1.jpg" },
  { title: "Velvet Lounge", image: "/images/romantic-gallery-2.jpg" },
  { title: "Private Lounge", image: "/images/romantic-gallery-3.jpg" },
];

const footerNav = {
  explore: [
    { href: "/discover", label: "Discover" },
    { href: "/matches", label: "Matches" },
    { href: "/chat", label: "Chat" },
    { href: "/calls", label: "Calls" },
  ],
  trust: [
    { href: "/verify-age", label: "Age verification" },
    { href: "/safety", label: "Safety center" },
    { href: "/wallet", label: "Wallet and receipts" },
    { href: "/profile", label: "Account settings" },
  ],
};

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 text-white/85 transition hover:text-white"
    >
      <span className="h-1 w-1 rounded-full bg-white/35 transition group-hover:bg-accent-strong" />
      <span>{label}</span>
      <span className="text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/70">{"->"}</span>
    </Link>
  );
}

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
          <h1 className="editorial-title mt-4 text-4xl font-bold leading-tight sm:text-6xl lg:text-7xl">
            Build matches first.
            <br />
            Monetize intent second.
          </h1>
          <p className="app-subtitle mt-5 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8">
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
          <div className="mt-8 grid gap-2 text-sm text-white/85 sm:grid-cols-3">
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Free matched text chat</p>
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Tokenized media unlocks</p>
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Per-minute live calls</p>
          </div>
        </article>

        <article className="reveal-rise reveal-rise-delay-1 sexy-frame rounded-3xl p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            <Image
              src="/images/romantic-hero.jpg"
              alt="Romantic couple in city lights"
              width={1400}
              height={1000}
              className="h-56 w-full object-cover sm:h-64 lg:h-72"
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
                  className="h-44 w-full object-cover"
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
            <h2 className="mt-3 text-xl font-semibold">{pillar.title}</h2>
            <p className="mt-2 text-[15px] leading-7 text-text-muted">{pillar.copy}</p>
          </article>
        ))}
      </section>

      <section className="relative z-10 mx-auto mt-5 grid w-full max-w-6xl gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {launchSignals.map((signal) => (
          <article key={signal.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-center">
            <p className="text-[11px] uppercase tracking-[0.15em] text-white/55">{signal.label}</p>
            <p className="mt-1 text-base font-semibold text-accent-strong">{signal.value}</p>
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
            <Image src="/images/romantic-gallery-1.jpg" alt="Neon gallery preview" width={420} height={420} className="h-32 w-full rounded-xl object-cover sm:h-36" />
            <Image src="/images/romantic-gallery-2.jpg" alt="Lounge gallery preview" width={420} height={420} className="h-32 w-full rounded-xl object-cover sm:h-36" />
            <Image src="/images/romantic-gallery-3.jpg" alt="Sunset gallery preview" width={420} height={420} className="h-32 w-full rounded-xl object-cover sm:h-36" />
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
              <h3 className="mt-1 text-lg font-semibold">{step.name}</h3>
              <p className="mt-1 text-[15px] leading-6 text-text-muted">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-6 grid w-full max-w-6xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="app-surface reveal-rise rounded-3xl p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent-strong">Featured creators</p>
          <h3 className="mt-2 text-2xl font-semibold">Profile gallery</h3>
          <p className="mt-2 text-base leading-7 text-text-muted">More visual discovery so users can connect quickly with the vibe they prefer.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photoWall.map((photo) => (
              <div key={photo.name} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                <Image
                  src={photo.image}
                  alt={`${photo.name} profile card`}
                  width={420}
                  height={420}
                  className="h-36 w-full object-cover sm:h-40"
                />
                <p className="px-2.5 py-2 text-sm font-semibold text-white/85">{photo.name}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="app-surface reveal-rise reveal-rise-delay-1 rounded-3xl p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal">Premium visuals</p>
          <h3 className="mt-2 text-2xl font-semibold">High-intent experiences</h3>
          <p className="mt-2 text-base leading-7 text-text-muted">Showcase paid unlock moments with image-led previews that still keep pricing transparent.</p>
          <div className="mt-4 space-y-3">
            {premiumScenes.map((scene) => (
              <div key={scene.title} className="relative overflow-hidden rounded-2xl border border-white/10">
                <Image
                  src={scene.image}
                  alt={`${scene.title} preview`}
                  width={900}
                  height={520}
                  className="h-36 w-full object-cover sm:h-40"
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#070b13]/95 to-transparent px-3 py-2">
                  <p className="text-xs font-semibold text-white/90">{scene.title}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="relative z-10 mx-auto mt-8 w-full max-w-6xl rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent-strong">Launch-ready flow</p>
        <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Turn discovery into trusted premium interaction</h2>
        <p className="mx-auto mt-3 max-w-3xl text-base leading-7 text-text-muted sm:text-lg sm:leading-8">
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

      <footer className="relative z-10 mx-auto mt-8 w-full max-w-6xl rounded-3xl border border-white/10 bg-[#09111d]/80 p-6 sm:p-8">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <section>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent-strong">Hooked platform</p>
            <h3 className="mt-2 text-lg font-semibold">Built for conversation-first conversion</h3>
            <p className="mt-2 max-w-md text-sm text-text-muted">
              Hooked blends dating discovery with creator monetization using transparent token pricing, per-minute call billing, and enforced compliance gates.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <p className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-emerald-100">Age-gated premium surfaces</p>
              <p className="rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-sky-100">Session-auth protected APIs</p>
              <p className="rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1 text-orange-100">Audit-ready event trail</p>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">Explore</p>
            <nav className="mt-3 space-y-2 text-sm">
              {footerNav.explore.map((item) => (
                <FooterLink key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">Trust and billing</p>
            <nav className="mt-3 space-y-2 text-sm">
              {footerNav.trust.map((item) => (
                <FooterLink key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">Get started</p>
            <div className="mt-3 space-y-3">
              <Link href="/auth/sign-up" className="app-cta inline-flex rounded-full px-4 py-2 text-sm font-semibold">
                Create account
              </Link>
              <p className="text-sm text-text-muted">Already a member?</p>
              <Link href="/auth/sign-in" className="inline-flex rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40">
                Sign in
              </Link>
            </div>
          </section>
        </div>

        <div className="mt-8 border-t border-white/10 pt-4 text-xs text-white/55 sm:flex sm:items-center sm:justify-between">
          <div>
            <p>Hooked - Dating + Creator Platform</p>
            <p className="mt-1 text-[11px] text-white/45">Respectful interactions only. Premium features require verified access.</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:mt-0 sm:justify-end">
            <span className="text-white/45">Crafted by Siphesihle Nathan Vilane | Lx Obsidian Labs</span>
            <span className="text-white/30">|</span>
            <Link href="/safety" className="text-white/55 transition hover:text-white">Community standards</Link>
            <span className="text-white/30">|</span>
            <Link href="/wallet" className="text-white/55 transition hover:text-white">Billing transparency</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
