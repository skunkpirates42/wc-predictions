import { MATCHES, GROUPS } from "./data.js";

// Normalize a team name for matching: strip accents/punctuation, unify ESPN's
// spellings with our canonical names.
export function normalize(str) {
  if (!str) return "";
  return str
    .normalize("NFD") // strip accents
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace("united states", "usa")
    .replace("bosnia-herzegovina", "bosnia")
    .replace("ivory coast", "cote d'ivoire")
    .replace("cape verde", "cabo verde")
    .replace("czech republic", "czechia")
    .replace("south korea", "korea republic")
    .replace("turkiye", "turkey")
    .replace("congo dr", "dr congo")
    .replace(/[^a-z]/g, "");
}

// Map an ESPN team display name to its canonical GROUPS name, or null.
const GROUP_TEAM_LOOKUP = {};
for (const teams of Object.values(GROUPS)) {
  for (const t of teams) GROUP_TEAM_LOOKUP[normalize(t)] = t;
}
export function canonicalGroupTeam(espnName) {
  return GROUP_TEAM_LOOKUP[normalize(espnName)] || null;
}

// Match an ESPN fixture (by the two team names) to a MATCHES entry, either ordering.
export function findMatch(homeName, awayName) {
  const h = normalize(homeName);
  const a = normalize(awayName);
  return MATCHES.find((m) => {
    const t1 = normalize(m.t1);
    const t2 = normalize(m.t2);
    return (
      ((h.includes(t1) || t1.includes(h)) &&
        (a.includes(t2) || t2.includes(a))) ||
      ((h.includes(t2) || t2.includes(h)) && (a.includes(t1) || t1.includes(a)))
    );
  });
}

// Compute final group standings from group-stage match results.
// Returns { A: { order: [1st,2nd,3rd,4th], complete, completeDate }, ... }.
// A group is complete once all 6 round-robin matches are final.
export function computeStandings(events) {
  const tables = {}; // letter -> { team -> {pts,gd,gf} }
  const finals = {}; // letter -> count of final matches
  const lastDate = {}; // letter -> latest final match date (YYYY-MM-DD)
  for (const letter of Object.keys(GROUPS)) {
    tables[letter] = {};
    for (const t of GROUPS[letter]) tables[letter][t] = { pts: 0, gd: 0, gf: 0 };
    finals[letter] = 0;
    lastDate[letter] = null;
  }

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (comp?.status?.type?.state !== "post") continue;
    const cs = comp.competitors || [];
    if (cs.length < 2) continue;
    const a = canonicalGroupTeam(cs[0].team?.displayName);
    const b = canonicalGroupTeam(cs[1].team?.displayName);
    if (!a || !b) continue;
    // both teams must belong to the same group (identifies a group-stage match)
    const letter = Object.keys(GROUPS).find(
      (L) => GROUPS[L].includes(a) && GROUPS[L].includes(b),
    );
    if (!letter) continue;
    const sa = parseInt(cs[0].score ?? 0, 10);
    const sb = parseInt(cs[1].score ?? 0, 10);
    const T = tables[letter];
    T[a].gf += sa;
    T[b].gf += sb;
    T[a].gd += sa - sb;
    T[b].gd += sb - sa;
    if (sa > sb) T[a].pts += 3;
    else if (sb > sa) T[b].pts += 3;
    else {
      T[a].pts += 1;
      T[b].pts += 1;
    }
    finals[letter]++;
    const d = (event.date || "").slice(0, 10);
    if (d && (!lastDate[letter] || d > lastDate[letter])) lastDate[letter] = d;
  }

  const standings = {};
  for (const letter of Object.keys(GROUPS)) {
    const order = [...GROUPS[letter]].sort((x, y) => {
      const A = tables[letter][x];
      const B = tables[letter][y];
      return B.pts - A.pts || B.gd - A.gd || B.gf - A.gf;
    });
    standings[letter] = {
      order,
      complete: finals[letter] >= 6,
      completeDate: finals[letter] >= 6 ? lastDate[letter] : null,
    };
  }
  return standings;
}
