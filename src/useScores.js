import { useState, useEffect, useCallback } from "react";
import { MATCHES, GROUPS } from "./data.js";

function normalize(s) {
  if (!s) return "";
  return s
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
function canonicalGroupTeam(espnName) {
  return GROUP_TEAM_LOOKUP[normalize(espnName)] || null;
}

// Compute final group standings from group-stage match results.
// Returns { A: { order: [1st,2nd,3rd,4th], complete: bool }, ... }.
// A group is complete once all 6 round-robin matches are final.
function computeStandings(events) {
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
    const sa = parseInt(cs[0].score ?? 0);
    const sb = parseInt(cs[1].score ?? 0);
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

function findMatch(homeName, awayName) {
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

export function useScores() {
  const [results, setResults] = useState({});
  const [liveScores, setLiveScores] = useState({});
  const [groupStandings, setGroupStandings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasLive, setHasLive] = useState(false);

  const fetch_scores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ESPN_BASE =
        "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
      const R32_DATES = [
        "20260628",
        "20260629",
        "20260630",
        "20260701",
        "20260702",
        "20260703",
        "20260704",
      ];
      // group stage: Jun 11-27
      const GROUP_DATES = Array.from({ length: 17 }, (_, i) =>
        String(20260611 + i),
      );
      const allResponses = await Promise.all(
        [...GROUP_DATES, ...R32_DATES].map((date) =>
          fetch(`${ESPN_BASE}?dates=${date}&limit=30`)
            .then((r) => r.json())
            .catch(() => null),
        ),
      );
      const seen = new Set();
      const allEvents = allResponses
        .filter(Boolean)
        .flatMap((d) => d.events || [])
        .filter((e) => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });
      const newResults = {};
      const newLive = {};
      let anyLive = false;

      allEvents.forEach((event) => {
        const comp = event.competitions?.[0];
        if (!comp) return;
        const competitors = comp.competitors || [];
        if (competitors.length < 2) return;

        const home =
          competitors.find((c) => c.homeAway === "home") || competitors[0];
        const away =
          competitors.find((c) => c.homeAway === "away") || competitors[1];
        const homeName = home.team?.displayName || "";
        const awayName = away.team?.displayName || "";
        const homeScore = parseInt(home.score ?? 0);
        const awayScore = parseInt(away.score ?? 0);
        const statusName = comp.status?.type?.name || "";
        const state = comp.status?.type?.state || "";
        const clock = comp.status?.displayClock || "";

        // ESPN state is the robust signal: pre | in | post.
        // statusName has per-period values (STATUS_FIRST_HALF, STATUS_SECOND_HALF,
        // STATUS_HALFTIME, STATUS_IN_PROGRESS...) so name-matching misses live games.
        const isLive = state === "in";
        const isFinal = state === "post";
        const isPens = statusName === "STATUS_FINAL_PEN";
        const isAET = statusName === "STATUS_FINAL_AET";

        if (isLive) anyLive = true;

        const match = findMatch(homeName, awayName);
        if (!match) return;

        // Use ESPN's winner flag first (reliable for pens/AET), fall back to score
        let winner = null;
        if (home.winner) winner = home.team?.displayName;
        else if (away.winner) winner = away.team?.displayName;
        else if (homeScore > awayScore) winner = home.team?.displayName;
        else if (awayScore > homeScore) winner = away.team?.displayName;

        // Map ESPN display name back to our data key
        const winnerKey = winner
          ? normalize(winner) === normalize(homeName)
            ? match.t1
            : match.t2
          : null;

        if (isLive) {
          newLive[match.id] = {
            homeScore,
            awayScore,
            clock,
            homeName,
            awayName,
            winner: winnerKey,
          };
        } else if (isFinal) {
          newResults[match.id] = {
            winner: winnerKey,
            homeScore,
            awayScore,
            isPens,
            isAET,
            date: (event.date || "").slice(0, 10),
          };
        }
      });

      setResults(newResults);
      setLiveScores(newLive);
      setGroupStandings(computeStandings(allEvents));
      setHasLive(anyLive);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetch_scores();
  }, [fetch_scores]);

  // Auto-refresh every 45s when there are live matches
  useEffect(() => {
    if (!hasLive) return;
    const interval = setInterval(fetch_scores, 45_000);
    return () => clearInterval(interval);
  }, [hasLive, fetch_scores]);

  // Allow manual override of results (fallback)
  const setManualResult = useCallback((matchId, winner) => {
    setResults((r) => {
      const existing = r[matchId];
      if (existing?.winner === winner) {
        const next = { ...r };
        delete next[matchId];
        return next;
      }
      return { ...r, [matchId]: { winner, manual: true } };
    });
  }, []);

  return {
    results,
    liveScores,
    groupStandings,
    loading,
    error,
    lastUpdated,
    hasLive,
    refresh: fetch_scores,
    setManualResult,
  };
}
