# FishLeague – Architecture

## System Diagram

```mermaid
graph TD
    subgraph Mobile["📱 Mobile App (React Native / Expo — iOS + Android)"]
        A1[LoginScreen / RegisterScreen]
        A2[TournamentHomeScreen]
        A3[SubmissionFlowScreen<br/>CameraView + QR + GPS]
        A4[LeaderboardScreen]
    end

    subgraph Web["🌐 Web (Next.js — public)"]
        W1[Public Leaderboard<br/>no auth required]
        W2[Login / Register]
    end

    subgraph Admin["🖥️ Next.js Admin Dashboard"]
        C1[Moderation Queue<br/>Approve / Reject / Suspend]
        C2[Tournament Manager<br/>Create / Open / Close]
        C3[Leaderboard View]
        C4[Users<br/>Role management + Suspend]
        C5[History<br/>Audit log]
    end

    subgraph Backend["⚙️ NestJS Backend (Node.js)"]
        B1[AuthController<br/>/auth/register, /login, /apple]
        B2[TournamentsController<br/>/tournaments/*]
        B3[SubmissionsController<br/>/submissions]
        B4[ModerationController<br/>/admin/moderation/*]
        B5[LeaderboardController<br/>/leaderboard/:id]
        B6[LeaderboardGateway<br/>WebSocket /leaderboard]
        B7[WeeklyResetService<br/>Cron – Sunday 23:59 UTC]
        B8[UsersController<br/>/users/*]
        B9[AuditController<br/>/admin/audit]
    end

    subgraph Guards["🔒 Auth & RBAC"]
        G1[JwtAuthGuard<br/>validates Bearer token]
        G2[AdminGuard<br/>requires role=ADMIN]
    end

    subgraph Infra["🏗️ Infrastructure"]
        DB[(PostgreSQL / RDS<br/>Prisma ORM)]
        S3[(AWS S3<br/>Photo Storage)]
        SM[(Secrets Manager<br/>DATABASE_URL, JWT_SECRET)]
    end

    A1 -->|POST /auth/login or /apple| B1
    A2 -->|GET /tournaments/active| B2
    A3 -->|POST /submissions multipart| B3
    A4 -->|GET /leaderboard/:id| B5
    A4 <-->|WS subscribe/update| B6

    W1 -->|GET /tournaments/open public| B2
    W1 -->|GET /leaderboard/:id public| B5
    W2 -->|POST /auth/login| B1

    B1 -->|on success| B9
    B3 -->|upload photos| S3
    B3 -->|persist| DB
    B4 -->|moderate| DB
    B4 -->|on approve| B5
    B5 -->|broadcast| B6
    B7 -->|close tournaments| DB
    B8 -->|on role/suspend change| B9

    C1 -->|JWT + AdminGuard| B4
    C2 -->|JWT + AdminGuard| B2
    C3 -->|JWT + AdminGuard| B5
    C4 -->|JWT + AdminGuard| B8
    C5 -->|JWT + AdminGuard| B9

    B1 & B2 & B3 & B4 & B5 & B8 & B9 --> DB
    B2 & B8 -->|audit events| B9
    SM -->|injected at startup| DB
```

## Submission Flow (Happy Path)

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant API as NestJS API
    participant S3
    participant DB as PostgreSQL
    participant WS as WebSocket Gateway
    participant Admin

    App->>API: POST /submissions (multipart: 2 photos + metadata)
    API->>API: Validate JWT
    API->>DB: Check tournament open & in window
    API->>API: Validate GPS inside region bounding box
    API->>DB: Validate mat serial not reused by another user
    API->>API: Compute MD5 hashes; check for duplicates
    API->>S3: Upload photo1, photo2
    API->>DB: Create Submission (status=PENDING)
    API-->>App: { submissionId, status: "PENDING" }

    Admin->>API: POST /admin/moderation/:id/action { action: "APPROVE" }
    API->>DB: Update Submission status=APPROVED
    API->>DB: Upsert LeaderboardEntry (keep longest fish)
    API->>DB: Recompute ranks
    API->>WS: broadcastLeaderboardUpdate(tournamentId, top25)
    WS-->>App: leaderboard:update event
```

## Authentication & RBAC Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB
    participant AuditLog

    Client->>API: POST /auth/login { email, password, platform }
    API->>DB: Find user by email
    API->>API: bcrypt.compare(password, hash)
    alt suspended
        API-->>Client: 401 "Your account has been suspended..."
    else invalid credentials
        API-->>Client: 401 "Invalid credentials"
    else success
        API->>AuditLog: USER_LOGIN { platform, authProvider, email }
        API-->>Client: { token, userId }
    end

    Client->>API: GET /admin/audit (Bearer token)
    API->>API: JwtAuthGuard — decode token, attach user
    API->>API: AdminGuard — check user.role === ADMIN
    alt not admin
        API-->>Client: 403 Forbidden
    else admin
        API->>DB: AuditLog.findMany(orderBy: createdAt desc)
        API-->>Client: AuditEntry[]
    end
```

## Audit Log

All significant admin and auth actions are recorded in the `AuditLog` table.

| Event | Actor | Details stored |
|-------|-------|---------------|
| `USER_LOGIN` | The user themselves | platform, authProvider, email |
| `TOURNAMENT_CREATED` | Admin | name, weekNumber, year |
| `TOURNAMENT_OPENED` | Admin | name |
| `TOURNAMENT_CLOSED` | Admin | name |
| `USER_PROMOTED_TO_ADMIN` | Admin | targetName, targetEmail |
| `USER_DEMOTED_TO_USER` | Admin | targetName, targetEmail |
| `USER_SUSPENDED` | Admin | targetName, targetEmail |
| `USER_UNSUSPENDED` | Admin | targetName, targetEmail |

Login platform values: `admin` | `web` | `mobile`

## Database Schema (8 Tables)

```
User              — id, email, appleId, authProvider, displayName, regionId,
                    role (USER|ADMIN), passwordHash, suspended, createdAt

Region            — id, name, minLat, maxLat, minLng, maxLng

Tournament        — id, regionId, name, weekNumber, year, startsAt, endsAt, isOpen

MatSerial         — id, serialCode, isActive

Submission        — id, userId, tournamentId, matSerialId, status (PENDING|APPROVED|
                    REJECTED|FLAGGED), fishLengthCm, gpsLat, gpsLng, capturedAt,
                    photo1Key, photo2Key, imageHash1, imageHash2,
                    flagDuplicateHash, flagDuplicateGps

LeaderboardEntry  — id, tournamentId, userId, fishLengthCm, submissionId, rank

ModerationAction  — id, submissionId, moderatorId, actionType, note, createdAt

AuditLog          — id, action, actorId, actorName, targetId, details (JSON), createdAt
```

## Anti-Cheat Summary

| Check | Layer | Action |
|-------|-------|--------|
| QR must be in frame | Mobile (AVFoundation / camera) | Block capture button |
| GPS inside region bounding box | Server (SubmissionsService) | 400 rejection |
| Submission within tournament window | Server | 400 rejection |
| QR not reused by another account | Server (DB query) | 400 rejection |
| Duplicate image hash | Server (MD5) | Flag for moderation |
| Repeated GPS coordinates | Server (count query) | Flag for moderation |
| Prize positions manual review | Admin dashboard | Required before payout |

## CI/CD Pipeline

```mermaid
graph LR
    Push[git push master] --> Changes{paths-filter}
    Changes -->|backend/**| BackendJob[Build + Push ECR<br/>Deploy ECS backend]
    Changes -->|admin/**| AdminJob[Build + Push ECR<br/>Deploy ECS admin]
    BackendJob & AdminJob --> Done[~4 min total]
```

- Jobs run in **parallel** — independent service changes don't block each other
- Docker layer caching: `docker pull :latest` before build reuses unchanged layers
- ECS container startup: `prisma db push && seed.js && main.js`
- Secrets fetched from AWS Secrets Manager at runtime (no secrets in image)
