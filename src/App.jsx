import { useState } from "react";
import { MATCHES, FLAGS, PARTICIPANTS } from "./data.js";
import { useScores } from "./useScores.js";
import { scoreR32, scoreGroups } from "./scoring.js";
import { s } from "./styles.js";
import { GroupStandingsView, GroupPicksView } from "./GroupViews.jsx";
import PlayerDrawer from "./PlayerDrawer.jsx";
import Analytics from "./Analytics.jsx";

function getMedal(ranked, index) {
  const val = (p) => p.shown ?? p.pts;
  const pts = val(ranked[index]);
  const first = val(ranked[0]);
  const second = val(ranked.find((p) => val(p) < first) ?? {});
  const third = val(ranked.find((p) => val(p) < (second ?? first)) ?? {});

  if (pts === first) return "🥇";
  if (pts === second) return "🥈";
  if (pts === third) return "🥉";
  return `${index + 1}`;
}

function LiveDot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "#e53935",
        marginRight: 4,
        animation: "pulse 1s ease-in-out infinite",
      }}
    />
  );
}


export default function App() {
  const [myName, setMyName] = useState(
    () => localStorage.getItem("wc_user") || null,
  );
  const [tab, setTab] = useState("leaderboard");
  const [boardScope, setBoardScope] = useState("total");
  const [picksRound, setPicksRound] = useState("r32");
  const [resultsRound, setResultsRound] = useState("groups");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [comparing, setComparing] = useState(false);
  const {
    results,
    liveScores,
    groupStandings,
    loading,
    error,
    lastUpdated,
    hasLive,
    refresh,
    setManualResult,
  } = useScores();

  const selectUser = (name) => {
    localStorage.setItem("wc_user", name);
    setMyName(name);
  };

  // --- PICKER SCREEN ---
  if (!myName) {
    return (
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 6px" }}>
          ⚽ WC 2026 Predictions
        </h2>
        <p style={{ fontSize: 13, color: "#888", margin: "0 0 20px" }}>
          Who are you?
        </p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {PARTICIPANTS.map((p) => (
            <button
              key={p.name}
              onClick={() => selectUser(p.name)}
              style={{
                padding: "10px 12px",
                fontSize: 13,
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "white",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const ranked = [...PARTICIPANTS]
    .map((p) => {
      const r32 = scoreR32(p.picks.r32, results);
      const groups = scoreGroups(p.picks.groups, groupStandings).total;
      return { ...p, r32Pts: r32, groupPts: groups, pts: r32 + groups };
    })
    .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));

  const me = ranked.find((p) => p.name === myName);

  // leaderboard scope: total (default) | groups | r32
  const scopeVal = (p) =>
    boardScope === "groups" ? p.groupPts : boardScope === "r32" ? p.r32Pts : p.pts;
  const board = ranked
    .map((p) => ({ ...p, shown: scopeVal(p) }))
    .sort((a, b) => b.shown - a.shown || a.name.localeCompare(b.name));
  const myRank = me ? board.findIndex((p) => p.name === myName) + 1 : null;

  return (
    <div style={s.wrap}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      <div style={s.header}>
        <h1 style={s.h1}>⚽ WC 2026 Predictions</h1>
        <p style={s.sub}>
          Recharge Leaderboard · Group stage + Round of 32
        </p>
      </div>

      {/* Status bar */}
      <div style={s.statusBar}>
        <button onClick={refresh} disabled={loading} style={s.refreshBtn}>
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
        {hasLive && (
          <span style={s.liveChip}>
            <LiveDot />
            LIVE
          </span>
        )}
        {lastUpdated && (
          <span style={s.lastUpd}>
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        {error && (
          <span style={s.errorChip}>⚠ {error} — use manual entry below</span>
        )}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {["leaderboard", "my picks", "results", "analytics"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={s.tab(tab === t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* LEADERBOARD */}
      {tab === "leaderboard" && (
        <div>
          <div style={s.roundTabs}>
            {[
              ["total", "Overall"],
              ["groups", "Group Stage"],
              ["r32", "Round of 32"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setBoardScope(key)}
                style={s.roundTab(boardScope === key, false)}
              >
                {label}
              </button>
            ))}
          </div>

          {me && (
            <div style={s.myCallout}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  You're #{myRank} of {board.length}
                </div>
                <div style={{ fontSize: 12, color: "#555" }}>
                  {scopeVal(me)} pts
                  {boardScope === "total"
                    ? " overall"
                    : boardScope === "groups"
                      ? " · group stage"
                      : " · round of 32"}
                </div>
              </div>
            </div>
          )}

          {board.map((p, i) => {
            const isMe = p.name === myName;
            return (
              <div
                key={p.name}
                style={{ ...s.row(isMe, i), cursor: "pointer" }}
                onClick={() => {
                  setSelectedPlayer(p);
                  setComparing(false);
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#888",
                    width: 26,
                  }}
                >
                  {getMedal(board, i)}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isMe ? 600 : 400,
                    flex: 1,
                  }}
                >
                  {p.name}
                  {isMe ? " (you)" : ""}
                </span>
                {boardScope === "total" && (
                  <span style={{ fontSize: 11, color: "#888", minWidth: 96, textAlign: "right" }}>
                    G {p.groupPts} · R32 {p.r32Pts}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    minWidth: 52,
                    textAlign: "right",
                  }}
                >
                  {p.shown} pts
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* MY PICKS */}
      {tab === "my picks" && (
        <div>
          <div style={s.roundTabs}>
            {[
              ["groups", "Group Stage", !!me?.picks.groups],
              ["r32", "Round of 32", !!me?.picks.r32],
            ].map(([key, label, enabled]) => (
              <button
                key={key}
                disabled={!enabled}
                onClick={() => enabled && setPicksRound(key)}
                style={s.roundTab(picksRound === key, !enabled)}
              >
                {label}
              </button>
            ))}
          </div>

          {picksRound === "groups" && (
            <GroupPicksView
              groups={me?.picks.groups}
              standings={groupStandings}
            />
          )}

          {picksRound === "r32" &&
            MATCHES.map((m, i) => {
            const myPick = me?.picks.r32?.[i];
            const result = results[i];
            const live = liveScores[i];
            const correct = result && myPick === result.winner;
            const wrong = result && myPick !== result.winner;

            return (
              <div key={m.id} style={s.pickRow(correct, wrong)}>
                <span style={{ fontSize: 12, color: "#666", flex: 1 }}>
                  {m.label}
                </span>
                {live && (
                  <span style={{ fontSize: 11, color: "#e53935" }}>
                    <LiveDot />
                    {live.homeScore}–{live.awayScore} {live.clock}'
                  </span>
                )}
                <span style={{ fontSize: 12 }}>
                  {FLAGS[myPick] || ""} {myPick || "—"}
                </span>
                {result && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: "bold",
                      color: correct ? "#3b6d11" : "#a32d2d",
                    }}
                  >
                    {correct ? "✓" : "✗"}
                  </span>
                )}
                {!result && !live && (
                  <span style={{ fontSize: 11, color: "#ccc" }}>pending</span>
                )}
              </div>
            );
          })}

          {picksRound === "r32" && (
            <div
              style={{
                marginTop: 8,
                padding: "10px 12px",
                background: "#f7f7f5",
                borderRadius: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 12, color: "#888" }}>
                Total R32 points
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {me?.r32Pts ?? 0} pts
              </span>
            </div>
          )}
        </div>
      )}

      {/* RESULTS */}
      {tab === "results" && (
        <div>
          <div style={s.roundTabs}>
            {[
              ["groups", "Groups", true],
              ["r32", "R32", true],
              ["r16", "R16", false],
              ["qf", "QF", false],
              ["sf", "SF", false],
              ["final", "Final", false],
            ].map(([key, label, enabled]) => (
              <button
                key={key}
                disabled={!enabled}
                onClick={() => enabled && setResultsRound(key)}
                style={s.roundTab(resultsRound === key, !enabled)}
              >
                {label}
              </button>
            ))}
          </div>

          {resultsRound === "groups" && (
            <GroupStandingsView standings={groupStandings} />
          )}

          {["r16", "qf", "sf", "final"].includes(resultsRound) && (
            <div style={{ fontSize: 13, color: "#aaa", padding: "16px 2px", textAlign: "center" }}>
              Not started yet — picks &amp; results appear here once this round begins.
            </div>
          )}

          {resultsRound === "r32" && (
          <div>
          <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px" }}>
            Results are fetched automatically from ESPN. Use buttons to manually
            override if needed.
          </p>
          {MATCHES.map((m) => {
            const result = results[m.id];
            const live = liveScores[m.id];
            const status = live ? "live" : result ? "final" : "pending";

            return (
              <div key={m.id} style={s.matchCard(status)}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: "#666" }}>{m.label}</span>
                  {status === "live" && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#e53935",
                        fontWeight: 600,
                      }}
                    >
                      <LiveDot />
                      {live.homeScore}–{live.awayScore} {live.clock}'
                    </span>
                  )}
                  {status === "final" && (
                    <span
                      style={{
                        fontSize: 11,
                        background: "#333",
                        color: "white",
                        borderRadius: 4,
                        padding: "1px 6px",
                        fontWeight: 600,
                      }}
                    >
                      {result.manual
                        ? "set manually"
                        : `${result.homeScore}–${result.awayScore}${
                            result.isPens ? " (P)" : result.isAET ? " (AET)" : ""
                          } FT`}
                    </span>
                  )}
                  {status === "pending" && (
                    <span style={{ fontSize: 11, color: "#ccc" }}>
                      not started
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[m.t1, m.t2].map((team) => (
                    <button
                      key={team}
                      onClick={() => setManualResult(m.id, team)}
                      style={s.btn(result?.winner === team && result?.manual)}
                    >
                      {FLAGS[team] || ""} {team}
                      {result?.winner === team && !result?.manual ? " ✓" : ""}
                    </button>
                  ))}
                </div>
                {result?.manual && (
                  <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
                    manual override — click again to remove
                  </div>
                )}
              </div>
            );
          })}
          </div>
          )}
        </div>
      )}

      {/* ANALYTICS */}
      {tab === "analytics" && (
        <Analytics
          participants={PARTICIPANTS}
          ranked={ranked}
          myName={myName}
          results={results}
          groupStandings={groupStandings}
        />
      )}

      <PlayerDrawer
        player={selectedPlayer}
        me={me}
        results={results}
        matches={MATCHES}
        groupStandings={groupStandings}
        onClose={() => {
          setSelectedPlayer(null);
          setComparing(false);
        }}
        comparing={comparing}
        setComparing={setComparing}
      />
    </div>
  );
}
