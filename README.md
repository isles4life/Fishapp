# FishLeague MVP

Competitive weekly fishing tournament platform. 6-week validation build.

## Stack

| Layer | Tech |
|-------|------|
| iOS | Swift 5.9, SwiftUI, MVVM, AVFoundation, CoreLocation |
| Backend | Node.js, NestJS, Prisma, PostgreSQL |
| Admin | Next.js 14 (App Router) |
| Storage | AWS S3 |
| Real-time | Socket.IO WebSocket |
| Infra | Docker Compose |

## Project Structure

```
FishAPP/
├── backend/                  # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma     # DB schema (7 tables)
│   │   └── seed.ts           # Region + mat serials seed
│   └── src/
│       ├── auth/             # JWT + Apple Sign In
│       ├── users/            # User profile + regions
│       ├── tournaments/      # Tournament CRUD + open/close
│       ├── submissions/      # Verified catch submission flow
│       ├── leaderboard/      # Ranking engine + weekly reset cron
│       ├── moderation/       # Admin moderation API
│       ├── websocket/        # Socket.IO leaderboard gateway
│       └── common/           # Prisma service, JWT guard
├── admin/                    # Next.js admin dashboard
│   └── src/app/
│       ├── moderation/       # Review queue with images + GPS
│       ├── tournaments/      # Create / open / close
│       └── leaderboard/      # Live standings
├── ios/FishLeague/
│   ├── Models/               # Decodable data models
│   ├── Services/             # APIClient, KeychainService, WebSocketService
│   ├── ViewModels/           # AuthVM, TournamentVM, SubmissionVM, LeaderboardVM
│   ├── Views/
│   │   ├── Auth/             # Login, Register
│   │   ├── Tournament/       # Home, active tournament
│   │   ├── Submission/       # CameraView (AVFoundation + QR), SubmissionFlow
│   │   └── Leaderboard/      # Live top-25 + user rank
│   └── Utilities/            # QRValidator
├── docker-compose.yml
└── ARCHITECTURE.md
```

## Local Setup

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- Xcode 15+ (for iOS)
- AWS account with S3 bucket

### 1. Backend + Admin (Docker)

```bash
# Copy and fill in your AWS credentials
cp backend/.env.example backend/.env

# Start Postgres + Backend + Admin
docker compose up --build

# First run: seed the database
docker compose exec backend npm run prisma:seed
```

Services:
- Backend API: http://localhost:3000
- Admin Dashboard: http://localhost:3001

### 2. Backend (local dev, no Docker)

```bash
cd backend
npm install
cp .env.example .env          # set DATABASE_URL to your local Postgres
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

### 3. Admin (local dev)

```bash
cd admin
npm install
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run dev
```

### 4. iOS App

1. Open `ios/FishLeague.xcodeproj` in Xcode
2. Set `API_BASE_URL` in `Info.plist` (or the Xcode scheme environment variable)
3. Add your Apple Sign In capability and set `APPLE_BUNDLE_ID` in backend `.env`
4. Run on device (camera requires real hardware)

### 5. First Tournament

```bash
# Via admin dashboard at http://localhost:3001/tournaments
# 1. Create a tournament for the Pacific Northwest region
# 2. Click "Open" to make it active
# 3. Submit a catch from the iOS app
# 4. Approve via Moderation tab – leaderboard updates in real-time
```

## API Reference (Key Endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | — | Email registration |
| POST | /auth/login | — | Email login |
| POST | /auth/apple | — | Apple Sign In |
| GET | /users/me | JWT | Current user |
| GET | /users/regions | JWT | Available regions |
| GET | /tournaments/active | JWT | Active tournament in user's region |
| POST | /tournaments | JWT | Create tournament (admin) |
| PATCH | /tournaments/:id/open | JWT | Open tournament (admin) |
| PATCH | /tournaments/:id/close | JWT | Close tournament (admin) |
| POST | /submissions | JWT | Submit catch (multipart) |
| GET | /submissions/mine | JWT | User's own submissions |
| GET | /leaderboard/:id | JWT | Top 25 entries |
| GET | /leaderboard/:id/me | JWT | User's rank |
| GET | /admin/moderation/pending | JWT | Pending queue |
| GET | /admin/moderation/flagged | JWT | Flagged submissions |
| POST | /admin/moderation/:id/action | JWT | Approve/Reject/Suspend |

## WebSocket

Connect to `ws://localhost:3000/leaderboard`

```json
// Subscribe
{ "event": "subscribe", "data": { "tournamentId": "uuid" } }

// Receive on approval
{ "event": "leaderboard:update", "data": { "tournamentId": "...", "entries": [...] } }
```

## Tests

```bash
# Backend
cd backend
npm test
npm run test:cov   # coverage report

# iOS
# Run FishLeagueTests target in Xcode (⌘U)
```

## Weekly Reset

The cron job in `WeeklyResetService` closes all open tournaments at **Sunday 23:59 UTC**.
Leaderboard entries are retained for historical records.
Admin manually creates the next week's tournament via the dashboard.

## Deployment (Render / Railway)

1. Push `backend/` as a Docker service, set env vars from `.env.example`
2. Push `admin/` as a Next.js service
3. Attach a managed Postgres instance
4. Set `DATABASE_URL` to the managed DB connection string
5. Ensure S3 bucket policy allows `PutObject` from the backend service role

---

> MVP scope only. Phase 2 adds: push notifications, payment automation, ML fraud detection, multi-region, offline mode.
