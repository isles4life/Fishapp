# FishLeague MVP

Competitive weekly fishing tournament platform. 6-week validation build.

## Stack

| Layer | Tech |
|-------|------|
| Mobile (iOS + Android) | React Native (Expo), AVFoundation (iOS QR), CoreLocation |
| Backend | Node.js, NestJS, Prisma, PostgreSQL |
| Admin | Next.js 14 (App Router) |
| Web | Next.js 14 (App Router) — public leaderboard + login |
| Storage | AWS S3 |
| Real-time | Socket.IO WebSocket |
| Infra | Docker Compose (local), AWS ECS Fargate + RDS (production) |
| CI/CD | GitHub Actions — parallel builds, path-based deploys, ~4 min |

## Project Structure

```
FishAPP/
├── backend/                  # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma     # DB schema (8 tables incl. AuditLog)
│   │   └── seed.ts           # Regions + mat serials + admin user seed
│   └── src/
│       ├── auth/             # JWT + Apple Sign In + login audit logging
│       ├── users/            # User profile, regions, admin user management
│       ├── tournaments/      # Tournament CRUD + open/close + audit logging
│       ├── submissions/      # Verified catch submission flow
│       ├── leaderboard/      # Ranking engine + weekly reset cron
│       ├── moderation/       # Admin moderation API
│       ├── audit/            # AuditLog service + GET /admin/audit endpoint
│       ├── websocket/        # Socket.IO leaderboard gateway
│       └── common/           # Prisma service, JWT guard, Admin guard
├── admin/                    # Next.js admin dashboard (port 3001)
│   └── src/app/
│       ├── moderation/       # Review queue with images + GPS
│       ├── tournaments/      # Create / open / close
│       ├── leaderboard/      # Live standings
│       ├── users/            # User list, role management, suspend/unsuspend
│       └── history/          # Audit log: logins, role changes, tournament events
├── mobile/                   # React Native (Expo) — iOS + Android
│   └── src/
│       ├── screens/          # Auth, Submission, Leaderboard, Tournament
│       ├── services/         # API client, storage (token)
│       ├── models/           # TypeScript data models
│       ├── navigation/       # React Navigation stack
│       └── theme/            # Colors, shared styles
├── web/                      # Next.js public site (port 3002)
│   └── src/app/
│       ├── page.tsx          # Public leaderboard (no auth required)
│       ├── login/            # Web login
│       └── register/         # Web registration
├── infra/terraform/          # AWS infrastructure (ECS, RDS, S3, Secrets Manager)
├── .github/workflows/
│   └── deploy.yml            # Parallel CI/CD: backend + admin deploy independently
├── docker-compose.yml
└── ARCHITECTURE.md
```

## Local Setup

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- AWS account with S3 bucket

### 1. Backend + Admin (Docker)

```bash
# Copy and fill in your AWS credentials and secrets
cp backend/.env.example backend/.env

# Start Postgres + Backend + Admin
docker compose up --build

# Seed runs automatically on first start (regions, mat serials, admin user)
# Default admin credentials: admin@fishleague.com / FishAdmin2026!
# Override password via ADMIN_PASSWORD env var
```

Services:
- Backend API: http://localhost:3000
- Admin Dashboard: http://localhost:3001

### 2. Backend (local dev, no Docker)

```bash
cd backend
npm install
cp .env.example .env          # set DATABASE_URL to your local Postgres
npx prisma db push
npm run prisma:seed
npm run start:dev
```

### 3. Admin (local dev)

```bash
cd admin
npm install
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
```

### 4. Web (local dev)

```bash
cd web
npm install
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
```

### 5. Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
# Press 'i' for iOS simulator, 'a' for Android emulator
```

Set `apiBaseUrl` in `app.config.js` extra field to point at your backend.

### 6. First Tournament

```
1. Go to http://localhost:3001 → sign in with admin@fishleague.com / FishAdmin2026!
2. Navigate to Tournaments → Create a tournament → click Open
3. Register a user via mobile or http://localhost:3002/register
4. Submit a catch from the mobile app
5. Approve via Moderation tab — leaderboard updates in real-time
```

## Authentication & RBAC

- Email/password auth with bcrypt hashing
- Apple Sign In (iOS only, requires APPLE_BUNDLE_ID env var)
- JWT (30-day expiry), stored in device Keychain (mobile) / localStorage (web/admin)
- Two roles: `USER` (default) and `ADMIN`
- Admin panel protected by `AdminGuard` — non-admin JWT returns 403
- Suspended users receive a specific error: *"Your account has been suspended. Please contact admin@fishleague.app for assistance."*

## API Reference

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Email registration |
| POST | /auth/login | Email login (accepts optional `platform` field) |
| POST | /auth/apple | Apple Sign In (accepts optional `platform` field) |
| GET | /users/regions | Available regions |
| GET | /tournaments/open | Currently open tournament (for public leaderboard) |

### Authenticated (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| GET | /users/me | Current user profile |
| GET | /tournaments/active | Active tournament in user's region |
| GET | /leaderboard/:id | Top 25 entries (public) |
| GET | /leaderboard/:id/me | User's own rank |
| POST | /submissions | Submit catch (multipart: 2 photos + metadata) |
| GET | /submissions/mine | User's own submissions |

### Admin only (JWT + ADMIN role)

| Method | Path | Description |
|--------|------|-------------|
| POST | /tournaments | Create tournament |
| PATCH | /tournaments/:id/open | Open tournament |
| PATCH | /tournaments/:id/close | Close tournament |
| GET | /users | List all users |
| PATCH | /users/:id | Update user role or suspended status |
| GET | /admin/moderation/pending | Pending submission queue |
| GET | /admin/moderation/flagged | Flagged submissions |
| POST | /admin/moderation/:id/action | Approve / Reject / Suspend |
| GET | /admin/audit | Audit log (logins, role changes, tournament events) |

## Audit Log

Every significant action is recorded in the `AuditLog` table and visible in the admin History page.

| Event | Triggered by |
|-------|-------------|
| `USER_LOGIN` | Any successful login (email or Apple), tagged with `platform` (admin/web/mobile) |
| `TOURNAMENT_CREATED` | Admin creates a tournament |
| `TOURNAMENT_OPENED` | Admin opens a tournament |
| `TOURNAMENT_CLOSED` | Admin closes a tournament |
| `USER_PROMOTED_TO_ADMIN` | Admin promotes a user |
| `USER_DEMOTED_TO_USER` | Admin demotes a user |
| `USER_SUSPENDED` | Admin suspends a user |
| `USER_UNSUSPENDED` | Admin unsuspends a user |

## WebSocket

Connect to `ws://localhost:3000/leaderboard`

```json
// Subscribe
{ "event": "subscribe", "data": { "tournamentId": "uuid" } }

// Receive on approval
{ "event": "leaderboard:update", "data": { "tournamentId": "...", "entries": [...] } }
```

## Database Schema

8 tables: `User`, `Region`, `Tournament`, `MatSerial`, `Submission`, `LeaderboardEntry`, `ModerationAction`, `AuditLog`

See `backend/prisma/schema.prisma` for full definitions.

Key fields added beyond initial scaffold:
- `User.role` — `UserRole` enum (`USER` | `ADMIN`), default `USER`
- `User.passwordHash` — bcrypt hash for email auth
- `AuditLog` — action, actorId, actorName, targetId, details (JSON), createdAt

## Tests

```bash
cd backend
npm test
npm run test:cov   # coverage report
```

## Weekly Reset

`WeeklyResetService` closes all open tournaments at **Sunday 23:59 UTC**.
Leaderboard entries are retained for historical records.
Admin manually creates the next week's tournament via the dashboard.

## Production Deployment

Infrastructure lives in `infra/terraform/` (AWS ECS Fargate + RDS + S3 + Secrets Manager).

CI/CD via `.github/workflows/deploy.yml`:
- Path-filtered: only changed services rebuild and deploy
- Backend and admin jobs run in **parallel**
- Docker layer caching keeps deploys under ~4 minutes
- `prisma db push` and seed run automatically on ECS container startup

Production URLs:
- API: https://api.fishleague.app
- Admin: https://admin.fishleague.app
- Web: https://fishleague.app

Environment variables required (stored in AWS Secrets Manager):
- `DATABASE_URL` — RDS connection string
- `JWT_SECRET` — token signing key
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `S3_BUCKET`
- `APPLE_BUNDLE_ID` — for Apple Sign In verification
- `ADMIN_PASSWORD` — initial admin account password (seed only)

---

> MVP scope. Phase 2: push notifications, payment automation, ML fraud detection, multi-region expansion, offline mode.
