# Multi-round refactor plan

Full design: docs/superpowers/specs/2026-07-02-multi-round-groups-design.md
Extracted data: scratchpad/merged-reconciled.json (34 people)

## Scoring decision
- R32: +10 per correct winner (unchanged)
- Groups: +10 per team in EXACT final slot (1st/2nd/3rd/4th). Max 40/group.
- Isolated in scoring.js — one-line swap if rule differs.
- Out of scope: "+50 tournament winner" (Final round, later pass).

## Stage 1 — data + scoring (keeps app working, R32 intact)
1. src/data.js
   - keep MATCHES
   - expand FLAGS (+18 group-only teams)
   - add GROUPS static (12 groups × 4)
   - restructure PARTICIPANTS: picks: { r32: [...]|null, groups: {A..L}|null }
   - 34 people (20 R32 + 14 groups-only)
   - generate programmatically from merged-reconciled.json
2. src/scoring.js (new): scoreR32, scoreGroups, scoreTotal + node smoke test
3. src/App.jsx: adapt to picks.r32 (leaderboard/my picks/results + drawer). Fair sort already done.
4. verify: build + smoke test scoring

## Stage 2 — group standings + group UI
5. src/useScores.js: fetch group dates (Jun 11-27), computeStandings() (pts→GD→GF), return groupStandings + complete flags
6. src/App.jsx: round sub-selector (Groups|R32), group view (12 cards predicted vs actual), leaderboard per-round breakdown
7. verify: build + check standings vs real ESPN

## Notes
- partial picks (null group / null r32) must not break scoring or UI
- Peter legit 10/12 (missed E,F)
