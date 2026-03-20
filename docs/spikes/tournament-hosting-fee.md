# Spike: Tournament Hosting Fee

> Written March 2026. Explores what it would take to charge fishing clubs and organizations a flat fee to run their tournament on FishLeague infrastructure.

---

## What It Is

Fishing clubs, bass clubs, kayak leagues, and charity events pay FishLeague a flat fee to run their tournament on the platform. They get the full TOURNAMENT_ADMIN infrastructure already built — moderation queue, GPS validation, QR check-in, leaderboard, AI fraud detection, social feed. They bring their own participants and prize pool.

---

## Current State (what already exists)

- `TOURNAMENT_ADMIN` role fully built — scoped admin panel, moderation, leaderboard
- Tournament director request flow — anglers can request the role, admin approves
- Admin creates tournaments manually with full config (entry fee, scoring method, region, dates, banner, description, director)
- `TournamentAdminRequest` model tracks requests with message field

Almost everything needed is already built. The gap is: there is no way for an **external organization** (not an existing user) to discover, request, and pay for tournament hosting.

---

## What's Missing

1. **Discovery surface** — nowhere for a club to learn this exists or sign up
2. **Payment** — no mechanism to charge the hosting fee
3. **Account provisioning** — club needs a TOURNAMENT_ADMIN account created for them
4. **Hosting request tracking** — separate from the existing `TournamentAdminRequest` (that's for existing users requesting a role, not external orgs paying for a service)

---

## Two Implementation Paths

### Path A — Manual/Sales MVP (1–2 days, zero new infrastructure)

Add a "Host a Tournament" section to the web. Simple contact form: club name, contact name, email, desired date/region, expected participants, message. Submits to admin via email. Admin handles payment manually (Stripe invoice, Venmo, check). Admin creates the tournament and TOURNAMENT_ADMIN account through the existing admin panel.

**Pros:** Ships immediately. Zero schema changes. Zero Stripe integration. Lets you close first 3–5 deals and validate pricing before building self-serve.

**Cons:** Doesn't scale past ~10/month without becoming a burden.

---

### Path B — Self-Serve with Stripe (1–2 weeks)

Add a `HostingRequest` model, a web flow where clubs configure their tournament and pay via Stripe, and automated provisioning on payment confirmation.

**Schema additions needed:**

```prisma
model HostingRequest {
  id                      String    @id @default(uuid())
  orgName                 String
  contactName             String
  contactEmail            String
  contactPhone            String?
  desiredStartAt          DateTime
  regionId                String
  expectedAnglers         Int?
  message                 String?
  status                  String    // PENDING | PAID | PROVISIONED | REJECTED
  stripeSessionId         String?
  feeCents                Int
  createdAt               DateTime  @default(now())
  provisionedTournamentId String?
  provisionedUserId       String?
}
```

**Flow:**

1. Club fills out tournament config form on `/host` page
2. Redirected to Stripe Checkout for hosting fee
3. On `checkout.session.completed` webhook: `HostingRequest.status → PAID`, admin gets notification
4. Admin reviews in new `/admin/hosting-requests` page, clicks "Provision" — creates Tournament + TOURNAMENT_ADMIN user, sends credentials email to contact
5. `HostingRequest.status → PROVISIONED`

**Pros:** Scales, automated, no manual billing.

**Cons:** Requires Stripe — but Stripe is already needed for entry fees, so Path B becomes a 2-day add-on once that integration exists.

---

## Recommendation

**Ship Path A now, build Path B alongside Stripe entry fees.**

Path A is a landing page and a contact form — it can go live this week. First deal validates the pricing model. By the time you have 5 paying clubs you'll know exactly what to automate, and Stripe will already be integrated for entry fees so Path B becomes a small extension.

---

## Suggested Pricing

| Tier | Price | What they get |
|---|---|---|
| Single event | $99 | One tournament, up to 100 anglers |
| Club season | $299 | 4 tournaments, same director account |
| League | $599 | Unlimited tournaments, custom region bounds |

FishAngler charges nothing for this because they don't offer it. No pricing pressure — start at $99 and adjust based on feedback.

---

## Effort Summary

| Path | Backend | Frontend | Total |
|---|---|---|---|
| A (manual) | 0 | 1 day (web landing page + contact form) | 1 day |
| B (self-serve) | 3 days (HostingRequest model, Stripe webhook, provision endpoint, admin UI) | 2 days (web `/host` flow, admin hosting requests page) | ~1 week |
