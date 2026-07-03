# Multi-Round Support (Group Stage + R32) — Design

Status: **DRAFT — pending user approval.** Defaults chosen while user was away; each is overridable.

## Goal
Irving's request: expand the dashboard beyond Round of 32 to cover more of the
bracket. This pass adds the **group stage** (predict 1st–4th per group vs actual
final standings) alongside the existing R32 view, and restructures `data.js` so
the remaining rounds (R16/QF/SF/Final) slot in later without another migration.

Out of scope this pass: R16, QF, SF, Final views. Structure supports them; UI does not.

## Decisions (defaults — confirm)
1. **Missing picks:** Ship partial. Only Peter's group picks exist in the repo
   today (handoff lines 145–158). Build so the group view works for anyone with
   `picks.groups` and shows "no group picks" for the rest. Backfill the other 19
   from the Slack group-stage thread later.
2. **Scoring:** Exact position. +10 per team predicted in its exact final slot
   (1st/2nd/3rd/4th). Max 40 per group, 480 across 12 groups. R32 scoring
   unchanged (+10 per correct winner).
3. **Standings source:** Compute from match results. No dependency on an
   undocumented ESPN standings endpoint.

## Data model (`data.js`)

### New static: group composition
```js
export const GROUPS = {
  A: ["...", "...", "...", "..."],  // all 48 teams, 12 groups of 4
  // ...L
};
```
Needed to (a) render group cards and (b) attribute each ESPN match to a group
(a match belongs to group X when both teams ∈ GROUPS[X]).
**Open:** full 48-team assignment not yet in repo — must be sourced before build.

### Restructured participants
```js
export const PARTICIPANTS = [
  {
    name: "Peter Ramos",
    picks: {
      groups: { A: ["Mexico","Korea Republic","Czechia","South Africa"], /* ...L */ },
      r32: ["Brazil","Germany", /* ...15 */],
    },
  },
  // others: { picks: { r32: [...] } }  // groups omitted until backfilled
];
```
Migration: today's flat `picks: [...]` becomes `picks.r32`. `picks.groups` is
optional. A missing group (or a group with a `null`/missing entry) is not scored.

## Standings computation (`useScores.js`)

Extend the fetch to include group-stage dates (Jun 11–27, `20260611`–`20260627`)
in addition to the existing R32 dates. Then:

`computeStandings(events, GROUPS) -> { A: [team1st, team2nd, team3rd, team4th], ... }`

- For each group, gather its 6 matches from fetched events (both teams ∈ group).
- Tally each team from **final** matches only (`state === "post"`): W=3, D=1, L=0;
  track GD and GF.
- Sort by FIFA tiebreakers: points → goal difference → goals scored.
  (Head-to-head / fair-play tiebreakers omitted — YAGNI unless a real tie needs it.)
- A group is **complete** only when all 6 matches are final. Incomplete groups
  return provisional order but are flagged `complete: false` and are **not scored**.

Reuses existing team-name `normalize()` for matching ESPN names to `GROUPS`.

Hook return adds: `groupStandings` (map) and per-group `complete` flags.

## Scoring (`src/scoring.js` — new module)

Pull scoring out of `App.jsx` into a small tested module:
- `scoreR32(r32Picks, results)` — existing logic, moved.
- `scoreGroups(groupPicks, groupStandings)` — for each group that has picks AND
  is complete: +10 per exact-slot match. Returns `{ total, byGroup }`.
- `scoreTotal(participant, { results, groupStandings })` — sums rounds present.

## UI (`App.jsx`)

Keep the three content tabs (leaderboard / my picks / results). Add a **round
selector** where round actually matters:

- **Leaderboard:** total points across rounds, with breakdown columns
  (Groups / R32). Sort by total. Existing "you" highlight + drawer preserved.
  Drawer gains a round toggle to view group vs R32 picks.
- **My picks & Results:** add a round sub-selector `Groups | R32`. Grayed when a
  round has no picks / no data yet.
  - **Groups view:** 12 group cards. Each shows predicted 1st–4th beside actual
    standings; correct slots green, wrong red; "provisional" tag until complete.
  - **R32 view:** unchanged from today.

## Testing
- `scoring.js`: unit tests — exact-slot credit, partial/missing groups, null picks,
  incomplete-group → zero.
- `computeStandings`: unit test against a captured ESPN group-stage fixture
  (points/GD/GF ordering, tie handling).

## Risks / open items
- **Group composition data** (48 teams) not in repo — blocker for build.
- **Other participants' group picks** missing — partial ship mitigates.
- ESPN group-stage matches must be within the fetched date window; verify actual
  dates against the schedule before shipping (R32 had a per-period status bug —
  same class of "assumed value vs actual" risk).
- Tiebreakers beyond pts/GD/GF not implemented; acceptable unless a real standings
  tie occurs.
