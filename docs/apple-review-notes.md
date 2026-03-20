# Apple App Store Review Notes — FishLeague

> Reference doc for App Store Connect submission fields, reviewer notes, and edge cases that may trigger review questions.

---

## App Description (for App Store Connect)

**Name:** FishLeague

**Subtitle:** Competitive Fishing Tournaments

**Description:**
FishLeague is a competitive fishing tournament platform where anglers enter structured tournaments, submit verified catch photos, and compete on live leaderboards.

Anglers photograph their catch next to a measuring device, submit with GPS location, and a human moderation team reviews every submission before it appears on the leaderboard. AI-assisted fraud detection flags suspect photos, length mismatches, and duplicate submissions.

Features:
- Browse and enter active fishing tournaments
- Submit catch photos with GPS verification
- AI species identification — automatically suggests the fish species from your photo
- Live leaderboard updated in real time
- Tournament social feed — announcements, catch posts, check-ins
- Public angler profiles with career stats
- Conservation mode — mark catches as released

**Category:** Sports

**Age Rating:** 17+ (Frequent/Intense Realistic Violence: No — set to 4+, but see Payment section below for gambling flag consideration)

---

## Demo Account for Reviewers

Provide these credentials in App Store Connect → App Review Information:

| Field | Value |
|---|---|
| Username / Email | `isles4life+1@gmail.com` |
| Password | *(set a known password before submission)* |
| Notes | Test angler account. A tournament should be in OPEN status for the reviewer to test submission flow. Create one in the admin panel before submitting for review. |

**Before submitting:** ensure at least one tournament is OPEN with `entryFeeCents = 0` (free entry) so the reviewer can complete the full submission flow without a payment step.

---

## Permissions — Justification for Each

### Camera — `NSCameraUsageDescription`
> "Take a photo of your catch and scan the mat QR code"

**Why needed:** Anglers must photograph their catch with a measuring device visible in frame. This is the core submission mechanic — photo evidence is required for every tournament entry. Reviewers scanning the QR code on a measuring mat also uses the camera.

### Photo Library — `NSPhotoLibraryUsageDescription`
> "Choose a photo of your catch to submit to the tournament"

**Why needed:** Anglers may have already taken a photo before opening the app (e.g. with their native camera). The submission flow allows selecting from the photo library as an alternative to taking a new photo in-app. Also used when attaching photos to tournament feed posts.

### Location — `NSLocationWhenInUseUsageDescription`
> "Verify you are fishing at an approved location"

**Why needed:** GPS coordinates are captured at submission time and validated server-side against the tournament's geographic region. This prevents anglers from submitting catches from outside the designated fishing area. Location is only requested when the angler initiates a submission — it is never tracked in the background.

---

## Payment / Entry Fees — Reviewer Notes

FishLeague charges entry fees for some tournaments using **Stripe** (not Apple In-App Purchase).

**Justification:** Tournament entry fees are fees for participation in a real-world sporting event — the same model used by golf tournaments, bowling leagues, and fishing derbies. The fee entitles the angler to participate in a physical fishing competition that takes place outdoors. No digital goods, virtual currency, or in-app content is purchased. This is equivalent to paying a registration fee for a 5K race.

**Precedent:** Fantasy sports apps (DraftKings, FanDuel, Yahoo Fantasy with real money), fishing tournament apps (iAngler Tournament), and sporting event apps use third-party payment processors for real-world event entry fees under the same rationale.

**What the reviewer will see:**
- Free tournaments: "🎣 Submit a Catch" button — tapping goes directly to catch submission, no payment involved
- Paid tournaments: "💳 Enter Tournament · $X.XX" button — tapping opens a Stripe payment sheet
- For review purposes, set the active test tournament to `entryFeeCents = 0` (free) so the reviewer can test the full flow without a payment step

**If Apple requires IAP for entry fees:** The payment can be moved to a web-based checkout flow outside the app (anglers pay at fishleague.app and receive a code to enter in-app). This is a known fallback used by other apps that faced similar review questions.

---

## User-Generated Content

FishLeague allows users to:
- Submit catch photos (reviewed by human moderators before appearing on leaderboard)
- Post text, photos, and GIFs in tournament social feeds
- Comment on other anglers' catches
- View public angler profiles

**Moderation:** Every catch submission is reviewed by a human admin before it appears on the public leaderboard. AI fraud detection flags suspect photos (no fish detected, length mismatch, duplicate images) to assist moderators. Anglers can be warned, suspended, or banned by admins. A warning system (MINOR / MAJOR / FINAL) is in place.

**Content policy:** The app's Terms of Service prohibit abusive, obscene, or illegal content. Admin moderation tools include suspension, warnings, and content removal.

---

## Sign In with Apple

The app implements Sign In with Apple (`expo-apple-authentication`). This is the primary sign-in method on iOS alongside email/password.

- Apple Sign-In users cannot set a password (password reset is blocked for Apple auth accounts in the admin panel)
- The app requests name and email on first sign-in only
- No Apple credentials are stored — only the `appleId` sub claim and display name

---

## Network / Backend Dependency

The app requires an active internet connection. All data is served from `https://api.fishleague.app` (AWS ECS, us-east-1).

The reviewer will need connectivity to:
- Log in / create a profile
- Browse tournaments
- Submit a catch (requires camera + GPS + backend validation)
- View leaderboard

There is no offline mode beyond a catch submission queue that retries failed uploads.

---

## AI Features Disclosure

FishLeague uses AI in two places:

1. **Species identification (iNaturalist)** — when a photo is captured, iNaturalist's computer vision API suggests the fish species with a confidence percentage. The angler sees the suggestion and can accept or override it. This is clearly labeled as an AI suggestion in the UI.

2. **Fraud detection (Google Gemini + iNaturalist)** — after submission, AI checks whether the photo contains a fish and estimates the fish length from the measuring device in the photo. These flags are reviewed by human moderators, not used for automatic rejection.

Neither AI system makes autonomous decisions about users. All moderation decisions are made by humans.

---

## What's Not in This Version (MVP Scope)

- No in-app chat or direct messaging
- No Android version (iOS only)
- No social login other than Apple Sign-In and email/password
- Entry fee payouts are manual (admin pays winners outside the app)
- No subscription tier yet

---

## Potential Review Flags — Pre-emptive Notes

| Flag | Response |
|---|---|
| Real money entry fees not using IAP | Sporting event entry fee for real-world competition — not a digital good. See Payment section above. |
| Camera permission | Required for catch photo submission — the core feature of the app |
| Location permission | GPS validation against tournament region — prevents location fraud |
| User-generated photos | All catch photos are moderated by humans before appearing publicly |
| Age rating / gambling | This is a skill-based sporting competition, not a game of chance. No random outcomes. |
| Stripe payment sheet | Third-party payment for real-world sporting event entry — same model as race registration apps |
