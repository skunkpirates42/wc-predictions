import { useState } from "react";
import { FLAGS, GROUP_LETTERS, R32_MATCHES, R16_MATCHES, QF_MATCHES, SF_MATCHES, THIRD_PLACE_MATCH, FINAL_MATCH } from "./data.js";
import { s } from "./styles.js";
import { GroupPicksView } from "./GroupViews.jsx";

export default function PlayerDrawer({ player, me, results, groupStandings, onClose, comparing, setComparing }) {
  const [round, setRound] = useState("r32");
  if (!player) return null;
  const isOther = me && player.name !== me.name;
  const showCompare = comparing && isOther;
  const pGroups = player.picks.groups;
  const myGroups = me?.picks.groups;
  // fall back to whichever round the player actually has
  const has = {
    groups: !!pGroups,
    r32: !!player.picks.r32,
    r16: !!player.picks.r16,
    qf: !!player.picks.qf,
    sf: !!player.picks.sf,
    final: !!(player.picks.final || player.picks.thirdPlace),
  };
  const activeRound = has[round]
    ? round
    : ["groups", "r32", "r16", "qf", "sf", "final"].find((r) => has[r]) || round;
  const bracketMatches =
    activeRound === "sf"
      ? SF_MATCHES
      : activeRound === "qf"
        ? QF_MATCHES
        : activeRound === "r16"
          ? R16_MATCHES
          : R32_MATCHES;
  const bracketKey = activeRound === "sf" ? "sf" : activeRound === "qf" ? "qf" : activeRound === "r16" ? "r16" : "r32";

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />

      {/* panel */}
      <div style={{
        position: 'relative', background: 'white', borderRadius: '16px 16px 0 0',
        padding: '1.25rem', maxHeight: '80vh', overflowY: 'auto', zIndex: 1,
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{player.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {player.pts} pts · G {player.groupPts ?? 0} · R32 {player.r32Pts ?? 0} · R16 {player.r16Pts ?? 0} · QF {player.qfPts ?? 0} · SF {player.sfPts ?? 0} · 3P {player.thirdPlacePts ?? 0} · F {player.finalPts ?? 0}
            </div>
          </div>
          {isOther && (
            <button onClick={() => setComparing(c => !c)} style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 8,
              border: comparing ? '2px solid #222' : '1px solid #ccc',
              background: comparing ? '#222' : 'white',
              color: comparing ? 'white' : '#333',
              cursor: 'pointer', fontWeight: comparing ? 600 : 400,
            }}>
              {comparing ? 'Comparing' : 'Compare with me'}
            </button>
          )}
          <button onClick={onClose} style={{
            fontSize: 18, background: 'none', border: 'none',
            cursor: 'pointer', color: '#888', padding: '0 4px',
          }}>✕</button>
        </div>

        {/* round selector */}
        <div style={s.roundTabs}>
          {[
            ["groups", "Group Stage", !!pGroups],
            ["r32", "Round of 32", !!player.picks.r32],
            ["r16", "Round of 16", !!player.picks.r16],
            ["qf", "Quarter-finals", !!player.picks.qf],
            ["sf", "Semi-finals", !!player.picks.sf],
            ["final", "Finals", has.final],
          ].map(([key, label, enabled]) => (
            <button
              key={key}
              disabled={!enabled}
              onClick={() => enabled && setRound(key)}
              style={s.roundTab(activeRound === key, !enabled)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* R32 / R16 / QF / SF bracket */}
        {(activeRound === "r32" || activeRound === "r16" || activeRound === "qf" || activeRound === "sf") && (
          <>
            {showCompare && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#888' }}>Match</div>
                <div style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>{player.name.split(' ')[0]}</div>
                <div style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>{me.name.split(' ')[0]} (you)</div>
              </div>
            )}
            {bracketMatches.map((m, i) => {
              const pick = player.picks[bracketKey]?.[i];
              const mePick = me?.picks[bracketKey]?.[i];
              const result = results[m.id]?.winner;
              // free matches count as correct for everyone once decided
              const pickCorrect = result && (m.free || (pick && pick === result));
              const pickWrong = result && !m.free && pick && pick !== result;
              const meCorrect = result && (m.free || (mePick && mePick === result));
              const meWrong = result && !m.free && mePick && mePick !== result;
              const agree = pick && mePick && pick === mePick;
              const withFlag = (t) => (t && FLAGS[t] ? `${FLAGS[t]} ${t}` : t || '—');
              const pickLabel = withFlag(m.free ? result : pick);
              const meLabel = withFlag(m.free ? result : mePick);

              if (showCompare) {
                return (
                  <div key={m.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 4, padding: '7px 0', borderBottom: '0.5px solid #f0f0f0',
                  }}>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {FLAGS[m.t1] || ''} {m.t1} vs {FLAGS[m.t2] || ''} {m.t2}
                    </div>
                    <div style={{ fontSize: 12, textAlign: 'center', fontWeight: 500,
                      color: pickCorrect ? '#3b6d11' : pickWrong ? '#a32d2d' : '#333' }}>
                      {pickLabel} {pickCorrect ? '✓' : pickWrong ? '✗' : ''}
                    </div>
                    <div style={{ fontSize: 12, textAlign: 'center', fontWeight: 500,
                      color: meCorrect ? '#3b6d11' : meWrong ? '#a32d2d' : '#333',
                      background: agree ? '#fffbe6' : 'transparent', borderRadius: 4 }}>
                      {meLabel} {meCorrect ? '✓' : meWrong ? '✗' : ''}
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', marginBottom: 4, borderRadius: 8,
                  background: pickCorrect ? '#eaf3de' : pickWrong ? '#fcebeb' : '#fafafa',
                }}>
                  <span style={{ fontSize: 12, color: '#666', flex: 1 }}>
                    {FLAGS[m.t1] || ''} {m.t1} vs {FLAGS[m.t2] || ''} {m.t2}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{pickLabel}</span>
                  {result && (
                    <span style={{ fontSize: 13, fontWeight: 'bold', color: pickCorrect ? '#3b6d11' : '#a32d2d' }}>
                      {pickCorrect ? '✓' : '✗'}
                    </span>
                  )}
                  {!result && <span style={{ fontSize: 11, color: '#ccc' }}>pending</span>}
                </div>
              );
            })}
          </>
        )}

        {/* Finals: 3rd place + final */}
        {activeRound === "final" && (
          <>
            {showCompare && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#888' }}>Match</div>
                <div style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>{player.name.split(' ')[0]}</div>
                <div style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>{me.name.split(' ')[0]} (you)</div>
              </div>
            )}
            {[
              { m: THIRD_PLACE_MATCH, label: "3rd Place Match", pick: player.picks.thirdPlace, mePick: me?.picks.thirdPlace },
              { m: FINAL_MATCH, label: "World Cup Final", pick: player.picks.final, mePick: me?.picks.final },
            ].map(({ m, label, pick, mePick }) => {
              const result = results[m.id]?.winner;
              const pickCorrect = result && pick && pick === result;
              const pickWrong = result && pick && pick !== result;
              const meCorrect = result && mePick && mePick === result;
              const meWrong = result && mePick && mePick !== result;
              const agree = pick && mePick && pick === mePick;
              const withFlag = (t) => (t && FLAGS[t] ? `${FLAGS[t]} ${t}` : t || '—');

              if (showCompare) {
                return (
                  <div key={label} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 4, padding: '7px 0', borderBottom: '0.5px solid #f0f0f0',
                  }}>
                    <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
                    <div style={{ fontSize: 12, textAlign: 'center', fontWeight: 500,
                      color: pickCorrect ? '#3b6d11' : pickWrong ? '#a32d2d' : '#333' }}>
                      {withFlag(pick)} {pickCorrect ? '✓' : pickWrong ? '✗' : ''}
                    </div>
                    <div style={{ fontSize: 12, textAlign: 'center', fontWeight: 500,
                      color: meCorrect ? '#3b6d11' : meWrong ? '#a32d2d' : '#333',
                      background: agree ? '#fffbe6' : 'transparent', borderRadius: 4 }}>
                      {withFlag(mePick)} {meCorrect ? '✓' : meWrong ? '✗' : ''}
                    </div>
                  </div>
                );
              }
              return (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', marginBottom: 4, borderRadius: 8,
                  background: pickCorrect ? '#eaf3de' : pickWrong ? '#fcebeb' : '#fafafa',
                }}>
                  <span style={{ fontSize: 12, color: '#666', flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{withFlag(pick)}</span>
                  {result && (
                    <span style={{ fontSize: 13, fontWeight: 'bold', color: pickCorrect ? '#3b6d11' : '#a32d2d' }}>
                      {pickCorrect ? '✓' : '✗'}
                    </span>
                  )}
                  {!result && <span style={{ fontSize: 11, color: '#ccc' }}>pending</span>}
                </div>
              );
            })}
          </>
        )}

        {/* Groups */}
        {activeRound === "groups" && !showCompare && (
          <GroupPicksView groups={pGroups} standings={groupStandings} />
        )}

        {activeRound === "groups" && showCompare && (
          <div style={{ display: "grid", gap: 10 }}>
            {GROUP_LETTERS.map((L) => {
              const picks = pGroups?.[L];
              const mine = myGroups?.[L];
              if (!picks && !mine) return null;
              const st = groupStandings?.[L];
              return (
                <div key={L} style={s.groupCard}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 4 }}>
                    <div style={s.groupHead}>Group {L}</div>
                    <div style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>{player.name.split(' ')[0]}</div>
                    <div style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>{me.name.split(' ')[0]} (you)</div>
                  </div>
                  {[0, 1, 2, 3].map((i) => {
                    const pt = picks?.[i];
                    const mt = mine?.[i];
                    const actual = st?.order[i];
                    const pc = st?.complete && pt && actual === pt;
                    const pw = st?.complete && pt && actual !== pt;
                    const mc = st?.complete && mt && actual === mt;
                    const mw = st?.complete && mt && actual !== mt;
                    const agree = pt && mt && pt === mt;
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, padding: '4px 0' }}>
                        <div style={{ fontSize: 11, color: '#999' }}>{i + 1}{st?.complete ? ` ${FLAGS[actual] || ''} ${actual}` : ''}</div>
                        <div style={{ fontSize: 12, textAlign: 'center', color: pc ? '#3b6d11' : pw ? '#a32d2d' : '#333' }}>
                          {pt ? `${FLAGS[pt] || ''} ${pt}` : '—'} {pc ? '✓' : pw ? '✗' : ''}
                        </div>
                        <div style={{ fontSize: 12, textAlign: 'center', color: mc ? '#3b6d11' : mw ? '#a32d2d' : '#333',
                          background: agree ? '#fffbe6' : 'transparent', borderRadius: 4 }}>
                          {mt ? `${FLAGS[mt] || ''} ${mt}` : '—'} {mc ? '✓' : mw ? '✗' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
