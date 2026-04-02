# Hooked MVP Backlog (Prioritized)

## Prioritization Method
- `P0`: required for compliant pilot launch
- `P1`: high-value enhancements for MVP stability and conversion
- `P2`: post-launch optimization

## Sprint Plan (Recommended)
- Sprint 1-2: foundation, onboarding, discover, matching
- Sprint 3-4: free messaging, wallet, checkout, receipts
- Sprint 5-6: paid media, creator monetization
- Sprint 7-8: age verification, moderation, safety console
- Sprint 9-10: per-minute calls, reconciliation, launch hardening

## Epic A - Core Platform and Discovery

### HKD-001 - Auth and Account Model (P0)
- Scope: signup/signin, session management, account status.
- Acceptance criteria:
  - Users can create accounts and sign in/out reliably.
  - Locked/suspended accounts cannot authenticate.
  - Session refresh and expiration work across devices.

### HKD-002 - Profile Service and Media Uploads (P0)
- Scope: profile CRUD and safe media upload pipeline.
- Acceptance criteria:
  - Users can create/edit profile details and photos.
  - Upload scan/moderation status is stored per file.
  - Invalid files are rejected with clear error messaging.

### HKD-003 - Swipe Feed API (P0)
- Scope: profile card feed with pagination and filters.
- Acceptance criteria:
  - Feed excludes blocked/reported users.
  - Pagination is deterministic and duplicate-safe.
  - P95 API response meets target under test load.

### HKD-004 - Match Engine (P0)
- Scope: like/dislike and mutual match creation.
- Acceptance criteria:
  - Mutual likes create exactly one match record.
  - Retries are idempotent and do not duplicate matches.
  - Match events are emitted to analytics.

## Epic B - Messaging and Social Safety

### HKD-005 - Free Matched Text Messaging (P0)
- Scope: realtime text chat for matched users.
- Acceptance criteria:
  - Matched users can send text without token deduction.
  - Unmatched users cannot use standard free text channel.
  - Delivery status and unread counts update in realtime.

### HKD-006 - Report and Block Tools (P0)
- Scope: user safety controls in profile/chat.
- Acceptance criteria:
  - User blocks immediately remove discovery and chat access.
  - Reports create moderation cases with reporter context.
  - Safety actions are auditable.

### HKD-007 - Anti-Spam and Message Rate Limits (P1)
- Scope: abuse prevention for free text chat.
- Acceptance criteria:
  - Message bursts beyond threshold are throttled.
  - Repeat abuse patterns are flagged for moderation.
  - False-positive rate stays within agreed tolerance.

## Epic C - Wallet, Ledger, and Billing

### HKD-008 - Double-Entry Token Ledger (P0)
- Scope: immutable financial transaction backbone.
- Acceptance criteria:
  - Every entry balances with debit/credit pairing.
  - Transaction types include purchase, hold, consume, release, refund.
  - Ledger query supports audit by user and time range.

### HKD-009 - Wallet API (P0)
- Scope: balance, held funds, and spend authorization.
- Acceptance criteria:
  - API returns available and held token balances.
  - Concurrent spends cannot overdraw available balance.
  - Insufficient-balance responses are consistent and user-friendly.

### HKD-010 - Token Checkout and Webhooks (P0)
- Scope: token bundle purchases via processor.
- Acceptance criteria:
  - Successful payment credits wallet exactly once.
  - Webhook retries are idempotent.
  - Failed/abandoned payments do not credit tokens.

### HKD-011 - Receipts and Billing History (P0)
- Scope: user billing visibility.
- Acceptance criteria:
  - Every paid action has a receipt record.
  - Users can view transaction history by date/action.
  - Billing data matches ledger totals.

## Epic D - Paid Media and Creator Monetization

### HKD-012 - Paid DM Media (Image/Video) (P0)
- Scope: charge for sending/unlocking media in chat.
- Acceptance criteria:
  - Text remains free; image/video requires tokens.
  - Media send/unlock succeeds only after successful debit.
  - Failed debit prevents media access and returns clear UX feedback.

### HKD-013 - Creator Onboarding and Verification States (P0)
- Scope: creator account lifecycle.
- Acceptance criteria:
  - Creator states tracked: pending, verified, rejected.
  - State transitions store actor, timestamp, reason.
  - Rejected creators receive actionable remediation guidance.

### HKD-014 - Creator Subscriptions and Entitlements (P1)
- Scope: paid creator subscription tiers.
- Acceptance criteria:
  - Subscribe/unsubscribe flow updates access instantly.
  - Expired subscriptions remove entitlements correctly.
  - Access checks are enforced server-side.

### HKD-015 - PPV Content Unlocks (P1)
- Scope: creator-set PPV photos/videos.
- Acceptance criteria:
  - Unlock is atomic with token debit.
  - Unlocked content remains accessible to buyer.
  - Creator earnings entries are written on successful unlock.

### HKD-016 - Tips and Virtual Gifts (P1)
- Scope: discretionary fan spend.
- Acceptance criteria:
  - Tip/gift debits fan and credits creator earnings ledger.
  - Failed payment leaves both balances unchanged.
  - Tip events appear in creator analytics.

### HKD-017 - Creator Earnings Dashboard (P1)
- Scope: creator financial visibility.
- Acceptance criteria:
  - Dashboard shows daily/weekly/monthly earnings.
  - Top spenders and conversion signals are available.
  - Figures reconcile with ledger within tolerance.

### HKD-018 - Payout Engine and Reserve Holds (P0)
- Scope: creator payouts and risk reserve.
- Acceptance criteria:
  - Payout batches generate accurately on schedule.
  - Reserve hold logic applies by risk policy.
  - Paid-out amounts are immutable and auditable.

## Epic E - Calls and Metered Billing

### HKD-019 - Per-Minute Private Calls (P0)
- Scope: one-on-one video calls with meter.
- Acceptance criteria:
  - Call start requires token pre-authorization hold.
  - Session timer and spend meter update during call.
  - Call ends gracefully when balance is insufficient.

### HKD-020 - Session Reconciliation and Hold Release (P0)
- Scope: correctness of call billing.
- Acceptance criteria:
  - Stuck sessions auto-close by timeout policy.
  - Unused holds are released promptly after session end.
  - Reconciliation report highlights all mismatches.

## Epic F - Compliance, Trust, and Moderation

### HKD-021 - Age Verification Integration (P0)
- Scope: 18+ verification gate.
- Acceptance criteria:
  - Adult/premium features blocked until verification passes.
  - Verification outcomes and retries are tracked.
  - Failed verification states have clear user guidance.

### HKD-022 - Policy Consent Versioning (P0)
- Scope: legal acceptance records.
- Acceptance criteria:
  - Policy version and timestamp captured per user.
  - Updated policies can trigger mandatory re-consent.
  - Consent records are queryable for audits.

### HKD-023 - Moderation Queue (AI + Human) (P0)
- Scope: content/user safety review workflow.
- Acceptance criteria:
  - Flagged content creates prioritized moderation jobs.
  - Reviewer actions update content visibility immediately.
  - SLA breach alerts trigger notifications.

### HKD-024 - Admin Safety Console (P1)
- Scope: internal tooling for trust operations.
- Acceptance criteria:
  - Moderators can triage, action, and annotate cases.
  - Case history is immutable and searchable.
  - Role-based access control protects sensitive actions.

## Epic G - Observability and Launch Controls

### HKD-025 - Analytics Event Pipeline (P0)
- Scope: KPI instrumentation.
- Acceptance criteria:
  - Required funnel events emitted with schema validation.
  - Event payloads avoid restricted PII.
  - Dashboard-ready data available within target latency.

### HKD-026 - Risk Rules Engine v1 (P0)
- Scope: payment and abuse anomaly detection.
- Acceptance criteria:
  - Velocity/device anomalies produce risk flags.
  - High-risk accounts are blocked from payout.
  - Rule actions are explainable in audit logs.

### HKD-027 - Alerts and Service Observability (P1)
- Scope: operational reliability.
- Acceptance criteria:
  - Critical alerts for webhook failures, moderation backlog, call billing errors.
  - On-call runbook links are attached to alerts.
  - MTTR metrics are measurable in dashboards.

### HKD-028 - Feature Flags and Geo Controls (P0)
- Scope: safe rollout and jurisdiction controls.
- Acceptance criteria:
  - Features can be enabled/disabled by environment and region.
  - Emergency kill switch works without redeploy.
  - Flag changes are logged with actor and timestamp.

## Definition of Done (MVP Ticket Level)
- Code merged with tests for core behavior.
- Security/privacy checks completed for touched surfaces.
- Analytics events emitted for key user actions.
- UX states included: loading, empty, success, error.
- Documentation updated for API/schema/ops changes.

## MVP Launch Minimum Set
- Must ship all `P0` items.
- `P1` items can be split into pre-launch vs immediate post-launch.
- `P2` items remain out of scope until pilot metrics are stable.
