import { GROUPS } from "./data.js";
import { scoreGroups } from "./scoring.js";

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
      let pts = scoreGroups(p.picks.groups, stUpTo).total;
      // r32 matches decided on or before this date
      for (const [id, r] of Object.entries(results)) {
        if (r?.date && r.date <= d && r.winner && p.picks.r32?.[id] === r.winner)
          pts += 10;
      }
      return pts;
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
  const r32Correct = (picks) =>
    (picks || []).filter(
      (pk, i) => pk && results[i]?.winner && pk === results[i].winner,
    ).length;
  const groupCorrect = (picks) => scoreGroups(picks, standings).total / 10;

  const r32Total = Object.values(results).filter((r) => r?.winner).length;
  const groupTotal = Object.values(standings).filter((s) => s?.complete).length * 4;

  const withR32 = participants.filter((p) => p.picks.r32);
  const withGroups = participants.filter((p) => p.picks.groups);
  const avg = (arr, f) => (arr.length ? arr.reduce((s, p) => s + f(p), 0) / arr.length : 0);

  return {
    r32: {
      you: r32Correct(participant.picks.r32),
      avg: avg(withR32, (p) => r32Correct(p.picks.r32)),
      total: r32Total,
    },
    groups: {
      you: groupCorrect(participant.picks.groups),
      avg: avg(withGroups, (p) => groupCorrect(p.picks.groups)),
      total: groupTotal,
    },
  };
}
