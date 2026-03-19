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
- `Tournament` — name, status (DRAFT/OPEN/CLOSED), regionId, weekNumber, year, entryFeeCents
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

## Current Status (as of 2026-03-21)
- MVP fully deployed: backend + admin + web live on AWS
- iOS TestFlight build #23 live — all mobile changes shipped (see below)
- Backend fully deployed: TOURNAMENT_ADMIN role, QR check-in, comment edit/delete all live

### Recently Shipped
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
