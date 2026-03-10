# FishLeague MVP – Architecture

## System Diagram

```mermaid
graph TD
    subgraph iOS["📱 iOS App (Swift/SwiftUI)"]
        A1[LoginView / RegisterView]
        A2[TournamentHomeView]
        A3[SubmissionFlowView<br/>CameraView + QR + GPS]
        A4[LeaderboardView]
    end

    subgraph Backend["⚙️ NestJS Backend (Node.js)"]
        B1[AuthController<br/>/auth/register, /login, /apple]
        B2[TournamentsController<br/>/tournaments/active]
        B3[SubmissionsController<br/>/submissions - multipart]
        B4[ModerationController<br/>/admin/moderation/*]
        B5[LeaderboardController<br/>/leaderboard/:id]
        B6[LeaderboardGateway<br/>WebSocket /leaderboard]
        B7[WeeklyResetService<br/>Cron – Sunday 23:59]
    end

    subgraph Admin["🖥️ Next.js Admin Dashboard"]
        C1[Moderation Queue<br/>Approve / Reject / Suspend]
        C2[Tournament Manager<br/>Create / Open / Close]
        C3[Leaderboard View]
    end

    subgraph Infra["🏗️ Infrastructure"]
        DB[(PostgreSQL<br/>Prisma ORM)]
        S3[(AWS S3<br/>Photo Storage)]
    end

    A1 -->|JWT| B1
    A2 -->|REST| B2
    A3 -->|multipart POST| B3
    A4 -->|REST + WebSocket| B5
    A4 <-->|WS subscribe/update| B6

    B3 -->|upload photos| S3
    B3 -->|persist| DB
    B4 -->|moderate| DB
    B4 -->|on approve| B5
    B5 -->|broadcast| B6
    B7 -->|close tournaments| DB

    C1 -->|JWT REST| B4
    C2 -->|JWT REST| B2
    C3 -->|JWT REST| B5

    B1 & B2 & B3 & B4 & B5 --> DB
```

## Submission Flow (Happy Path)

```mermaid
sequenceDiagram
    participant App as iOS App
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

## Anti-Cheat Summary

| Check | Layer | Action |
|-------|-------|--------|
| QR must be in frame | iOS (AVFoundation) | Block capture button |
| GPS inside region bounding box | Server (SubmissionsService) | 400 rejection |
| Submission within tournament window | Server | 400 rejection |
| QR not reused by another account | Server (DB query) | 400 rejection |
| Duplicate image hash | Server (MD5) | Flag for moderation |
| Repeated GPS coordinates | Server (count query) | Flag for moderation |
| Prize positions manual review | Admin dashboard | Required before payout |
```
