const R32_DATES = [
  '20260628', '20260629', '20260630',
  '20260701', '20260702', '20260703', '20260704',
];

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; WC-Predictions/1.0)' };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  try {
    const responses = await Promise.all(
      R32_DATES.map(date =>
        fetch(`${BASE}?dates=${date}&limit=20`, { headers: HEADERS })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );

    const seen = new Set();
    const events = responses
      .filter(Boolean)
      .flatMap(data => data.events || [])
      .filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ events });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}