import { useState, useEffect, useCallback } from "react";
import { normalize, findMatch, computeStandings } from "./standings.js";

// Server route fetches ESPN, caches finished results in KV, and serves the
// merged event list. Finals survive ESPN outages; live/pending are fresh.
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
      const resp = await fetch("/api/scoreboard");
      const { events: allEvents } = await resp.json();
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
        const homeScore = parseInt(home.score ?? 0, 10);
        const awayScore = parseInt(away.score ?? 0, 10);
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
            isPens: statusName === "STATUS_SHOOTOUT",
          };
        } else if (isFinal) {
          newResults[match.id] = {
            winner: winnerKey,
            homeScore,
            awayScore,
            isPens,
            isAET,
            homeShootout: home.shootoutScore,
            awayShootout: away.shootoutScore,
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
