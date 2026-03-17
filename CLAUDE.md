# FishLeague – Claude Context

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
- GPS bounding box validation server-side (never trust client coordinates)
- S3 bucket is **private** — backend generates presigned URLs (1hr expiry) for photo access
- Apple Sign-In on mobile; email/password on all platforms; no Google/Facebook yet
- Admin auth: email/password only, JWT checked for `role === ADMIN`
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
- `admin/src/lib/api.ts` — admin API client
- `admin/src/components/AuthProvider.tsx` — admin login with role verification

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
- `GET /submissions/mine?tournamentId=` — user's own submissions
- `GET /leaderboard/:tournamentId` — leaderboard entries
- `GET /admin/moderation/pending` — pending submissions queue
- `POST /admin/moderation/:id/action` — approve/reject/flag
- `POST /admin/moderation/bulk` — bulk moderate
- `GET /admin/moderation/submissions` — all submissions (filterable by status/tournament)
- `GET /admin/audit` — audit log
- `PUT /profile/me` — update angler profile
- `GET /profile/:username` — public profile

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
- `User` — id, email, passwordHash, appleId, role (USER/ADMIN), suspended, regionId, pushToken, authProvider (EMAIL|APPLE)
- `AnglerProfile` — userId, username, bio, birthday (DateTime!), favoriteTechniques[], favoriteBaits[], sponsorTags[], homeState, homeCity, country, zipCode, profilePhotoUrl, publicProfile, allowFollowers
- `Region` — name, minLat, maxLat, minLng, maxLng (Southeast bounds currently widened to cover continental US: lat 24–50, lng -125 to -66)
- `Tournament` — name, status (DRAFT/OPEN/CLOSED), regionId, weekNumber, year, entryFeeCents
- `Submission` — fishLengthCm, gpsLat, gpsLng, photo1Key, photo2Key (S3 keys), imageHash1, matSerialId (nullable), status (PENDING/APPROVED/REJECTED/FLAGGED), flagDuplicateHash, flagDuplicateGps, userId, tournamentId
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
- **matSerialId nullable** — migration `20260314000000_mat_free_submissions` was baselined (not run); constraints dropped directly via psql ECS task
- **S3 presigned URLs** — S3 bucket is private; admin moderation photos use presigned URLs from backend, not public URLs
- **Birthday on profile save** — mobile `BirthdayPicker` correctly calls `.toISOString()`, but web `<input type="date">` sends `YYYY-MM-DD`; backend converts with `new Date(\`${birthday}T00:00:00.000Z\`)`
- **GPS bounds** — Southeast region bounds were widened in DB directly to cover test locations outside original bounds

## Admin Features
- Moderation queue: view pending submissions with photos (presigned URLs), approve/reject/flag individually or in bulk
- Submissions history: all submissions filterable by status (ALL/PENDING/APPROVED/REJECTED/FLAGGED)
- Audit log: all admin actions logged with actor, target, details
- Tournament management: create (DRAFT), open, close tournaments
- User management: change role (USER/ADMIN), suspend/unsuspend, change region, reset password, impersonate, issue warnings (MINOR/MAJOR/FINAL)
- Leaderboard: view current rankings per tournament

## Submission Flow (end-to-end)
1. Mobile captures photo, gets GPS location
2. Optional: credit card auto-measure (calculates cm internally, shows inches in input)
3. User enters fish length in **inches**; app converts to cm for API call
4. Backend validates: GPS inside region bounds, mat serial not reused, photo hash not duplicate
5. Photo uploaded to S3 (`photo1Key`, `photo2Key`)
6. Submission created with status `PENDING`
7. Admin reviews in moderation queue (photos via presigned URLs)
8. On approve: leaderboard updated, push notification + email sent to angler
9. On reject: push notification + email sent with note

## Post-Beta Backlog
1. **Email verification**: add `emailVerified` + `verificationToken` to User, send confirmation email on register, `GET /auth/verify-email?token=xxx`, block unverified users from submitting.
2. **Stripe entry fees**: Stripe account, payment sheet in mobile, webhook handling, payout logic. First beta tournament free (`entryFeeCents: 0`).
3. **Facebook Sign-In** (mobile + web only, skip admin): add `facebookId` to User + `FACEBOOK` to AuthProvider enum, `POST /auth/facebook` via Graph API token verification, `expo-auth-session` on mobile, OAuth redirect on web. Requires Facebook App Review (~1 day code, 1–5 days review).

## Legal Pages
- Web: `/legal` — full ToS + Privacy Policy with anchor links (`#terms`, `#privacy`, `#arbitration`)
- Mobile: `LegalScreen` in `mobile/src/screens/Legal/LegalScreen.tsx`, accessible from Register screen
- Both register screens require ToS checkbox before account creation (button disabled until checked)
- Backend logs `USER_TERMS_ACCEPTED` audit event on registration with `termsAcceptedAt` timestamp
- Admin history audit log shows `USER_TERMS_ACCEPTED` events

## Current Status (as of 2026-03-17)
- MVP fully deployed: backend + admin + web live on AWS
- iOS build submitted to TestFlight; needs to be added to external group once Apple processes it
- End-to-end submission flow confirmed working (photo → S3 → moderation queue → approve → push notification)
- All fish length displays converted to inches across mobile, web, and admin (DB remains cm)
- Profile save 500 fixed (birthday DateTime conversion)
- Comma input fixed for profile array fields
- Submission status display fixed (uppercase enum comparison in TournamentScreen)
- Admin history page has Submissions tab (in addition to Audit Log)
- ToS & Privacy Policy pages added (web: `/legal`, mobile: `LegalScreen`); acceptance checkbox on both register screens; `USER_TERMS_ACCEPTED` audit event logged
- Region selection on register is now a dropdown on web (`<select>`) and mobile (custom modal picker) instead of a button grid
- **New iOS build required** to ship: submission status fix, inches conversion, ToS checkbox, legal link in profile, region dropdown
