import { useState } from "react";
import { MATCHES, FLAGS, PARTICIPANTS } from "./data.js";
import { useScores } from "./useScores.js";

function getMedal(ranked, index) {
  const pts = ranked[index].pts;
  const first = ranked[0].pts;
  const second = ranked.find((p) => p.pts < first)?.pts;
  const third = ranked.find((p) => p.pts < (second ?? first))?.pts;

  if (pts === first) return "🥇";
  if (pts === second) return "🥈";
  if (pts === third) return "🥉";
  return `${index + 1}`;
}

function score(picks, results) {
  return picks.reduce((pts, pick, i) => {
    if (!pick || !results[i]) return pts;
    return pts + (pick === results[i].winner ? 10 : 0);
  }, 0);
}

const s = {
  wrap: { maxWidth: 640, margin: "0 auto", padding: "1rem" },
  header: { marginBottom: "1rem" },
  h1: { fontSize: 18, fontWeight: 600, margin: "0 0 2px" },
  sub: { fontSize: 12, color: "#888", margin: 0 },
  tabs: { display: "flex", gap: 6, marginBottom: 14 },
  tab: (active) => ({
    fontSize: 12,
    padding: "5px 14px",
    borderRadius: 8,
    border: active ? "2px solid #222" : "1px solid #ccc",
    background: active ? "#222" : "white",
    color: active ? "white" : "#333",
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
  }),
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  refreshBtn: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "white",
    cursor: "pointer",
  },
  liveChip: {
    fontSize: 11,
    background: "#e53935",
    color: "white",
    borderRadius: 20,
    padding: "2px 8px",
    fontWeight: 600,
  },
  lastUpd: { fontSize: 11, color: "#aaa" },
  errorChip: {
    fontSize: 11,
    background: "#fcebeb",
    color: "#a32d2d",
    borderRadius: 8,
    padding: "4px 10px",
  },
  myCallout: {
    background: "#e8f0fe",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  row: (isMe, i) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 8,
    marginBottom: 4,
    background: isMe ? "#e8f0fe" : i % 2 === 0 ? "#fafafa" : "white",
    border: isMe ? "1.5px solid #3c4f9e" : "0.5px solid #eee",
  }),
  matchCard: (status) => ({
    border: "0.5px solid #e0e0e0",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 6,
    background:
      status === "live" ? "#fff8e1" : status === "final" ? "#f7f7f5" : "white",
  }),
  pickRow: (correct, wrong) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    background: !correct && !wrong ? "white" : correct ? "#eaf3de" : "#fcebeb",
    border: "0.5px solid #e0e0e0",
    borderRadius: 8,
    marginBottom: 5,
  }),
  btn: (active) => ({
    flex: 1,
    padding: "6px 8px",
    fontSize: 12,
    borderRadius: 8,
    border: active ? "2px solid #222" : "1px solid #ccc",
    background: active ? "#222" : "white",
    color: active ? "white" : "#333",
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
  }),
};

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
  const {
    results,
    liveScores,
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

  const played = Object.keys(results).length;

  const ranked = [...PARTICIPANTS]
    .map((p) => ({ ...p, pts: score(p.picks, results) }))
    .sort((a, b) => b.pts - a.pts);

  const me = ranked.find((p) => p.name === myName);
  const myRank = me ? ranked.indexOf(me) + 1 : null;

  return (
    <div style={s.wrap}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      <div style={s.header}>
        <h1 style={s.h1}>⚽ WC 2026 — Round of 32</h1>
        <p style={s.sub}>
          Recharge Predictions Leaderboard · {played}/15 results in
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
        {["leaderboard", "my picks", "results"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={s.tab(tab === t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* LEADERBOARD */}
      {tab === "leaderboard" && (
        <div>
          {me && (
            <div style={s.myCallout}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  You're #{myRank} of {ranked.length}
                </div>
                <div style={{ fontSize: 12, color: "#555" }}>
                  {me.pts} pts · {15 - played} matches left
                </div>
              </div>
            </div>
          )}

          {ranked.map((p, i) => {
            const isMe = p.name === myName;
            const correct = p.picks.filter(
              (pk, j) => pk && results[j]?.winner && pk === results[j].winner,
            ).length;
            return (
              <div key={p.name} style={s.row(isMe, i)}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#888",
                    width: 26,
                  }}
                >
                  {getMedal(ranked, i)}
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
                <span style={{ fontSize: 11, color: "#888" }}>
                  {correct}/{played}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    minWidth: 52,
                    textAlign: "right",
                  }}
                >
                  {p.pts} pts
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* MY PICKS */}
      {tab === "my picks" && (
        <div>
          {MATCHES.map((m, i) => {
            const myPick = me?.picks[i];
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
            <span style={{ fontSize: 14, fontWeight: 600 }}>{me?.pts} pts</span>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {tab === "results" && (
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
                      {result.homeScore}–{result.awayScore}
                      {result.isPens ? " (P)" : result.isAET ? " (AET)" : ""} FT
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
  );
}
