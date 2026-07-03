# WC 2026 Predictions — Recharge Leaderboard

Live leaderboard for the Recharge World Cup 2026 predictions game. Covers the
**group stage** and **Round of 32**, auto-fetches results from ESPN, and scores
everyone's picks automatically.

**Live:** https://wc-predictions-rho.vercel.app/

## Features

- 🏆 **Leaderboard** with a scope toggle — Overall / Group Stage / Round of 32.
  Ranks by points, ties broken alphabetically, medals for the top three.
- 📊 **Group stage** — predict the 1st–4th finish in each of the 12 groups.
  Actual standings are computed from real match results (points → goal difference
  → goals for).
- ⚽ **Round of 32** — pick every winner.
- 🗂 **Round sub-tabs** on Results (Groups / R32 / R16 / QF / SF / Final; later
  rounds are grayed until they begin) and on My Picks (Groups / R32).
- 👤 **Player drawer** — tap any name to see their picks vs actual, with a
  **Compare with me** mode that works across both the group stage and R32.
- 📈 **Analytics tab** — cumulative points over time, rank over time, accuracy by
  round, and a points breakdown, all with you highlighted against the field.
- 🔴 **Live scores** — auto-refreshes every 45s while matches are in progress,
  detecting live games via ESPN's `state` field.
- ✋ Manual result override for R32 if ESPN data is unavailable.
- 📱 Mobile-friendly, zero UI dependencies.

## Scoring

- **+10 pts** per correct Round of 32 winner (15 matches → 150 max).
- **+10 pts** per team predicted in its **exact** final group slot (1st/2nd/3rd/4th).
  A group only scores once all 6 of its matches are final. 12 groups × 40 → 480 max.
- Overall = group points + R32 points.

Scoring lives in `src/scoring.js` (pure functions, easy to change).

## Project structure

```
wc-predictions/
├── src/
│   ├── App.jsx          # UI shell: tabs, leaderboard, my picks, results
│   ├── PlayerDrawer.jsx # per-player picks drawer + compare mode
│   ├── GroupViews.jsx   # group standings + group picks views
│   ├── Analytics.jsx    # Analytics tab — inline-SVG charts (no chart lib)
│   ├── analytics.js     # buildTimeline() + accuracyByRound() (pure)
│   ├── scoring.js       # scoreR32 / scoreGroups / scoreTotal (pure)
│   ├── standings.js     # ESPN name-matching + computeStandings() (pure)
│   ├── useScores.js     # ESPN fetch hook + live detection
│   ├── data.js          # MATCHES, GROUPS, FLAGS, PARTICIPANTS (picks)
│   ├── styles.js        # shared inline-style objects
│   ├── *.test.js        # node:test unit tests (scoring, standings, analytics)
│   ├── main.jsx         # React entry
│   └── index.css        # global reset
├── index.html
└── vite.config.js
```

Pure logic (`scoring.js`, `standings.js`, `analytics.js`) is kept free of React so
it's unit-testable on its own.

## Data model (`src/data.js`)

```js
export const GROUPS = { A: ["Mexico", "Korea Republic", ...], /* B..L */ };

export const PARTICIPANTS = [
  {
    name: "Peter Ramos",
    picks: {
      r32: ["Brazil", "Germany", /* …15 winners, null for a missed pick */],
      groups: {
        A: ["Mexico", "Korea Republic", "Czechia", "South Africa"], // 1st→4th
        // …a group may be absent if that person didn't submit it
      },
    },
  },
];
```

Either `r32` or `groups` may be missing — the app handles partial participation
(someone can play the group stage but not R32, or vice-versa).

## How results are fetched

`useScores.js` fetches the ESPN scoreboard for every group-stage date (Jun 11–27)
and every R32 date (Jun 28–Jul 4), de-dupes by event id, then:

- Builds R32 winners (uses ESPN's `winner` flag first, so penalties/AET are correct).
- `computeStandings()` tallies each group table and sorts by FIFA tiebreakers.
- Team-name mismatches (e.g. "Ivory Coast" → "Cote d'Ivoire", "Türkiye" → "Turkey",
  "Cape Verde" → "Cabo Verde") are handled by `normalize()`.

The browser calls the ESPN API directly — ESPN's public scoreboard endpoint allows
cross-origin requests, so no proxy is needed. The group stage is finished, so it's
fetched once and cached; only the R32 dates are re-polled during live refresh.

## Development

Requires Node 18+.

```bash
npm install
npm run dev      # http://localhost:5173 — hits ESPN directly, no setup needed
npm test         # run unit tests (node:test — scoring, standings, analytics)
npm run build    # production build to dist/
npm run preview  # serve the built dist/ locally
```

Everything is client-side; there's no backend to run for local dev.

**Where to make changes**
- Picks / participants / groups → `src/data.js`
- Scoring rules → `src/scoring.js`
- Fetch window, live detection, standings math → `src/useScores.js`
- Charts → `src/Analytics.jsx` (+ data in `src/analytics.js`)

**Charts** are hand-rolled inline SVG (no charting library) with a colorblind-checked
palette; "you" is drawn as a bold ink line against up to eight colored peers, the
rest ghosted.

## Deploy

Pushes to `master` auto-deploy on Vercel. To deploy manually:

```bash
npm install -g vercel
vercel login      # one-time
vercel --prod
```

## Tech stack

- React 18 + Vite
- Vercel (hosting; optional serverless proxy)
- No runtime dependencies beyond React
