import { kv } from "@vercel/kv";

const ESPN_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
// Group stage: Jun 11-27. R32: Jun 28 - Jul 4. R16 (free + matches): Jul 5 - Jul 8.
const GROUP_DATES = Array.from({ length: 17 }, (_, i) => String(20260611 + i));
const R32_DATES = [
  "20260628", "20260629", "20260630",
  "20260701", "20260702", "20260703", "20260704",
];
const R16_DATES = ["20260705", "20260706", "20260707", "20260708"];
// Quarter-finals: Jul 9-11.
const QF_DATES = ["20260709", "20260710", "20260711"];
// Semi-finals: Jul 14-15.
const SF_DATES = ["20260714", "20260715"];
const ALL_DATES = [...GROUP_DATES, ...R32_DATES, ...R16_DATES, ...QF_DATES, ...SF_DATES];

const FINALS_KEY = "finals"; // map of event id -> raw ESPN event (immutable once post)
const DONE_KEY = "doneDates"; // date strings where every match is final — never re-fetched

// KV is best-effort: missing creds (local dev) or an outage must not crash the
// route — we just lose the durable cache and fall back to live ESPN.
async function kvGet(key) {
  try {
    return await kv.get(key);
  } catch {
    return null;
  }
}
async function kvSet(key, val) {
  try {
    await kv.set(key, val);
  } catch {
    /* no-op */
  }
}

// Fetch one date. Returns {date, events, ok} — ok=false means the request
// failed, so we must NOT treat the date as complete.
async function fetchDate(date) {
  try {
    const d = await fetch(`${ESPN_BASE}?dates=${date}&limit=30`).then((r) =>
      r.json(),
    );
    return { date, events: d.events || [], ok: true };
  } catch {
    return { date, events: [], ok: false };
  }
}

function isFinal(event) {
  return event.competitions?.[0]?.status?.type?.state === "post";
}

export default async function handler(_req, res) {
  const cachedFinals = (await kvGet(FINALS_KEY)) || {};
  const doneDates = new Set((await kvGet(DONE_KEY)) || []);

  // Only hit ESPN for dates that aren't already fully final in the cache.
  const datesToFetch = ALL_DATES.filter((d) => !doneDates.has(d));

  let live = [];
  try {
    const perDate = await Promise.all(datesToFetch.map(fetchDate));
    let finalsDirty = false;
    let doneDirty = false;

    for (const { date, events, ok } of perDate) {
      for (const e of events) {
        if (isFinal(e) && !cachedFinals[e.id]) {
          cachedFinals[e.id] = e;
          finalsDirty = true;
        }
      }
      // A date is complete once it has matches and every one is final.
      if (ok && events.length && events.every(isFinal)) {
        doneDates.add(date);
        doneDirty = true;
      }
      live.push(...events.filter((e) => !isFinal(e)));
    }

    if (finalsDirty) await kvSet(FINALS_KEY, cachedFinals);
    if (doneDirty) await kvSet(DONE_KEY, [...doneDates]);
  } catch {
    // ESPN unreachable: silently serve cached finals only, no live
  }

  // merge: cached finals (durable) + fresh live/pending, dedup by id
  const seen = new Set();
  const merged = [...Object.values(cachedFinals), ...live].filter((e) =>
    seen.has(e.id) ? false : (seen.add(e.id), true),
  );

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ events: merged });
}
