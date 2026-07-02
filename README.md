# WC 2026 Predictions — Round of 32 Leaderboard

Live leaderboard for the Recharge World Cup predictions game, with auto-fetching match results from ESPN.

## Features
- 🏆 Live leaderboard ranked by points (10pts per correct pick)
- ⚽ Auto-fetches results from ESPN every 45s during live matches
- 🔴 Live score display with match clock
- ✋ Manual result override if ESPN data is unavailable
- 📱 Mobile-friendly

## Local Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`. The Vite dev server proxies `/api/*` requests — but for local dev the proxy target is `localhost:3001` which won't be running. Instead, temporarily swap the fetch URL in `useScores.js`:

```js
// Change this line in src/useScores.js for local dev:
const resp = await fetch('/api/scores');
// To hit ESPN directly (works from localhost, no CORS issues):
const resp = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
```

Or run Vercel CLI locally which spins up the edge function automatically:

```bash
npm install -g vercel
vercel dev
```

This runs both the Vite dev server and the `/api/scores` edge function together at `http://localhost:3000`.

## Deploy to Vercel

```bash
# One-time setup
npm install -g vercel
vercel login

# Deploy
vercel --prod
```

That's it. Vercel auto-detects the Vite config, builds the React app, and deploys the `api/scores.js` edge function. The proxy handles CORS so the browser never hits ESPN directly.

## Updating Picks / Participants

Edit `src/data.js`:
- `MATCHES` — match list in order
- `PARTICIPANTS` — add/remove people, update picks array (must match MATCHES order, use `null` for missed picks)

## How Scoring Works

- **+10 pts** for each correct Round of 32 winner pick
- Maximum: 150 pts for a perfect bracket

## Tech Stack

- React 18 + Vite
- Vercel serverless function (ESPN proxy)
- No other dependencies
