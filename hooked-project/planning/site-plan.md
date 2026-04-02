# Hooked Site Plan (Production-First)

## Product Intent
Build a production-ready web platform that combines:
- dating discovery,
- free text messaging between matches,
- paid media sharing (images/videos),
- paid one-on-one video calls billed per minute.

## Primary Outcome
Launch a compliance-first MVP that maximizes conversation volume with free text chat, then monetizes high-intent actions.

## Core Business Rules
- Matched users can send text messages for free.
- Sending or unlocking image/video in chat requires tokens.
- Private video calls require token balance and consume tokens per minute.
- Age verification is required before accessing adult/paid features.

## Audience
- Fans/users seeking dating + premium interaction features.
- Creators who monetize content and direct interactions.

## MVP Scope

### Included
- Auth and onboarding
- User profiles and swipe-to-match flow
- Free text messaging for matched users
- Token wallet and checkout
- Paid chat media (image/video)
- Creator profiles, subscriptions, and PPV content
- Per-minute private video calls
- Trust and safety baseline (report/block, moderation queue)
- Age verification and policy consent records

### Excluded (Post-MVP)
- AI digital twins/chatbots
- VR/AR features
- Advanced affiliate marketplace

## Information Architecture
1. Landing
2. Auth (Sign up / Sign in / Verification)
3. Onboarding (Profile + preferences)
4. Discover (Swipe)
5. Matches
6. Chat (Free text + paid media)
7. Creator Hub (Subscriptions, PPV, tips)
8. Wallet (Balance, top-up, receipts)
9. Calls (Per-minute sessions)
10. Safety Center (Report, block, support)
11. Settings (Privacy, consent, billing)
12. Admin/Moderation Console

## UX Principles
- Mobile-first layouts with clean desktop scaling.
- Fast path to first match and first free message.
- Monetization prompts only at value moments (media upload, call start, creator PPV).
- Transparent pricing before every paid action.
- Clear state handling for loading, empty, success, and error.

## Design Direction
- Minimal + bold + futuristic visual language.
- Strong typography hierarchy.
- Layered surfaces and subtle gradients for depth.
- High-contrast accessibility and readable spacing.

## Monetization Design
- Token bundles in clear tiers.
- Paid media prompts in chat composer.
- Creator-defined PPV and subscription pricing.
- Live call meter with real-time token consumption.
- Billing receipts for all paid actions.

## Compliance and Safety Requirements
- Third-party 18+ verification before adult/premium content.
- Moderation pipeline (AI triage + human review).
- Content reporting and user blocking tools.
- Immutable ledger/audit logs for financial events.
- Jurisdiction-based feature flags for legal controls.

## Technical Baseline
- Frontend: Next.js + React + Tailwind CSS
- Backend: Node.js APIs
- Database: PostgreSQL
- Realtime: chat/presence channels
- Payments: token purchase via processor webhooks
- Calls: provider SDK with per-minute metering

## Launch Readiness Gates
- Billing accuracy validated by reconciliation checks.
- Moderation SLA and incident workflow tested.
- Age verification flow stable and enforced.
- Chargeback and fraud thresholds under launch limits.
- End-to-end user flows pass QA on mobile and desktop.

## Success Metrics (MVP)
- Match-to-first-message conversion
- D7 retention for users who send first message
- Token payer conversion
- ARPPU from media and calls
- Moderation response time
- Chargeback and fraud-loss rates
