import { GROUPS, MATCHES } from "./data.js";
import { scoreGroups, scoreR32, scoreR16, isFirstTimer } from "./scoring.js";

// result id -> { round, idx (position within that round's pick array), free }
const MATCH_BY_ID = {};
MATCHES.forEach((m) => {
  const idx = MATCHES.filter((x) => x.round === m.round).indexOf(m);
  MATCH_BY_ID[m.id] = { round: m.round, idx, free: !!m.free };
});

// Did this participant earn points for a decided bracket match?
function bracketHit(participant, id, winner) {
  const info = MATCH_BY_ID[id];
  if (!info || !winner) return false;
  if (info.free) return true; // free matches score for everyone
  return participant.picks[info.round]?.[info.idx] === winner;
}

// Cumulative points + rank per participant across the tournament timeline.
// Timeline points are the dates things actually score: each group's completion
// date (exact-slot points land when the group finishes) and each R32 match date.
export function buildTimeline(participants, results, standings) {
  const dateSet = new Set();
  for (const L of Object.keys(GROUPS)) {
    if (standings[L]?.completeDate) dateSet.add(standings[L].completeDate);
  }
  for (const r of Object.values(results)) if (r?.date) dateSet.add(r.date);
  const dates = [...dateSet].sort();
  if (!dates.length) return { dates: [], series: [] };

  const series = participants.map((p) => {
    const cum = dates.map((d) => {
      // groups complete on or before this date
      const stUpTo = {};
      for (const L of Object.keys(GROUPS)) {
        const st = standings[L];
        if (st?.complete && st.completeDate && st.completeDate <= d)
          stUpTo[L] = st;
      }
      // results decided on or before this date — reuse the scorers so the
      // first-timer R16 doubling lands exactly as it does on the leaderboard.
      const resUpTo = {};
      for (const [id, r] of Object.entries(results)) {
        if (r?.date && r.date <= d) resUpTo[id] = r;
      }
      return (
        scoreGroups(p.picks.groups, stUpTo).total +
        scoreR32(p.picks.r32, resUpTo) +
        scoreR16(p.picks.r16, resUpTo, { firstTimer: isFirstTimer(p) })
      );
    });
    return { name: p.name, cum, rank: [] };
  });

  // rank at each date (1 = best) by cumulative points, alpha tiebreak
  dates.forEach((_, di) => {
    [...series]
      .sort((a, b) => b.cum[di] - a.cum[di] || a.name.localeCompare(b.name))
      .forEach((s, i) => {
        s.rank[di] = i + 1;
      });
  });

  return { dates, series };
}

// Correct-pick counts per round for one participant, vs the field average.
export function accuracyByRound(participant, participants, results, standings) {
  // decided match ids per round
  const decided = (round) =>
    MATCHES.filter((m) => m.round === round && results[m.id]?.winner);
  const bracketCorrect = (participant, round) =>
    decided(round).filter((m) => bracketHit(participant, m.id, results[m.id].winner)).length;
  const groupCorrect = (picks) => scoreGroups(picks, standings).total / 10;

  const r32Total = decided("r32").length;
  const r16Total = decided("r16").length;
  const groupTotal = Object.values(standings).filter((s) => s?.complete).length * 4;

  const withR32 = participants.filter((p) => p.picks.r32);
  const withR16 = participants.filter((p) => p.picks.r16);
  const withGroups = participants.filter((p) => p.picks.groups);
  const avg = (arr, f) => (arr.length ? arr.reduce((s, p) => s + f(p), 0) / arr.length : 0);

  return {
    r32: {
      you: bracketCorrect(participant, "r32"),
      avg: avg(withR32, (p) => bracketCorrect(p, "r32")),
      total: r32Total,
    },
    r16: {
      you: bracketCorrect(participant, "r16"),
      avg: avg(withR16, (p) => bracketCorrect(p, "r16")),
      total: r16Total,
    },
    groups: {
      you: groupCorrect(participant.picks.groups),
      avg: avg(withGroups, (p) => groupCorrect(p.picks.groups)),
      total: groupTotal,
    },
  };
}
