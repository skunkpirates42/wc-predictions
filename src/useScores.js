import { useState, useEffect, useCallback } from "react";
import { MATCHES } from "./data.js";

function normalize(s) {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace("united states", "usa")
    .replace("bosnia-herzegovina", "bosnia")
    .replace("ivory coast", "cote d'ivoire")
    .replace("cape verde", "cabo verde")
    .replace("congo dr", "dr congo")
    .replace(/[^a-z]/g, "");
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
      const allResponses = await Promise.all(
        R32_DATES.map((date) =>
          fetch(`${ESPN_BASE}?dates=${date}&limit=20`)
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
        const statusDesc = comp.status?.type?.description || "";
        const clock = comp.status?.displayClock || "";
        const period = comp.status?.period || 0;

        const isLive = statusName === "STATUS_IN_PROGRESS";
        const isFinal = [
          "STATUS_FULL_TIME",
          "STATUS_FINAL",
          "STATUS_FINAL_PEN",
          "STATUS_FINAL_AET",
        ].includes(statusName);
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
          };
        }
      });

      setResults(newResults);
      setLiveScores(newLive);
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
    loading,
    error,
    lastUpdated,
    hasLive,
    refresh: fetch_scores,
    setManualResult,
  };
}
