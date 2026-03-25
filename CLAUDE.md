# FishLeague – Claude Context

> **ALWAYS DO AT END OF EVERY SESSION:** Update the `## Current Status` section of this file to reflect what changed, then `git add CLAUDE.md && git commit -m "Update CLAUDE.md" && git push`. No exceptions.

## Project Overview
Competitive fishing league app (6-week MVP). Anglers submit catch photos with GPS + fish length, admin moderates, leaderboard ranks by length. Single region validation for MVP.

## Owner / Accounts
- Admin account: `isles4life@gmail.com`
- Test angler account: `isles4life+1@gmail.com`
- GitHub repo: `isles4life/Fishapp`
- Apple developer / App Store Connect app ID: `6760669599`

## Environment
- OS: Windows 11, shell is Git Bash
- **CRITICAL**: Always prefix AWS CLI commands with `MSYS_NO_PATHCONV=1` — Git Bash mangles paths starting with `/` (e.g. `/ecs/...` becomes `C:/Program Files/Git/ecs/...`)
- Working directory: `c:/Users/cable/OneDrive/Desktop/dev/FishAPP`

## Stack
- **Mobile**: React Native (Expo), `mobile/` — iOS only, bundle ID `app.fishleague`
- **Web**: Next.js 14 App Router, `web/` — public leaderboard + angler profiles
- **Admin**: Next.js 14 App Router, `admin/` — moderation, tournaments, users, history
- **Backend**: NestJS + Prisma + PostgreSQL, `backend/` — REST API port 3000
- **Infra**: Docker Compose locally; AWS ECS + RDS (PostgreSQL) + S3 in production
- **CI/CD**: `.github/workflows/deploy.yml` — push to `master` auto-deploys backend + admin + web to ECS (~5–10 min). Mobile requires a manual EAS build.

## Local Development
```bash
docker-compose up        # starts Postgres + backend (3000) + admin (3001)
cd backend && npm run build   # always run after schema changes (needs prisma generate first)
cd mobile && npx expo start   # start Expo dev server
```

## Architecture Decisions
- No Redis for MVP — single Postgres, leaderboard recomputed on every approval (fine at ~300 users)
- Fish length stored in **cm** in DB (`fishLengthCm`), displayed in **inches** everywhere in UI (`inches = cm / 2.54`)
- Submission input on mobile accepts inches → converts to cm before API call
- Image dedup via MD5 hash — flags only, human moderation required (no auto-reject)
- GPS bounding box validation server-side against **tournament's region** (not user's region — users no longer have a fixed region assignment; GPS at submission time determines eligibility)
- S3 bucket is **private** — backend generates presigned URLs (1hr expiry) for photo access
- Apple Sign-In on mobile; email/password on all platforms; no Google/Facebook yet
- Admin auth: email/password only, JWT checked for `role === ADMIN` or `role === TOURNAMENT_ADMIN`; TOURNAMENT_ADMIN users see a scoped admin panel filtered to their assigned tournament(s)
- Mat serial (QR code) reuse prevention: server checks matSerialId + tournamentId + userId uniqueness
- Weekly tournament reset: cron closes at Sunday 23:59 UTC; admin manually creates next week's tournament
- Push notifications: Expo push service, `pushToken` stored on `User`, `PushService` in backend
- Email notifications: `EmailService` in backend — sends on submission approved/rejected/suspended

## Key Files
### Backend
- `backend/prisma/schema.prisma` — DB schema (source of truth)
- `backend/src/auth/auth.service.ts` — email + Apple login, JWT signing
- `backend/src/submissions/submissions.service.ts` — submission validation, GPS check, hash dedup, S3 upload
- `backend/src/submissions/s3.service.ts` — S3 upload + presigned URL generation
- `backend/src/moderation/moderation.service.ts` — moderation queue, approve/reject/flag, bulk actions
- `backend/src/moderation/moderation.controller.ts` — admin moderation endpoints
- `backend/src/leaderboard/leaderboard.service.ts` — ranking engine + WebSocket broadcast
- `backend/src/websocket/leaderboard.gateway.ts` — Socket.IO gateway
- `backend/src/leaderboard/weekly-reset.service.ts` — Sunday 23:59 UTC cron
- `backend/src/profile/profile.service.ts` — angler profile upsert
- `backend/src/audit/audit.service.ts` — audit log writes
- `backend/src/push/push.service.ts` — Expo push notifications
- `backend/src/email/email.service.ts` — transactional emails
- `backend/src/tournament-admin/tournament-admin.service.ts` — request/approve/reject tournament director role
- `backend/src/common/tournament-scoped.guard.ts` — guard allowing ADMIN or TOURNAMENT_ADMIN

### Mobile
- `mobile/src/navigation/index.tsx` — tab + stack nav (uses `TournamentScreen`, NOT `TournamentHomeScreen`)
- `mobile/src/screens/Tournament/TournamentScreen.tsx` — active Tournaments tab (the one wired to nav)
- `mobile/src/screens/Submission/SubmissionFlowScreen.tsx` — catch submission: photo → measure → details → upload
- `mobile/src/screens/Profile/ProfileScreen.tsx` — profile view + edit form
- `mobile/src/screens/Leaderboard/LeaderboardScreen.tsx` — leaderboard with props/comments
- `mobile/src/services/api.ts` — mobile API client
- `mobile/src/services/submissionQueue.ts` — offline queue for failed submissions

### Admin
- `admin/src/app/moderation/page.tsx` — submission queue with photo review panel
- `admin/src/app/history/page.tsx` — two tabs: Audit Log + Submissions history
- `admin/src/app/leaderboard/page.tsx` — admin leaderboard view
- `admin/src/app/tournaments/page.tsx` — tournament management
- `admin/src/app/users/page.tsx` — user management (role, suspend, region, warnings, impersonate)
- `admin/src/app/requests/page.tsx` — tournament director request approval queue (ADMIN only)
- `admin/src/lib/api.ts` — admin API client
- `admin/src/components/AuthProvider.tsx` — admin login; supports ADMIN + TOURNAMENT_ADMIN; exposes `isAdmin`, `isTournamentAdmin`, `assignedTournamentIds`

### Web
- `web/src/app/page.tsx` — public home / leaderboard feed
- `web/src/app/profile/page.tsx` — angler profile edit
- `web/src/app/profile/[username]/page.tsx` — public angler profile

## API Endpoints (key ones)
- `POST /auth/login` — email login
- `POST /auth/apple` — Apple Sign-In
- `POST /auth/register` — email registration
- `GET /tournaments` — list tournaments
- `POST /submissions` — submit catch (multipart form: photo + GPS + length in cm)
- `POST /submissions/identify` — AI species ID via iNaturalist (authenticated, returns top 3 fish suggestions with confidence %)
- `GET /submissions/mine?tournamentId=` — user's own submissions
- `GET /leaderboard/:tournamentId` — leaderboard entries
- `POST /submissions/:id/prop` — toggle prop; `GET /submissions/:id/props` — count + userHasPropped; `GET /submissions/:id/props/who` — list of proppers with presigned avatars
- `GET/POST /submissions/:id/comments` — catch comments; each comment includes `propCount` + `userHasPropped`
- `POST /comments/:id/prop` — toggle prop (like) on a catch comment; returns `{ propCount, userHasPropped }`
- `POST /tournaments/posts/comments/:id/prop` — toggle prop on a tournament post comment
- `POST /tournaments/:id/entry/intent` — Stripe PaymentIntent for entry fee; `GET /tournaments/:id/entry/me` — own entry status
- `GET /tournaments/:id/feed` — tournament social feed (cursor-paginated); `POST /tournaments/:id/posts` — post to feed
- `PATCH /tournaments/posts/:postId` — edit post; `DELETE /tournaments/posts/:postId` — delete post
- `GET/POST /tournaments/posts/:postId/comments` — feed post comments; `DELETE /tournaments/posts/comments/:commentId` — delete comment
- `POST /webhooks/stripe` — Stripe webhook handler (raw body, no auth guard)
- `GET /admin/moderation/pending` — pending submissions queue
- `POST /admin/moderation/:id/action` — approve/reject/flag
- `POST /admin/moderation/bulk` — bulk moderate
- `GET /admin/moderation/submissions` — all submissions (filterable by status/tournament)
- `GET /admin/audit` — audit log
- `PUT /profile/me` — update angler profile
- `GET /profile/:username` — public profile
- `POST /tournament-admin/request` — angler requests tournament director role (body: tournamentId, message?)
- `GET /tournament-admin/my-requests` — angler's own requests + status
- `GET /tournament-admin/my-tournaments` — tournament admin's assigned tournament IDs (used by admin panel)
- `GET /admin/tournament-admin/requests` — admin: all pending requests
- `PATCH /admin/tournament-admin/requests/:id/approve` — approve request, sets user role to TOURNAMENT_ADMIN
- `PATCH /admin/tournament-admin/requests/:id/reject` — reject request (body: note?)

## AWS Infrastructure
- Region: `us-east-1`
- ECS cluster: `fishleague`
- ECS services: `fishleague-backend`, `fishleague-admin`, `fishleague-web`
- Log groups: `/ecs/fishleague/backend`, `/ecs/fishleague/admin`
- S3 bucket: `fishleague-submissions-production` (private)
- RDS: private VPC, not publicly accessible

### Viewing production logs
```bash
MSYS_NO_PATHCONV=1 aws logs describe-log-streams \
  --log-group-name '/ecs/fishleague/backend' \
  --order-by LastEventTime --descending --max-items 1

MSYS_NO_PATHCONV=1 aws logs get-log-events \
  --log-group-name '/ecs/fishleague/backend' \
  --log-stream-name 'ecs/backend/<stream-id>' \
  --limit 80 --query "events[*].message" --output text
```

### Running psql against production RDS
RDS is in a private VPC with no public access. Use a one-off ECS Fargate task:
- Task definition: `fishleague-psql:1` (uses `postgres:15-alpine` image, DATABASE_URL secret injected)
- Run via ECS console or CLI with `--launch-type FARGATE` and VPC/subnet config matching the backend service
- Past use cases: dropping NOT NULL constraints that baselined migrations missed, widening GPS region bounds

## DB Schema — Key Models
- `User` — id, email, passwordHash, appleId, role (USER/ADMIN/TOURNAMENT_ADMIN), suspended, regionId, pushToken, authProvider (EMAIL|APPLE)
- `TournamentAdminRequest` — userId, tournamentId, status (PENDING/APPROVED/REJECTED), message?, reviewedById?, reviewedAt — tracks requests from anglers to become tournament directors
- `AnglerProfile` — userId, username, bio, birthday (DateTime!), favoriteTechniques[], favoriteBaits[], sponsorTags[], homeState, homeCity, country, zipCode, profilePhotoUrl, publicProfile, allowFollowers
- `Region` — name, minLat, maxLat, minLng, maxLng (Southeast bounds currently widened to cover continental US: lat 24–50, lng -125 to -66)
- `Tournament` — name, status (DRAFT/OPEN/CLOSED), regionId, weekNumber, year, entryFeeCents, scoringMethod (LENGTH/WEIGHT/FISH_COUNT/SPECIES_COUNT, default LENGTH)
- `Submission` — fishLengthCm, gpsLat, gpsLng, photo1Key, photo2Key (S3 keys), imageHash1, matSerialId (nullable), status (PENDING/APPROVED/REJECTED/FLAGGED), flagDuplicateHash, flagDuplicateGps, flagSuspectPhoto, flagSuspectLength, estimatedLengthCm (Float?), released, speciesName, userId, tournamentId
- `LeaderboardEntry` — rank, submissionId, userId, tournamentId
- `ModerationAction` — submissionId, moderatorId, actionType, note
- `AuditLog` — action, actorName, targetId, details (JSON), createdAt
- `Warning` — userId, level (MINOR/MAJOR/FINAL), reason, createdAt
- `AuthProvider` enum: EMAIL | APPLE

## Mobile Build & Release
- EAS project ID: `692c9886-3f70-4b06-a9b7-78b9d3f65411`
- Build for TestFlight: `cd mobile && eas build --platform ios --profile production`
- Do NOT use `--profile preview` non-interactively — it uses internal distribution and needs interactive credential setup
- After build completes, go to App Store Connect → TestFlight → add build to external group manually
- Backend/admin/web changes deploy automatically on push; mobile always needs a new EAS build

## Known Gotchas & Bugs Fixed
- **S3 ACL disabled** — bucket has Object Ownership: Bucket owner enforced; never pass `ACL: 'public-read'` to `uploadBuffer` (causes `InvalidBucketAclWithObjectOwnership` 500). All files are private; use `getPresignedUrl()` to serve them. Use `resolveProfilePhotoUrl()` in S3Service for profile photo fields.
- **profilePhotoUrl stores S3 key** — since avatar fix, `AnglerProfile.profilePhotoUrl` stores the S3 key (e.g. `avatars/userId.jpg`), not a public URL. Always call `s3.resolveProfilePhotoUrl()` before returning it in any API response.
- **MSYS_NO_PATHCONV=1** — must prefix every AWS CLI command in Git Bash on Windows
- **Prisma DateTime** — rejects date-only strings like `"2001-08-08"`; must use `new Date("2001-08-08T00:00:00.000Z")`
- **Prisma generate** — run `npx prisma generate` before `npm run build` whenever schema changes
- **TournamentScreen vs TournamentHomeScreen** — nav uses `TournamentScreen.tsx`; `TournamentHomeScreen.tsx` is not wired up
- **Status enum case** — backend returns uppercase (`APPROVED`, `REJECTED`, `PENDING`, `FLAGGED`); all UI comparisons must be uppercase
- **Comma in array fields** — profile comma-separated fields (techniques, baits, tags) must NOT call `filter(Boolean)` on every keystroke or the comma gets eaten; filter only on save
- **FormData number coercion** — multipart form submissions send all values as strings; use `@Type(() => Number)` from class-transformer on DTO numeric fields
- **FormData boolean coercion** — booleans from FormData arrive as `'true'`/`'false'` strings; use `@Transform(({ value }) => value === true || value === 'true')` before `@IsBoolean()`
- **matSerialId nullable** — migration `20260314000000_mat_free_submissions` was baselined (not run); constraints dropped directly via psql ECS task
- **S3 presigned URLs** — S3 bucket is private; admin moderation photos use presigned URLs from backend, not public URLs
- **Birthday on profile save** — mobile `BirthdayPicker` correctly calls `.toISOString()`, but web `<input type="date">` sends `YYYY-MM-DD`; backend converts with `new Date(\`${birthday}T00:00:00.000Z\`)`
- **GPS bounds** — Southeast region bounds were widened in DB directly to cover test locations outside original bounds

## Admin Features
- Moderation queue: view pending submissions with photos (presigned URLs), approve/reject/flag individually or in bulk. AI fraud flags: `🤖 No Fish Detected`, `🤖 Length Mismatch` (submitted vs AI estimated inches), `🤖 Species Mismatch` (submitted vs AI identified species)
- Submissions history: all submissions filterable by status (ALL/PENDING/APPROVED/REJECTED/FLAGGED)
- Audit log: all admin actions logged with actor, target, details
- Tournament management: create (DRAFT), open, close tournaments; broadcast announcements 📢; prize random draw 🎁; generate QR check-in code 📱
- User management: change role (USER/ADMIN/TOURNAMENT_ADMIN), suspend/unsuspend, change region, reset password, impersonate, issue warnings (MINOR/MAJOR/FINAL)
- Leaderboard: view current rankings per tournament
- **Tournament Director Requests** (`/requests`): admin-only queue to approve/reject angler requests to become tournament directors. On approve: user role set to TOURNAMENT_ADMIN, push notification sent.

## Tournament Admin (TOURNAMENT_ADMIN) Role
- Anglers request the role from Profile → "Tournament Director" section on mobile; select a tournament + optional message
- Admin reviews at `/requests` in the admin panel — approve or reject with optional note
- On approval: user's role immediately becomes TOURNAMENT_ADMIN (JWT strategy fetches live from DB — no re-login needed)
- TOURNAMENT_ADMIN logs into the admin panel with email/password (same login screen)
- Scoped view: sees only their assigned tournament(s) in Moderation, Tournaments, Leaderboard, History
- Cannot access: Users page, Requests page, Create Tournament form
- Nav label reads "TOURNAMENT DIRECTOR" instead of "ADMIN"
- Scope enforcement: `TournamentScopedGuard` on moderation endpoints; each endpoint checks `req.user.role` and filters to `getAssignedTournamentIds(userId)` for TOURNAMENT_ADMIN

## Submission Flow (end-to-end)
1. Mobile captures photo (camera or upload from camera roll), gets GPS location
2. **AI species ID fires in background** (iNaturalist `POST /submissions/identify`) immediately after photo capture
3. Angler reads length from measuring device (mat, ruler, or tape) visible in photo and types it in inches — photo shown full-screen for reference; no credit card required
4. App converts inches to cm for API call
5. Species step shows 🤖 AI suggested chips with confidence % — auto-selects if ≥70% confident
6. Backend validates: GPS inside region bounds, mat serial not reused, photo hash not duplicate
7. Photo uploaded to S3 (`photo1Key` optional, `photo2Key` = fish with measuring device)
8. Submission created with status `PENDING`
9. **AI fraud checks fire in background** (fire-and-forget, never block submission):
   - iNaturalist checks photo2 for fish — sets `flagSuspectPhoto` if no fish found
   - iNaturalist top species vs submitted species (≥60% confidence) — sets `flagSuspectSpecies` + `aiSuggestedSpecies` if mismatch
   - Gemini 2.0 Flash reads mat/ruler/tape in photo2 — sets `flagSuspectLength` + `estimatedLengthCm` if >30% discrepancy
10. Admin reviews in moderation queue (photos via presigned URLs); sees AI fraud flags
11. On approve: leaderboard updated, push notification + email sent to angler
12. On reject: push notification + email sent with note

## Post-Beta Backlog
1. **Email verification**: add `emailVerified` + `verificationToken` to User, send confirmation email on register, `GET /auth/verify-email?token=xxx`, block unverified users from submitting.
2. **Stripe entry fees**: Stripe account, payment sheet in mobile, webhook handling, payout logic. First beta tournament free (`entryFeeCents: 0`).
3. **Facebook Sign-In** (mobile + web only, skip admin): add `facebookId` to User + `FACEBOOK` to AuthProvider enum, `POST /auth/facebook` via Graph API token verification, `expo-auth-session` on mobile, OAuth redirect on web. Requires Facebook App Review (~1 day code, 1–5 days review).
4. **ARKit LiDAR fish measurement**: Replace credit card measure with tap-to-measure AR on LiDAR iPhones (12 Pro+). Use ViroReact (Expo-compatible, maintained by ReactVision). User taps head + tail of fish; ARKit raycasts to 3D world positions; Euclidean distance = length. Falls back to manual inch entry on non-LiDAR devices (~75% of iPhones). New file: `mobile/src/screens/Submission/ARMeasureScreen.tsx`. Requires physical iPhone Pro for testing (ARKit does not run in simulator). ~4 days effort.
5. ~~**@mention in comments**~~ — **SHIPPED** (backend + web + mobile build #35). Custom `MentionTextInput`/`MentionInput` component; server-side mention parsing + Expo push notification; `GET /users/search?q=` endpoint; `renderWithMentions()` highlights in accent gold.
6. **In-app notification center** (~15–20 hrs). Fallback for users who denied push permission or are web-only. New `Notification` model (`userId`, `type`, `body`, `read`, `createdAt`, `targetId`). Backend writes a record on every event that currently only fires a push (approval, rejection, mention, director approval, etc.). Mobile: bell icon in nav with unread badge, `NotificationsScreen` with `FlatList`. Web: dropdown bell in `Nav`. `GET /notifications/me` (paginated), `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`. Real-time unread count via existing Socket.IO connection. Pairs well with @mentions feature.
7. **Android support** (~25–35 hrs total including QA). App is ~75% Android-ready already. Three blocking gaps:
   - **Google Sign-In**: `expo-apple-authentication` is iOS-only; Android users need an alternative. Add `@react-native-google-signin/google-signin` + `POST /auth/google` backend endpoint + conditional auth button on LoginScreen. (~4–6 hrs)
   - **Google Pay**: Stripe payment sheet passes `applePay` config only. Enable `googlePay` in `app.json` (`enableGooglePay: true`) + branch on `Platform.OS` in `TournamentDetailScreen` to pass `googlePay: { merchantCountryCode: 'US', currencyCode: 'USD' }` on Android. (~2–3 hrs)
   - **Firebase Cloud Messaging (FCM)**: Push notifications use APNs on iOS. Android requires Firebase credentials added to EAS build secrets + `google-services.json` in project. (~2–3 hrs)
   - Minor cleanup: remove unused `RECORD_AUDIO` Android permission; add `minSdkVersion: 24` to app.json android section; add android profile to `mobile/eas.json`.

## Legal Pages
- Web: `/legal` — full ToS + Privacy Policy with anchor links (`#terms`, `#privacy`, `#arbitration`)
- Mobile: `LegalScreen` in `mobile/src/screens/Legal/LegalScreen.tsx`, accessible from Register screen
- Both register screens require ToS checkbox before account creation (button disabled until checked)
- Backend logs `USER_TERMS_ACCEPTED` audit event on registration with `termsAcceptedAt` timestamp
- Admin history audit log shows `USER_TERMS_ACCEPTED` events

## Design System (as of 2026-03-17)
### Color Palette
- `mobile/src/theme/colors.ts` — single source of truth for mobile
- Dark surfaces: bg `#3A4C44`, surface `#2E3D38`, surfaceHigh `#445C54`
- Gold accent: `#CFC29C` (muted), accentDark `#B8A882`
- Light surfaces: cream `#F2EFE8`, white `#FFFFFF`, charcoal `#1A1D1A`
- Text on dark: text `#F0EDE4`, textSub `#9DB5A8`, textMuted `#6B7D73`
- Text on light: textDark `#1A1D1A`, textDarkSub `#4A5A52`, textDarkMuted `#6B7D73`
- Semantic: verified `#3DAF5A`, error `#C0392B`, warning `#D4820A`
- Each web/admin page has its own `const C = { ... }` with these same values (no shared module — intentional for MVP)

### Fonts
- Display/labels: `Oswald_700Bold`, `Oswald_600SemiBold` (loaded via `@expo-google-fonts/oswald`)
- Body: `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold` (loaded via `@expo-google-fonts/inter`)
- Web: loaded via Google Fonts CDN in `web/src/app/layout.tsx`; `globals.css` `.display` class uses Oswald
- Mobile: `useFonts` in `mobile/App.tsx` blocks render until all 5 variants are loaded

### Screen-level design decisions
- **HomeScreen**: cream/white — `safeArea` + `scroll` bg = `colors.cream`; header = deep green; feed cards = `colors.white` with shadow; section labels use `textDarkMuted`
- **ProfileScreen**: split — header + profileHero = deep green; everything below (stats grid, sections, tags, buttons) wrapped in `lightSection` view with `colors.cream` bg; stat cards and sections use `colors.white` with light borders `#E8E3D8`
- **LeaderboardScreen**: all dark green; rank numbers and measurements use `Oswald_700Bold`
- **TournamentScreen**: all dark green
- **SubmissionFlowScreen**: shutter button inner circle = `colors.cream`; camera overlay uses `rgba(46,61,56,...)` (not old dark rgba)
- **Auth screens (Login/Register)**: all dark green, fully using theme tokens

## Current Status (as of 2026-03-25)
- MVP fully deployed: backend + admin + web live on AWS
- iOS TestFlight build #36 is latest — WHO? prop count tap, TypeScript cleanup, hot spots photo lightbox, PublicProfile back button, director card tappable + avatar fix
- CI/CD optimized: Docker BuildKit GHA layer cache + `wait-for-service-stability: false` — backend deploys ~2–3 min instead of 5–10 min
- Stripe entry fees deployed; GitHub secrets added; webhook pointed to `https://api.fishleague.app/webhooks/stripe`
- App Store submission in progress (screenshots uploaded, metadata filled, awaiting review)

### Recently Shipped
- **Full media bar (📎/GIF/😊) on all mobile comment areas** (EAS build #32 submitted):
  - `TournamentDetailScreen` PostComments: photo attach via expo-image-picker, GIF search, emoji picker; uploads photo via `POST /tournaments/:id/posts/media`, passes `photoKey` to `addPostComment`
  - `LeaderboardScreen` CommentsSection: same full media bar; uploads via `POST /submissions/:id/comments/media`
  - `HomeScreen` CommentsModal: same full media bar
  - `PostComment` type gains `photoUrl?: string | null`; `addPostComment` gains `photoKey?` 4th param
  - `PostCard` component gains `tournamentId` prop so `PostComments` can upload media
  - Backend: `CatchComment` gains `gifUrl` + `photoKey`; `TournamentPostComment` gains `photoKey`; both resolved to presigned `photoUrl` in API responses
  - Migrations: `20260324000002_post_comment_photo_key`, `20260325000000_catch_comment_media`
  - New upload endpoint: `POST /submissions/:id/comments/media`
  - Web: same media bar already deployed on both leaderboard pages (PostComments + CommentsSection)
- **GIF search fix** (web deployed): PostComments `searchGifs` used `data.gifs` instead of `data.data` — now returns results correctly
- **Media bar button border fix** (web deployed): border was `C.border` (nearly same color as `C.surfaceHigh` surface) — fixed to `rgba(255,255,255,0.22)` for visible outline
- **GIF + emoji in tournament post comments** (backend + web deployed; shipped in build #32):
  - Backend: `gifUrl String?` added to `TournamentPostComment` model; migration `20260324000001_post_comment_gif_url`
  - `addPostComment` controller/service accept optional `gifUrl`; validates `body || gifUrl` required
  - Web `/leaderboard` and `/leaderboard/[id]`: GIF picker (backend proxy) + emoji picker (pure frontend) in PostComments comment input; GIFs rendered in comment thread
  - Mobile `TournamentDetailScreen`: same GIF picker + emoji picker added to PostComments; GIF renders inline in comment thread
  - `PostComment` type updated in both `mobile/src/services/api.ts` and `web/src/lib/api.ts` to include `gifUrl?: string | null`
- **Leaderboard render order fix** (web deployed):
  - Leaderboard entries were rendering after the tournament feed (off-screen); moved to render before the compose bar
- **PostComments on `/leaderboard` page** (web deployed):
  - Tournament feed posts on `/leaderboard` page now have the same collapsible comment section as `/leaderboard/[id]`
- **Comment "who gave props"** (backend + web deployed; mobile shipped in build #35):
  - `GET /comments/:id/props/who` + `GET /tournaments/posts/comments/:id/props/who` — returns proppers with displayName + presigned avatar
  - Web: clicking prop count on any comment opens a who-gave-props modal across all 3 pages
  - Mobile: same modal (bottom sheet) across TournamentDetailScreen, LeaderboardScreen, HomeScreen
  - Fix: thumbs-up active state now uses `opacity` (0.35 inactive / 1.0 active) instead of `color` — emoji ignores CSS color so it was always "active"-looking
  - Fix: home page comment input background changed to `C.surface` + gold border for visibility against dark card
- **Comment props (likes)** (backend + web deployed; mobile shipped in build #35):
  - New `CatchCommentProp` + `TournamentPostCommentProp` models + migration `20260327000000_comment_props`
  - `POST /comments/:id/prop` — toggle prop on catch comments; `POST /tournaments/posts/comments/:id/prop` — toggle on post comments
  - Both comment GET endpoints now return `propCount` + `userHasPropped`
  - 👍 prop button on every comment row across web (leaderboard, leaderboard/[id], home page) + mobile (TournamentDetailScreen, LeaderboardScreen, HomeScreen)
  - Gold accent when propped, muted when not; optimistic update via toggle response
- **@mention autocomplete + clickable usernames** (backend + web deployed; mobile shipped in build #35):
  - `GET /users/search?q=` prefix-match endpoint; `MentionInput`/`MentionTextInput` with debounced dropdown
  - `renderWithMentions()` renders `@username` as links/tappable on all platforms
  - All post author names, comment authors, leaderboard entries, and @mentions link to user profiles
  - `notifyMentions()` sends Expo push to mentioned users (fire-and-forget, deduplicates, skips self)
- **Props "who gave props"** (backend + web deployed; mobile shipped in build #35):
  - `GET /submissions/:id/props/who` — returns list of proppers with displayName + presigned avatar URL
  - Web: clicking the prop count opens a modal showing who gave props
  - Mobile: "who?" link next to prop count opens bottom sheet with avatar list
  - Fix: `props.service.ts` now calls `s3.resolveProfilePhotoUrl()` — previously returned raw S3 key causing broken avatars
- **Tournament feed post comments** (backend + web deployed; mobile shipped in build #35):
  - New `TournamentPostComment` model + migration `20260324000000_tournament_post_comments`
  - `GET/POST /tournaments/posts/:postId/comments` — get/add comments on feed posts
  - `DELETE /tournaments/posts/comments/:commentId` — delete own comment
  - Web `/leaderboard/[id]`: collapsible 💬 Comments thread under each feed post
  - Mobile `TournamentDetailScreen`: collapsible comment section on each PostCard; tap to expand, post, delete own
- **Docs updated**: `README.md` and `docs/architecture.md` fully reflect current stack, all API endpoints, all schema models, and design decisions
- **Android gap analysis**: documented in post-beta backlog — ~75% Android-ready; 3 blocking gaps (Google Sign-In, Google Pay, FCM)
- **Photo lightbox** (web deployed; mobile shipped in build #35):
  - Web: `PhotoLightbox` component (dark overlay, ESC/click-outside closes, `92vw×90vh` contain) on `leaderboard/[id]` and `leaderboard` pages
  - Mobile: full-screen `Modal` with `resizeMode="contain"` on `HomeScreen` FeedCard and `TournamentDetailScreen` PostCard
  - Catches and angler post photos are tappable; edit-form previews and GIF picker excluded
- **Comment improvements** (web deployed; mobile shipped in build #35):
  - Comments load on mount so count is always shown in toggle (`💬 3 comments`) before expanding
  - Avatars (28px circle) shown left of each commenter's name; initial letter fallback
  - Newest comments first; new comments prepended to top
  - Catch comments backend now returns `profilePhotoUrl` (presigned URL)
- **Deploy workflow fix**: `.github/workflows/deploy.yml` `changes` job now checks previous run conclusion via GitHub API — if previous run was not `success` (cancelled/failed), forces all three services to deploy regardless of which files changed; prevents silent missed deploys when a cancelled run had undeployed changes
- **@mention autocomplete in comments** (backend deployed; web deployed; mobile shipped in build #35):
  - `GET /users/search?q=` — prefix match on `AnglerProfile.username` (top 8, auth required)
  - `notifyMentions()` in `CommentsService` + `TournamentsService` — parses `@usernames` from saved comment body, looks up push tokens, sends Expo push "You were mentioned 🎣" (fire-and-forget, skips self, deduplicates)
  - Web: `MentionInput` component with trailing `@word` detection, 200ms debounce, floating dropdown above input, `renderWithMentions()` highlights mentions in gold — wired into `leaderboard/[id]`, `leaderboard`, and home page comment inputs
  - Mobile: `MentionTextInput` + `renderWithMentions` — wired into `TournamentDetailScreen` PostComments, `LeaderboardScreen` CommentsSection, `HomeScreen` CommentsModal
- **Clickable usernames and @mentions** (web deployed; mobile shipped in build #35):
  - Web: `renderWithMentions()` outputs `<a href="/profile/[username]">` links; `UserLink` helper makes all post author names, comment author names, and leaderboard entry names clickable
  - Web: avatar circles in comments clickable; director card name on leaderboard/[id] clickable
  - Web (leaderboard page): each feed post shows tournament name as a clickable link to tournament detail
  - Mobile: `renderWithMentions()` accepts `onMentionPress` — tapping `@mention` navigates to `PublicProfile` screen; post/comment author names tappable in TournamentDetailScreen, LeaderboardScreen, HomeScreen
- **Fishing Intelligence 502 fix** (deployed): added `AbortSignal.timeout(8000)` to Open-Meteo weather fetch
- **Admin users page fixes**: `autoComplete="new-password"` on password reset; `PAGE_SIZE` 50→10; `overflowY: 'visible'`
- **Stripe entry fee integration** (deployed):
  - `TournamentEntry` model + migration `20260325000000_tournament_entry_stripe`
  - `POST /tournaments/:id/entry/intent` → Stripe PaymentIntent (15% platform fee)
  - `POST /webhooks/stripe` → marks entry PAID on `payment_intent.succeeded`
  - Admin moderation: 💳 Fee Paid / 💳 Fee Unpaid badges
- **Apple App Store review notes**: `docs/apple-review-notes.md`
- **Avatar upload fix** (backend deployed, mobile shipped in build #35 for HEIC normalization):
  - Root cause: `ACL: 'public-read'` on S3 bucket with Object Ownership enforced → `InvalidBucketAclWithObjectOwnership` 500 error
  - `s3.service`: removed ACL from `uploadBuffer`; added `resolveProfilePhotoUrl()` — generates presigned URL from S3 key, passthrough for existing `https://` URLs (no network call, pure HMAC signing)
  - `profile.service`: `uploadAvatar` now stores S3 key (not public URL); `getOwn`/`getByUsername`/`upsert` resolve `profilePhotoUrl` to presigned URL before returning
  - `leaderboard.service`, `submissions.service`, `tournaments.service`: all resolve `profilePhotoUrl` in parallel for feed/leaderboard entries, director card, top-3, post authors
  - `profile.controller`: FileTypeValidator now accepts `image/heic` and `image/heif`
  - Mobile `ProfileScreen`: both avatar handlers normalize HEIC/HEIF mimeType → `image/jpeg` before upload
- **Edit post media bar** (backend deployed, web deployed, mobile shipped in build #35):
  - Backend `editPost` accepts `newPhotoKey` (S3 key or GIF URL `https://...`); returns presigned `photoUrl` for new photos
  - Web `/leaderboard` and `/leaderboard/[id]`: edit form shows existing photo with × remove, new media preview, inline GIF picker, inline emoji picker, 📎/GIF/😊 action row — identical to compose bar
  - Mobile `TournamentDetailScreen`: edit modal (pageSheet) has inline 📎/GIF/😊 row, inline GIF search FlatList, inline emoji grid (4 categories); `handleSaveEdit` uploads photo/GIF before API call
- **iOS TestFlight build #26** — ships all pending mobile changes since build #23:
  - Tournament Detail Screen: hero banner, director card, check-in count, entry fee/dates, top 3 leaderboard
  - Tournament social feed: paginated posts (CATCH/ANNOUNCEMENT/CHECK_IN/ANGLER_POST), compose bar
  - Compose bar: photo attach (📎 expo-image-picker → S3), GIF picker (Giphy via backend proxy), emoji picker (4 categories)
  - Uniform 38×38 compose buttons; paperclip icon replaces camera
  - "Tournament Details →" link on TournamentScreen active card
  - "View Tournament Details →" link in TournamentHistoryScreen expanded card
  - Multiple scoring methods: weight input, count modes, score display across all screens
  - Fishing Intelligence: idle state with zip/location choice, no auto-load on mount
  - Warning acknowledgment modal on HomeScreen (pops on load, step-through with "I UNDERSTAND")
  - Tournament Director request: full tournament list picker (not just active tournament)
  - Announcement rendering: bold title + plain message body
  - QR code display for admin/director; scan button for anglers (CheckInScreen)
- **Web fixes**:
  - GIF and emoji pickers now render inline (were position:absolute and hidden off-screen)
  - GIF picker has × close button in header
  - GIF search proxied through backend (`GET /gifs/search`) using server-side GIPHY_API_KEY
- **Admin UX**:
  - Users page: all 5 action buttons (role, suspend, reset PW, impersonate, warn) replaced with ⋮ dropdown
  - Tournaments page: Edit/Announce/Prize Draw/Check-in QR moved into ⋮ dropdown; Open/Close stays visible
  - Dropdown uses fixed overlay (z-40) for reliable outside-click dismissal

### Previously Shipped
- **Web feature parity** (deployed):
  - Home feed: Props + Comments now working (same PropButton/CommentsSection as leaderboard page)
  - `/leaderboard`: Your Rank banner for logged-in users; highlights their entry
  - `/leaderboard/[id]`: scoring method badge on tournament header
  - Profile: expanded stats from 2×2 to 3×2 grid (Catches, PB, Tournaments, Avg Catch, Wins, Verified)
  - Profile: Sign Out button wired up (was declared but intentionally voided)
  - Profile: Tournament Director Request section — view existing requests, submit new request with tournament picker + optional message
  - `web/src/lib/api.ts`: added `getTournaments()`, `getMyTournamentRequests()`, `submitTournamentAdminRequest()`, `TournamentAdminRequest` interface
- **Tournament Detail Page + Social Feed** (full-stack, backend deploying, mobile pending EAS):
  - Schema: `description`, `directorId` on Tournament; new `TournamentPost` model (`CATCH | ANNOUNCEMENT | CHECK_IN | ANGLER_POST`)
  - Migration: `20260322000000_tournament_detail_and_feed`
  - `GET /tournaments/:id` returns director, participant counts, top 3 leaderboard
  - Feed endpoints: `GET /tournaments/:id/feed` (paginated cursor), `POST /tournaments/:id/posts`
  - Auto-posts: CATCH on approval, CHECK_IN on first check-in, ANNOUNCEMENT on broadcast
  - Mobile `TournamentDetailScreen`: hero card, director section, QR code (admin/director) or scan button (angler), top 3 leaderboard, full social feed with compose bar
  - "Tournament Details →" button on TournamentScreen active card
  - Admin: description textarea + director dropdown in create form
  - **Additional admin improvements (this session):**
    - Admin edit modal expanded to all fields: name, start/end dates, entry fee, prize pool, scoring method, director, description
    - Tournament banner photo: `POST /tournaments/:id/banner` (admin, multipart); stored as `bannerKey` in DB; presigned URL returned on `getById`; shown as hero image on web detail page and mobile TournamentDetailScreen
    - Web `/tournaments` and home page now link to `/leaderboard/[id]` (tournament detail) instead of generic `/leaderboard`
    - Leaderboard page tournament name is a clickable link to detail page
  - **Gap fixes (this session):**
    - Announcement feed post now uses `actorId` (admin/director who sent it) instead of a random participant
    - Admin: ✏️ edit button on tournament rows → modal to update description + director
    - `TournamentHistoryScreen`: expanded card now has "View Tournament Details →" button navigating to `TournamentDetailScreen`
    - Web `/leaderboard/[id]`: now shows description, director card, entry fee/dates, and full social feed
- **Multiple scoring methods** (full-stack, backend deployed):
  - `ScoringMethod` enum: `LENGTH | WEIGHT | FISH_COUNT | SPECIES_COUNT` on Tournament
  - `fishWeightOz Float?` on Submission; `score Float` on LeaderboardEntry
  - Migration `20260321000002_add_scoring_method` back-fills score from fishLengthCm
  - Leaderboard service branches on scoringMethod; all ranked by `score desc`
  - Admin: scoring method dropdown in create form; badge on list; formatScore() in leaderboard view
  - Mobile: `scoringMethod` flows through TournamentContext + route params; weight input for WEIGHT mode; length optional for count modes
  - Tournament Director request picker: replaced auto-fill with full tournament list picker
- **Fishing Intelligence improvements** (backend deployed, mobile pending EAS build):
  - Backend: per-source caches — spots/label 24h TTL, tides until midnight; weather always fresh
  - Backend: `withTimeout()` caps slow external APIs: Overpass 6s, Nominatim 5s, NOAA tides 8s
  - Mobile: no longer auto-loads current location on mount — user chooses zip code or "Use My Location"
  - Mobile: idle state shows logo + prompt before any location is selected

### Previously Shipped
- **iOS TestFlight build #23** — ships all pending mobile changes:
  - Measuring device flow (mat/ruler/tape) replacing credit card
  - Photo upload from camera roll on submission screen
  - AI species identification UI (suggestions banner + chips)
  - Avatar picker in EditProfileForm
  - Loading states replaced with icon.png
  - Conservation mode toggle + badges
  - Career stats 6-card grid
  - Birthday year picker fix
  - Leaderboard prop count fix
  - FishingIntelligenceScreen back button fix
  - Profile comma-field delete bug fix
  - profilePhotoUrl empty string validation fix
  - Tournament Director apply section in ProfileScreen
  - Comment long-press edit/delete
  - QR check-in screen (CheckInScreen.tsx)
- **Tournament Admin role feature** (full-stack, deployed):
  - `TOURNAMENT_ADMIN` role with request/approval flow
  - Scoped admin panel — tournament admins see only their tournament
  - `TournamentScopedGuard` on moderation endpoints
  - Admin `/requests` page for approving/rejecting role requests
- **QR tournament check-in**: admin generates UUID code → QR rendered in admin panel → anglers scan to check in
- **Comment edit/delete**: long-press own comments for inline edit or delete

### Previously Shipped
- GPS-based region detection: `User.regionId` nullable; GPS at submission time validates against tournament region
- iAngler gap closures: rejection notes in-app, species chips (24), historical leaderboards, public spectator view, tournament announcements, prize draw, offline queue UX, career stats, conservation mode
- iOS TestFlight build #21 (March 20) — avatar picker, AI species UI, icon.png loading states, all prior mobile fixes
- Leaderboard: presigned `photoUrl` + `submittedAt` + relative timestamps
- Props + Comment buttons functional on HomeScreen
- Admin: pagination (Users 50/page, Tournaments 20/page, History server-side)
- Design system: Oswald/Inter fonts, dark/cream split screens across all platforms
