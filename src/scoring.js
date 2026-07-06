import { GROUPS, R16_MATCHES } from "./data.js";

const POINTS = 10;

// R32: +10 per correct winner pick. results keyed by match id -> { winner }.
export function scoreR32(r32Picks, results) {
  if (!r32Picks) return 0;
  return r32Picks.reduce((pts, pick, i) => {
    if (!pick || !results[i]?.winner) return pts;
    return pts + (pick === results[i].winner ? POINTS : 0);
  }, 0);
}

// A participant is a "first timer" if R16 is their first submitted round
// (no group-stage or R32 picks). They get a double-points bonus if perfect.
export function isFirstTimer(participant) {
  return !!participant.picks.r16 && !participant.picks.r32 && !participant.picks.groups;
}

// R16: +10 per correct winner pick. picks are index-aligned to R16_MATCHES.
// The 4 "free" matches (Sat/Sun, nobody submitted) award points to EVERY
// participant regardless of whether they submitted R16 picks.
// First-timer bonus: once all 4 real (non-free) matches are decided AND all were
// picked correctly, the participant's whole R16 total is doubled.
export function scoreR16(r16Picks, results, { firstTimer = false } = {}) {
  let base = 0;
  let realDecided = 0;
  let realCorrect = 0;
  R16_MATCHES.forEach((m, i) => {
    const res = results[m.id];
    if (!res?.winner) return;
    if (m.free) {
      base += POINTS; // free for everyone
      return;
    }
    if (!r16Picks) return; // no submission → no picked-match points
    realDecided++;
    if (r16Picks[i] === res.winner) {
      base += POINTS;
      realCorrect++;
    }
  });
  const realTotal = R16_MATCHES.filter((m) => !m.free).length;
  const perfect = r16Picks && realDecided === realTotal && realCorrect === realTotal;
  return firstTimer && perfect ? base * 2 : base;
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
  const r16 = scoreR16(participant.picks.r16, results, { firstTimer: isFirstTimer(participant) });
  const groups = scoreGroups(participant.picks.groups, standings).total;
  return { r32, r16, groups, total: r32 + r16 + groups };
}
