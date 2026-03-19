# FishLeague – Competitive Analysis

> **Usage:** Paste your competitive analysis content here. Referenced during feature prioritization and roadmap planning.

---

<!-- Add competitive analysis content below -->

## iAngler Tournament vs. FishLeague — Gap & Innovation Report

### Where iAngler Has You Covered (and so do you)

Both platforms share the same core loop: photo submission → GPS tagging → admin review → live leaderboard. You're not behind on fundamentals.

---

### Gaps iAngler Has That You Don't

| Feature | iAngler | FishLeague |
| --- | --- | --- |
| **Offline submission queue** | Saves locally, auto-syncs on reconnect | Partial — `submissionQueue.ts` exists but UX unclear |
| **Guest/spectator view** | View leaderboard without account | Requires login |
| **Rejection notes to angler** | Admin sends explanation on reject | Email/push sent but no free-text note to angler visible on mobile |
| **Multiple scoring methods** | Length, weight, fish count, species, item count | Length only |
| **Team tournaments** | Full team registration + scoring | Individual only |
| **Tournament director messaging** | Broadcast announcements to all participants | Not implemented |
| **Historical leaderboards** | Past tournaments browsable | Not implemented (closed tournaments disappear) |
| **Species selection** | Angler selects species on submission | Not implemented |
| **Weather + tides in-app** | Forecast tab built-in | Separate screen (FishingIntelligenceScreen) — you have this |
| **Prize/random drawing** | Built-in for prize selection | Not implemented |

---

### Where You Are More Innovative

This is your real advantage — iAngler's app has a **2.8-star rating** and focuses entirely on operator workflow. You've already built things they haven't:

| Feature | iAngler | FishLeague |
| --- | --- | --- |
| **Props + Comments on catches** | None | Built and shipped |
| **Social profiles** | None | AnglerProfile with bio, techniques, sponsorTags |
| **GPS-based region detection** | Fixed region assignment | Auto-detect from GPS (just shipped) |
| **Design system** | Dated UI (10+ year old app) | Polished dark/cream split, Oswald/Inter |
| **ARKit LiDAR measurement** | None | Planned (post-beta backlog) |
| **Apple Sign-In** | Email only | Apple + Email |

---

### Innovation Opportunities (What Neither Platform Does Well)

These would clearly differentiate FishLeague:

1. **AI fish identification** — Angler photos the fish, AI identifies species + estimates length. Eliminates manual entry. Could use a vision model API (Claude, GPT-4V) or a specialized fish-ID model (iNaturalist API). Medium effort.
2. **Public spectator mode** — Share a live leaderboard link to non-users (family watching from shore). iAngler has guest login; you could do a fully public shareable URL per tournament with no login wall. Low effort.
3. **Catch feed / social timeline** — Approved catches appear in a public photo feed (like Instagram for fishing). You already have the HomeScreen feed partially built — expanding this is low-hanging fruit.
4. **Tournament brackets / head-to-head** — Not just raw rankings but structured brackets or divisions. Medium effort, high engagement.
5. **Angler stats page** — Career stats: total fish, longest catch, total tournaments, win rate. You have the data; it's just a presentation layer. Low effort.
6. **QR code tournament check-in** — Anglers scan a QR at launch to register for a tournament instead of selecting from a list. Ties into your existing `matSerialId` QR infrastructure.
7. **Conservation mode** — Catch-and-release tracking (iAngler tracks "125,870 fish released"). Adds a feel-good metric and differentiates you in the conservation-conscious fishing market.

---

### Priority Recommendations

**Quick wins** (low effort, high value):

- Public spectator leaderboard link (no login required)
- Rejection note visible to angler in-app (you already send email, just show it)
- Historical closed tournaments browsable
- Species field on submission

**Post-beta but important:**

- Team tournaments (opens up club/organization market)
- AI species identification
- Angler career stats page

iAngler's weak spot is clearly UX and social engagement — that's your moat. Their app has a **2.8-star rating** with recent bug reports. If you ship a polished, social-first experience with the core tournament mechanics solid, you have a strong competitive position.