import { useState } from "react";
import { R32_MATCHES, R16_MATCHES, QF_MATCHES, SF_MATCHES, FLAGS, PARTICIPANTS } from "./data.js";
import { useScores } from "./useScores.js";
import { scoreR32, scoreR16, scoreQF, scoreSF, scoreGroups, isFirstTimer } from "./scoring.js";
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

function Spinner() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        border: "3px solid #ddd",
        borderTopColor: "#e53935",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

// live status text: shootout shows PENS, otherwise the match clock
function liveTime(live) {
  return live.isPens ? "PENS" : `${live.clock}'`;
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
      const firstTimer = isFirstTimer(p);
      const r16 = scoreR16(p.picks.r16, results, { firstTimer });
      const qf = scoreQF(p.picks.qf, results);
      const sf = scoreSF(p.picks.sf, results);
      const groups = scoreGroups(p.picks.groups, groupStandings).total;
      return { ...p, r32Pts: r32, r16Pts: r16, qfPts: qf, sfPts: sf, firstTimer, groupPts: groups, pts: r32 + r16 + qf + sf + groups };
    })
    .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));

  const me = ranked.find((p) => p.name === myName);
  const firstLoad = loading && !lastUpdated;

  // leaderboard scope: total (default) | groups | r32 | r16 | qf | sf
  const scopeVal = (p) =>
    boardScope === "groups"
      ? p.groupPts
      : boardScope === "r32"
        ? p.r32Pts
        : boardScope === "r16"
          ? p.r16Pts
          : boardScope === "qf"
            ? p.qfPts
            : boardScope === "sf"
              ? p.sfPts
              : p.pts;
  const board = ranked
    .map((p) => ({ ...p, shown: scopeVal(p) }))
    .sort((a, b) => b.shown - a.shown || a.name.localeCompare(b.name));
  const myRank = me ? board.findIndex((p) => p.name === myName) + 1 : null;

  return (
    <div style={s.wrap}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={s.header}>
        <h1 style={s.h1}>⚽ ERG World Cup Predictions</h1>
        <p style={s.sub}>
          #erg-world-cup · Groups + R32 + R16 + Quarter-finals
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
        {["leaderboard", "my picks", "results", "analytics", "about"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={s.tab(tab === t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* first-load spinner: only before any scores have arrived */}
      {firstLoad && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "48px 0",
            color: "#666",
            fontSize: 13,
          }}
        >
          <Spinner />
          Loading scores…
        </div>
      )}

      {/* LEADERBOARD */}
      {!firstLoad && tab === "leaderboard" && (
        <div>
          <div style={s.roundTabs}>
            {[
              ["total", "Overall"],
              ["groups", "Group Stage"],
              ["r32", "Round of 32"],
              ["r16", "Round of 16"],
              ["qf", "Quarter-finals"],
              ["sf", "Semi-finals"],
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
                      : boardScope === "r32"
                        ? " · round of 32"
                        : boardScope === "r16"
                          ? " · round of 16"
                          : boardScope === "qf"
                            ? " · quarter-finals"
                            : " · semi-finals"}
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
                  <span style={{ fontSize: 11, color: "#888", minWidth: 160, textAlign: "right" }}>
                    G {p.groupPts} · R32 {p.r32Pts} · R16 {p.r16Pts} · QF {p.qfPts} · SF {p.sfPts}
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
      {!firstLoad && tab === "my picks" && (
        <div>
          <div style={s.roundTabs}>
            {[
              ["groups", "Group Stage", !!me?.picks.groups],
              ["r32", "Round of 32", !!me?.picks.r32],
              ["r16", "Round of 16", !!me?.picks.r16],
              ["qf", "Quarter-finals", !!me?.picks.qf],
              ["sf", "Semi-finals", !!me?.picks.sf],
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
            R32_MATCHES.map((m, i) => {
            const myPick = me?.picks.r32?.[i];
            const result = results[m.id];
            const live = liveScores[m.id];
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
                    {live.homeScore}–{live.awayScore} {liveTime(live)}
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

          {picksRound === "r16" &&
            R16_MATCHES.map((m, i) => {
            const myPick = me?.picks.r16?.[i];
            const result = results[m.id];
            const live = liveScores[m.id];
            // free matches score for everyone regardless of pick
            const correct = result && (m.free || myPick === result.winner);
            const wrong = result && !m.free && myPick !== result.winner;

            return (
              <div key={m.id} style={s.pickRow(correct, wrong)}>
                <span style={{ fontSize: 12, color: "#666", flex: 1 }}>
                  {m.label}
                </span>
                {m.free && (
                  <span style={{ fontSize: 10, color: "#3b6d11", fontWeight: 600 }}>
                    FREE
                  </span>
                )}
                {live && (
                  <span style={{ fontSize: 11, color: "#e53935" }}>
                    <LiveDot />
                    {live.homeScore}–{live.awayScore} {liveTime(live)}
                  </span>
                )}
                <span style={{ fontSize: 12 }}>
                  {m.free
                    ? result
                      ? `${FLAGS[result.winner] || ""} ${result.winner}`
                      : "—"
                    : `${FLAGS[myPick] || ""} ${myPick || "—"}`}
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

          {picksRound === "qf" &&
            QF_MATCHES.map((m, i) => {
            const myPick = me?.picks.qf?.[i];
            const result = results[m.id];
            const live = liveScores[m.id];
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
                    {live.homeScore}–{live.awayScore} {liveTime(live)}
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

          {picksRound === "sf" &&
            SF_MATCHES.map((m, i) => {
            const myPick = me?.picks.sf?.[i];
            const result = results[m.id];
            const live = liveScores[m.id];
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
                    {live.homeScore}–{live.awayScore} {liveTime(live)}
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

          {(picksRound === "r32" || picksRound === "r16" || picksRound === "qf" || picksRound === "sf") && (
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
                Total {picksRound === "sf" ? "SF" : picksRound === "qf" ? "QF" : picksRound === "r16" ? "R16" : "R32"} points
                {picksRound === "r16" && me?.firstTimer && (
                  <span style={{ color: "#3b6d11", fontWeight: 600 }}>
                    {" "}· first-timer: 2× if all 4 correct
                  </span>
                )}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {(picksRound === "sf" ? me?.sfPts : picksRound === "qf" ? me?.qfPts : picksRound === "r16" ? me?.r16Pts : me?.r32Pts) ?? 0} pts
              </span>
            </div>
          )}
        </div>
      )}

      {/* RESULTS */}
      {!firstLoad && tab === "results" && (
        <div>
          <div style={s.roundTabs}>
            {[
              ["groups", "Groups", true],
              ["r32", "R32", true],
              ["r16", "R16", true],
              ["qf", "QF", true],
              ["sf", "SF", true],
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

          {["sf", "final"].includes(resultsRound) && (
            <div style={{ fontSize: 13, color: "#aaa", padding: "16px 2px", textAlign: "center" }}>
              Not started yet — picks &amp; results appear here once this round begins.
            </div>
          )}

          {(resultsRound === "r32" || resultsRound === "r16" || resultsRound === "qf") && (
          <div>
          <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px" }}>
            Results are fetched automatically from ESPN. Use buttons to manually
            override if needed.
          </p>
          {(resultsRound === "qf"
            ? QF_MATCHES
            : resultsRound === "r16"
              ? R16_MATCHES
              : R32_MATCHES
          ).map((m) => {
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
                      {live.homeScore}–{live.awayScore} {liveTime(live)}
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
                            result.isPens
                              ? result.homeShootout != null &&
                                result.awayShootout != null
                                ? ` (${result.homeShootout}–${result.awayShootout} P)`
                                : " (P)"
                              : result.isAET
                                ? " (AET)"
                                : ""
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
      {!firstLoad && tab === "analytics" && (
        <Analytics
          participants={PARTICIPANTS}
          ranked={ranked}
          myName={myName}
          results={results}
          groupStandings={groupStandings}
        />
      )}

      {/* ABOUT */}
      {!firstLoad && tab === "about" && (
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "#333" }}>
          <img
            src="/erg-world-cup-hype.png"
            alt="ERG World Cup 2026 — join us, scoring, and road to glory"
            style={{ width: "100%", height: "auto", borderRadius: 10, marginBottom: 16, display: "block" }}
          />
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
            Welcome to #erg-world-cup ⚽🌎
          </h2>
          <p style={{ color: "#555", margin: "0 0 16px" }}>
            This channel is the home for all things Men's and Women's World Cup
            at Recharge. While we're launching it for the 2026 Men's World Cup,
            we'll keep using it for future tournaments — including the 2027
            Women's World Cup and beyond.
          </p>

          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>
            🏆 Rules & Prize
          </h3>
          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            <div style={{ padding: "10px 12px", background: "#f7f7f5", borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>📋 How to play</div>
              <div style={{ color: "#555" }}>
                Build your bracket (FIFA's official predictor or type picks
                manually) and post it in the round's thread. Pick early — you
                can update right up until the first game of that round.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, padding: "10px 12px", background: "#f7f7f5", borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#3b6d11" }}>+10</div>
                <div style={{ fontSize: 11, color: "#555" }}>correct match prediction</div>
              </div>
              <div style={{ flex: 1, padding: "10px 12px", background: "#f7f7f5", borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#b8860b" }}>+50</div>
                <div style={{ fontSize: 11, color: "#555" }}>correct tournament winner</div>
              </div>
            </div>
            <div style={{ padding: "10px 12px", background: "#f7f7f5", borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>👕 Prize</div>
              <div style={{ color: "#555" }}>
                Highest score at the end of the tournament wins a{" "}
                <strong>jersey of their choice</strong>. Ties broken by final
                score predictions — still tied, we spin the wheel. 🎡
              </div>
            </div>
            <div style={{ padding: "10px 12px", background: "#f7f7f5", borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>🗺️ Road to glory</div>
              <div style={{ color: "#555" }}>
                48 nations → 12 groups (A–L). Top two per group plus the 8 best
                third-place teams advance. Then R32 → R16 → Quarters → Semis →
                Final. One will be crowned champion.
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>
            🔎 A closer look at our communities
          </h3>
          <p style={{ color: "#555", margin: "0 0 12px" }}>
            Ever wonder why the pitch is called "The Beautiful Game"? Because
            these world-class icons represent all of us. Here are the stories
            we're celebrating, tied to our ERGs:
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {[
              ["✊", "Latinx & Black ERGs", "Celebrating the legacy of Pelé and the modern dominance of stars like Vinícius Júnior, who use the pitch to fight systemic racism and prove that \"fútbol\" is a global language of resistance and joy."],
              ["🌏", "APAC & Allies ERG", "From the tactical brilliance of South Korea and Japan to the heritage of Sam Kerr (Australian-Indian), honoring the massive influence of Asian nations on the modern game."],
              ["🌈", "Pride & Allies ERG", "Standing with trailblazers like Megan Rapinoe and Sam Kerr, who made being \"out and proud\" a standard for elite athletics — proving you don't have to hide who you are to be a champion."],
              ["⚽", "Women's ERG", "Highlighting the Women's World Cup icons who fought for — and won — equal pay, transforming women's sports from a \"niche\" interest into a billion-dollar global powerhouse."],
              ["🧠", "Abilities at Recharge ERG", "Spotlighting \"Differently Powered\" athletes like Nacho Fernández (Type 1 Diabetes), showing that clinical diagnoses aren't obstacles — they're part of the elite athlete's journey."],
            ].map(([emoji, title, body]) => (
              <div key={title} style={{ padding: "10px 12px", background: "#f7f7f5", borderRadius: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {emoji} {title}
                </div>
                <div style={{ color: "#555" }}>{body}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, color: "#aaa", marginTop: 16 }}>
            Organized by Juan Moreno & Irving Osuna, with the Recharge ERGs. ⚽
          </p>
        </div>
      )}

      <PlayerDrawer
        player={selectedPlayer}
        me={me}
        results={results}
        groupStandings={groupStandings}
        onClose={() => {
          setSelectedPlayer(null);
          setComparing(false);
        }}
        comparing={comparing}
        setComparing={setComparing}
      />

      <footer style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #eee", fontSize: 11, color: "#aaa", textAlign: "center" }}>
        Brought to you by the Recharge ERGs · #erg-world-cup 🌍⚽
      </footer>
    </div>
  );
}
