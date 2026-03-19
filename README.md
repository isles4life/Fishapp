# FishLeague MVP

Competitive weekly fishing tournament platform. 6-week validation build.

## Stack

| Layer | Tech |
|-------|------|
| Mobile (iOS) | React Native (Expo), bundle ID `app.fishleague` |
| Backend | Node.js 22, NestJS, Prisma, PostgreSQL 15 |
| Admin | Next.js 14 (App Router) |
| Web | Next.js 14 (App Router) — public leaderboard + angler profiles |
| Storage | AWS S3 (private bucket, presigned URLs) |
| Real-time | Socket.IO WebSocket |
| AI — Species ID | iNaturalist Vision API (free, no key, Actinopterygii filter) |
| AI — Length Check | Google Gemini 2.0 Flash (free tier: 1,500 req/day) |
| Infra | Docker Compose (local), AWS ECS Fargate + RDS (production) |
| CI/CD | GitHub Actions — queued deploys (`cancel-in-progress: false`) |

## Project Structure

```
FishAPP/
├── backend/                  # NestJS API (port 3000)
│   ├── prisma/
│   │   ├── schema.prisma     # DB schema (source of truth)
│   │   ├── migrations/       # Prisma migration history
│   │   └── seed.ts           # Regions + mat serials + admin user seed
│   └── src/
│       ├── auth/             # JWT + Apple Sign-In + email/password
│       ├── users/            # User management
│       ├── tournaments/      # Tournament CRUD + open/close + announce + draw
│       ├── submissions/      # Catch submission + AI species ID + fraud checks
│       ├── leaderboard/      # Ranking engine + weekly reset cron
│       ├── moderation/       # Admin moderation API (approve/reject/flag/bulk)
│       ├── profile/          # Angler profile upsert
│       ├── push/             # Expo push notifications
│       ├── email/            # Transactional emails
│       ├── audit/            # AuditLog service
│       ├── websocket/        # Socket.IO leaderboard gateway
│       ├── tournament-admin/ # Role request/approve flow + scope helper
│       └── common/           # Prisma service, JWT guard, Admin guard, TournamentScopedGuard
├── admin/                    # Next.js admin dashboard (port 3001)
│   └── src/app/
│       ├── moderation/       # Review queue with photos + AI flags
│       ├── tournaments/      # Create / open / close / announce / draw / QR check-in
│       ├── leaderboard/      # Live standings
│       ├── users/            # User list, role, suspend, warnings, impersonate
│       ├── history/          # Audit log + submission history
│       └── requests/         # Tournament director request approval queue (ADMIN only)
├── mobile/                   # React Native (Expo) — iOS only
│   └── src/
│       ├── screens/          # Auth, Submission, Leaderboard, Tournament, Profile, CheckIn
│       ├── services/         # API client, offline submission queue
│       ├── navigation/       # React Navigation stack + bottom tabs
│       └── theme/            # Colors, typography
├── web/                      # Next.js public site
│   └── src/app/
│       ├── page.tsx          # Public home / leaderboard feed
│       ├── leaderboard/[id]/ # Spectator leaderboard (no auth)
│       └── profile/          # Angler profile (edit + public view)
├── infra/terraform/          # AWS infrastructure (ECS, RDS, S3)
├── docs/
│   ├── architecture.md       # Full tech stack + sequence diagram + design decisions
│   └── competitive-analysis.md # iAngler competitive analysis
├── .github/workflows/
│   └── deploy.yml            # CI/CD: backend + admin + web (queued, no cancel)
└── docker-compose.yml
```

## Local Setup

### Prerequisites

- Node.js 22+
- Docker + Docker Compose

### 1. Backend + Admin + DB (Docker)

```bash
cp backend/.env.example backend/.env   # set JWT_SECRET, AWS creds, GEMINI_API_KEY

docker compose up --build
```

Services:
- Backend API: http://localhost:3000
- Admin Dashboard: http://localhost:3001

Default admin: `admin@fishleague.com` / `FishAdmin2026!`

### 2. Web (local dev)

```bash
cd web
npm install
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
```

### 3. Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

Set backend URL in `mobile/app.config.js` → `extra.apiBaseUrl`:
- iOS Simulator: `http://localhost:3000`
- Physical device: `http://<your-machine-ip>:3000`

### 4. First Tournament

```
1. http://localhost:3001 → sign in as admin
2. Tournaments → Create → Open
3. Register angler via mobile or http://localhost:3000/register
4. Submit a catch from mobile
5. Approve in Moderation → leaderboard updates live
```

## Authentication & RBAC

- Email/password (bcrypt) on all platforms
- Apple Sign-In (iOS only)
- JWT (30-day expiry) — Keychain on mobile, localStorage on web/admin
- Roles: `USER` (default), `ADMIN`, and `TOURNAMENT_ADMIN`
- Admin panel protected by `AdminGuard` (full admin) or `TournamentScopedGuard` (moderation endpoints — allows either role)
- `TOURNAMENT_ADMIN` sees a scoped admin panel filtered to their assigned tournament(s); cannot access Users or Requests pages
- Role changes take effect immediately — JWT strategy fetches live user from DB on every request, no re-login needed

## AI Features

### Species Identification

`POST /submissions/identify` — accepts a fish photo, calls iNaturalist Vision API in the background during the measure step, returns top-3 species suggestions filtered to ray-finned fish (`Actinopterygii`). Auto-fills the species chip in the mobile submission flow if confidence ≥ 70%.

### Fraud Detection

Two fire-and-forget checks run after every submission is saved (never block the response):

1. **Fish presence** (`checkIsFish`): iNaturalist scores the measurement photo. Sets `flagSuspectPhoto = true` if no fish detected or top confidence < 15%.
2. **Length verification** (`estimateFishLength`): Gemini 2.0 Flash reads ruler markings (mat ruler or standalone ruler/tape) and estimates fish length. Sets `flagSuspectLength = true` + stores `estimatedLengthCm` if estimate differs > 30% from submitted length. Requires `GEMINI_API_KEY` env var; degrades gracefully if unset.

Both flags appear as badges in the admin moderation queue alongside submitted vs. estimated measurements.

## API Reference

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Email registration |
| POST | /auth/login | Email login |
| POST | /auth/apple | Apple Sign-In |
| GET | /tournaments | List tournaments |
| GET | /tournaments/history | Historical tournaments |
| GET | /leaderboard/:id | Leaderboard entries |

### Authenticated (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| GET | /users/me | Current user |
| POST | /submissions | Submit catch (multipart: photos + GPS + length in cm) |
| POST | /submissions/identify | AI species ID (multipart: photo) |
| GET | /submissions/mine | User's own submissions |
| GET | /submissions/hotspots | Approved catch GPS heatmap |
| GET | /profile/:username | Public angler profile |
| PUT | /profile/me | Update angler profile |
| POST | /submissions/:id/props | Toggle prop (like) |
| POST | /submissions/:id/comments | Add comment |

### Tournament Director (JWT + any authenticated user)

| Method | Path | Description |
|--------|------|-------------|
| POST | /tournament-admin/request | Request TOURNAMENT_ADMIN role for a tournament |
| GET | /tournament-admin/my-requests | User's own role requests + status |
| GET | /tournament-admin/my-tournaments | Assigned tournament IDs (used by admin panel) |
| POST | /tournaments/check-in | Scan QR check-in code (body: `{ code }`) |

### Admin only (JWT + ADMIN role)

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/moderation/pending | Pending submission queue |
| POST | /admin/moderation/:id/action | Approve / Reject / Flag |
| POST | /admin/moderation/bulk | Bulk moderate |
| GET | /admin/moderation/submissions | All submissions (filterable) |
| GET | /admin/audit | Audit log |
| GET | /users | List users |
| PATCH | /users/:id | Update role / suspend |
| POST | /tournaments | Create tournament |
| PATCH | /tournaments/:id/open | Open tournament |
| PATCH | /tournaments/:id/close | Close tournament |
| POST | /tournaments/:id/announce | Push announcement to all participants |
| POST | /tournaments/:id/draw | Random prize draw (flat or weighted) |
| PATCH | /tournaments/:id/check-in-code | Generate / regenerate QR check-in code |
| GET | /tournaments/:id/check-ins | List anglers who checked in |
| GET | /admin/tournament-admin/requests | All pending role requests |
| PATCH | /admin/tournament-admin/requests/:id/approve | Approve — sets user role to TOURNAMENT_ADMIN |
| PATCH | /admin/tournament-admin/requests/:id/reject | Reject with optional note |

## Database Schema

Key models (see `backend/prisma/schema.prisma` for full definitions):

| Model | Key fields |
|-------|-----------|
| `User` | email, appleId, role (USER/ADMIN/TOURNAMENT_ADMIN), suspended, pushToken, regionId (nullable) |
| `AnglerProfile` | username, bio, birthday, homeState, primarySpecies[], sportsmanshipScore |
| `Region` | name, minLat/maxLat/minLng/maxLng (bounding box) |
| `Tournament` | name, weekNumber, year, isOpen, startsAt, endsAt, entryFeeCents, prizePoolCents, checkInCode (nullable, unique) |
| `TournamentCheckIn` | userId, tournamentId, checkedInAt — unique on (userId, tournamentId) |
| `TournamentAdminRequest` | userId, tournamentId, status (PENDING/APPROVED/REJECTED), message, reviewedById, reviewedAt |
| `Submission` | fishLengthCm, gpsLat/Lng, photo1Key/photo2Key (S3), status, flagDuplicateHash, flagDuplicateGps, flagSuspectPhoto, flagSuspectLength, estimatedLengthCm, released |
| `LeaderboardEntry` | rank, fishLengthCm, submissionId, userId, tournamentId |
| `ModerationAction` | actionType (APPROVE/REJECT/FLAG/SUSPEND_USER), note |
| `AuditLog` | action, actorName, targetId, details (JSON) |
| `UserWarning` | level (MINOR/MAJOR/FINAL), reason, acknowledged |

Fish length stored in **cm** in DB everywhere; displayed in **inches** in all UIs (`inches = cm / 2.54`).

## WebSocket

Connect to `ws://localhost:3000/leaderboard`

```json
// Subscribe
{ "event": "subscribe", "data": { "tournamentId": "uuid" } }

// Receive on approval
{ "event": "leaderboard:update", "data": { "tournamentId": "...", "entries": [...] } }
```

## Weekly Reset

`WeeklyResetService` closes all open tournaments at **Sunday 23:59 UTC**.
Leaderboard entries retained for historical records. Admin manually creates the next tournament.

## Production Deployment

CI/CD via `.github/workflows/deploy.yml`:
- Push to `master` → auto-deploys backend + admin + web (~5–10 min)
- Deploys queue (`cancel-in-progress: false`) — no risk of killing an in-progress migration
- `prisma migrate deploy` runs automatically in container CMD on every deploy
- Mobile requires a manual EAS build: `cd mobile && eas build --platform ios --profile production`

Production URLs:
- API: https://api.fishleague.app
- Admin: https://admin.fishleague.app
- Web: https://fishleague.app

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Token signing key |
| `AWS_ACCESS_KEY_ID` | Yes | S3 access |
| `AWS_SECRET_ACCESS_KEY` | Yes | S3 access |
| `AWS_REGION` | Yes | `us-east-1` |
| `S3_BUCKET` | Yes | `fishleague-submissions-production` |
| `APPLE_BUNDLE_ID` | Yes | Apple Sign-In verification |
| `GEMINI_API_KEY` | No | Gemini 2.0 Flash length estimation (degrades gracefully if unset) |

### AWS Infrastructure

- ECS cluster: `fishleague` (Fargate — services: backend, admin, web)
- RDS: PostgreSQL 15 (private VPC)
- S3: `fishleague-submissions-production` (private, presigned URL access)
- Region: `us-east-1`

---

> **Post-beta roadmap:** email verification, Stripe entry fees, Facebook Sign-In, ARKit LiDAR fish measurement.
