# FishLeague – Claude Context

## Project Overview
Competitive fishing league app (6-week MVP). Anglers submit catch photos with GPS + fish length, admin moderates, leaderboard ranks by length. Single region validation for MVP.

## Stack
- **Mobile**: React Native (Expo), `mobile/` — iOS only for now, bundle ID `app.fishleague`
- **Web**: Next.js 14 App Router, `web/` — public leaderboard + angler profiles
- **Admin**: Next.js 14 App Router, `admin/` — moderation, tournaments, users, audit log
- **Backend**: NestJS + Prisma + PostgreSQL, `backend/` — REST API on port 3000
- **Infra**: Docker Compose locally, AWS ECS + RDS (PostgreSQL) in production, S3 for photos
- **CI/CD**: `.github/workflows/deploy.yml` → pushes to `master` auto-deploy backend + admin + web to ECS

## Architecture Decisions
- No Redis for MVP — single Postgres instance, leaderboard recomputed on every approval
- Fish length stored in **cm** in the DB (`fishLengthCm`), displayed in **inches** everywhere in UI (divide by 2.54)
- Image dedup via MD5 hash — flags only, human moderation required
- GPS bounding box validation is server-side (never trust client)
- QR mat reuse prevention: server checks matSerialId + tournamentId + userId uniqueness
- Weekly reset: cron closes tournaments Sunday 23:59 UTC; admin manually creates next week's
- S3 bucket is **private** — backend generates presigned URLs for photo access (1hr expiry)
- Apple Sign-In supported on mobile. Email/password on all platforms. No Google/Facebook yet.
- Admin auth: email/password only, backend checks `role === 'ADMIN'` on JWT

## Key Files
- `backend/prisma/schema.prisma` — DB schema (source of truth)
- `backend/src/submissions/submissions.service.ts` — core submission validation logic
- `backend/src/moderation/moderation.service.ts` — moderation queue, bulk actions, presigned URLs
- `backend/src/leaderboard/leaderboard.service.ts` — ranking engine + WebSocket broadcast
- `backend/src/websocket/leaderboard.gateway.ts` — Socket.IO gateway
- `backend/src/leaderboard/weekly-reset.service.ts` — Sunday 23:59 UTC cron
- `backend/src/auth/auth.service.ts` — email + Apple login, JWT signing
- `backend/src/profile/profile.service.ts` — angler profile upsert (birthday must be converted to full ISO DateTime)
- `mobile/src/screens/Tournament/TournamentScreen.tsx` — active Tournaments tab (used in nav, not TournamentHomeScreen)
- `mobile/src/screens/Submission/SubmissionFlowScreen.tsx` — catch submission flow (input in inches, converts to cm for API)
- `mobile/src/navigation/index.tsx` — tab + stack navigation setup
- `admin/src/app/history/page.tsx` — audit log + submissions history (two tabs)
- `admin/src/app/moderation/page.tsx` — moderation queue with photo review
- `admin/src/lib/api.ts` — admin API client
- `web/src/app/profile/page.tsx` — angler profile edit page

## API
- Backend: `https://api.fishleague.app` (prod), `http://localhost:3000` (local)
- Admin: `https://admin.fishleague.app` (prod), `http://localhost:3001` (local)
- All admin routes require `Authorization: Bearer <token>` + `role === ADMIN`

## AWS Infrastructure
- Region: `us-east-1`
- ECS cluster: `fishleague`
- Services: `fishleague-backend`, `fishleague-admin`, `fishleague-web`
- Log groups: `/ecs/fishleague/backend`, `/ecs/fishleague/admin`
- RDS is in a private VPC — to run psql against prod, use a one-off ECS Fargate task with `postgres:15-alpine` image and `DATABASE_URL` secret
- To view logs: `MSYS_NO_PATHCONV=1 aws logs ...` (required on Windows Git Bash to prevent path mangling)

## Mobile Build
- EAS project ID: `692c9886-3f70-4b06-a9b7-78b9d3f65411`
- App Store Connect app ID: `6760669599`
- Build for TestFlight: `cd mobile && eas build --platform ios --profile production`
- Backend changes deploy automatically; mobile requires a new EAS build + TestFlight upload

## DB Schema — Key Models
- `User` — email, passwordHash, appleId, role (USER/ADMIN), suspended, regionId, pushToken
- `AnglerProfile` — username, bio, birthday (DateTime), favoriteTechniques[], favoriteBaits[], sponsorTags[], etc.
- `Tournament` — name, status (DRAFT/OPEN/CLOSED), regionId, weekNumber, year
- `Submission` — fishLengthCm, gpsLat, gpsLng, status (PENDING/APPROVED/REJECTED/FLAGGED), photo1Key, photo2Key, matSerialId (nullable), flagDuplicateHash, flagDuplicateGps
- `LeaderboardEntry` — rank, submissionId, userId, tournamentId
- `AuditLog` — action, actorId, targetId, details (JSON)
- `AuthProvider` enum: EMAIL | APPLE

## Known Gotchas
- `MSYS_NO_PATHCONV=1` required before all AWS CLI commands in Windows Git Bash (paths like `/ecs/...` get mangled otherwise)
- Prisma `DateTime` fields reject date-only strings (`"2001-08-08"`) — must append `T00:00:00.000Z`
- Backend `npm run build` requires `npx prisma generate` first if schema changed
- Mobile navigation uses `TournamentScreen.tsx` (not `TournamentHomeScreen.tsx`) for the Tournaments tab
- Status enums from backend are uppercase (`APPROVED`, `REJECTED`, `PENDING`) — always compare uppercase in UI
- Comma-separated array fields (techniques, baits, tags) in profile: filter empty strings only on save, not on every keystroke
- Fish length: DB stores cm, all UI shows inches. Conversion: `inches = cm / 2.54`, `cm = inches * 2.54`
- Auto-measure (credit card tool) calculates in cm internally, then converts to inches for the input field

## Post-Beta Backlog
1. **Email verification**: add `emailVerified` + `verificationToken` to User, send confirmation email on register, `GET /auth/verify-email?token=xxx`, block unverified users from submitting.
2. **Stripe entry fees**: Stripe account, payment sheet in mobile, webhook handling, payout logic. First beta tournament is free (`entryFeeCents: 0`).
3. **Facebook Sign-In** (mobile + web only, skip admin): add `facebookId` to User + `FACEBOOK` to AuthProvider enum, `POST /auth/facebook` via Graph API token verification, `expo-auth-session` on mobile, OAuth redirect on web. Requires Facebook App Review (~1 day code, 1–5 days review).

## Current Status (as of 2026-03-17)
- MVP fully deployed: backend + admin + web live on AWS
- iOS TestFlight build submitted — being processed by Apple
- End-to-end submission flow confirmed working
- All fish length displays converted to inches (DB remains cm)
- Profile save 500 error fixed (birthday DateTime conversion)
- Comma input fixed for profile array fields
- Submission status display fixed (uppercase enum comparison)
