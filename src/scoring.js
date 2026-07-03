import { GROUPS } from "./data.js";

const POINTS = 10;

// R32: +10 per correct winner pick. results keyed by match id -> { winner }.
export function scoreR32(r32Picks, results) {
  if (!r32Picks) return 0;
  return r32Picks.reduce((pts, pick, i) => {
    if (!pick || !results[i]?.winner) return pts;
    return pts + (pick === results[i].winner ? POINTS : 0);
  }, 0);
}

// Groups: +10 per team in its exact final slot. Only complete groups are scored.
// standings keyed by group letter -> { order: [1st,2nd,3rd,4th], complete: bool }.
export function scoreGroups(groupPicks, standings) {
  if (!groupPicks || !standings) return { total: 0, byGroup: {} };
  const byGroup = {};
  let total = 0;
  for (const letter of Object.keys(GROUPS)) {
    const picks = groupPicks[letter];
    const st = standings[letter];
    if (!picks || !st?.complete) continue;
    let gPts = 0;
    for (let slot = 0; slot < 4; slot++) {
      if (picks[slot] && picks[slot] === st.order[slot]) gPts += POINTS;
    }
    byGroup[letter] = gPts;
    total += gPts;
  }
  return { total, byGroup };
}

export function scoreTotal(participant, { results, standings }) {
  const r32 = scoreR32(participant.picks.r32, results);
  const groups = scoreGroups(participant.picks.groups, standings).total;
  return { r32, groups, total: r32 + groups };
}
