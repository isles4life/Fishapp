# FishLeague – Competitive Analysis

> **Usage:** Paste your competitive analysis content here. Referenced during feature prioritization and roadmap planning.

---

## iAngler Tournament vs. FishLeague — Gap & Innovation Report

### Where iAngler Has You Covered (and so do you)

Both platforms share the same core loop: photo submission → GPS tagging → admin review → live leaderboard. You're not behind on fundamentals.

---

### Gaps iAngler Had That Are Now Closed ✅

| Feature | iAngler | FishLeague | Shipped |
| --- | --- | --- | --- |
| **Offline submission queue** | Saves locally, auto-syncs on reconnect | `submissionQueue.ts` + UX | Build #21 |
| **Guest/spectator view** | View leaderboard without account | Public `/leaderboard/[id]/` — no login required | Web deploy |
| **Rejection notes to angler** | Admin sends explanation on reject | Rejection note shown in-app + email/push | Build #21 |
| **Tournament director messaging** | Broadcast announcements to all participants | `POST /tournaments/:id/announce` → push to all participants | Build #21 |
| **Historical leaderboards** | Past tournaments browsable | Closed tournaments browsable with submission counts | Build #21 |
| **Species selection** | Angler selects species on submission | 24-species picker + AI auto-suggest (≥70% confidence) | Build #21 |
| **Prize/random drawing** | Built-in for prize selection | Weighted or flat random draw in admin | Build #21 |
| **AI fish identification** | None | iNaturalist species ID + Gemini length estimation, fire-and-forget fraud checks | Backend |
| **Catch feed / social timeline** | None | HomeScreen photo feed with props + comments | Build #23 |
| **Angler career stats** | None | 6-card career stats grid on profile | Build #23 |
| **QR code tournament check-in** | None | Admin generates QR → anglers scan to check in | Build #23 |
| **Conservation mode** | Tracks "125,870 fish released" counter | Per-catch released toggle + conservation badges | Build #23 |

---

### Gaps That Remain Open ❌

| Feature | iAngler | FishLeague | Notes |
| --- | --- | --- | --- |
| **Multiple scoring methods** | Length, weight, fish count, species count, item count | Length only | Medium effort — schema change + tournament creation UI |
| **Team tournaments** | Full team registration + combined scoring | Individual only | High effort — opens club/org market |
| **Tournament brackets / head-to-head** | None (iAngler doesn't have this either) | Not built | Medium effort, high engagement |

---

### Where You Are More Innovative

iAngler's app has a **2.8-star rating** and focuses entirely on operator workflow. FishLeague leads on UX and social engagement:

| Feature | iAngler | FishLeague |
| --- | --- | --- |
| **Props + Comments on catches** | None | Built and shipped (Build #23) |
| **Comment edit/delete** | None | Long-press to edit or delete own comments (Build #23) |
| **Social profiles** | None | AnglerProfile — bio, techniques, baits, sponsorTags, career stats |
| **GPS-based region detection** | Fixed region assignment | Auto-detect from GPS at submission time |
| **Design system** | Dated UI (10+ year old app) | Polished dark/cream split, Oswald/Inter fonts |
| **AI fraud detection** | None | iNaturalist fish presence check + Gemini length estimation |
| **Tournament Director role** | Fixed admin only | Anglers can request TD role, scoped admin panel |
| **ARKit LiDAR measurement** | None | Planned (post-beta backlog) |
| **Apple Sign-In** | Email only | Apple + Email |

---

### Post-Beta Roadmap

Ordered by impact:

1. **Multiple scoring methods** — unblock weight-based and species-count tournaments
2. **Email verification** — needed before wider user acquisition
3. **Stripe entry fees** — first beta tournament free; payment sheet in mobile
4. **Team tournaments** — opens club/organization market
5. **Facebook Sign-In** — mobile + web only (~1 day code, 1–5 days App Review)
6. **Tournament brackets / head-to-head** — structured divisions, high engagement
7. **ARKit LiDAR fish measurement** — tap-to-measure AR on iPhone Pro, ~4 days effort

iAngler's weak spot is clearly UX and social engagement — that's your moat. If you ship a polished, social-first experience with the core tournament mechanics solid, you have a strong competitive position.
