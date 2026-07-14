import { useState, useMemo } from "react";
import { buildTimeline, accuracyByRound } from "./analytics.js";

// Validated 8-slot categorical palette (light). You is drawn in ink (focus), not
// a categorical hue, so up to 8 colored peers + you never needs a 9th hue.
const HUES = [
  "#2a78d6", "#1baf7a", "#eda100", "#008300",
  "#4a3aa7", "#e34948", "#e87ba4", "#eb6834",
];
const INK = "#0b0b0b";
const MUTED = "#898781";
const GRID = "#e1e0d9";
const GHOST = "#e6e5df";

const fmtDate = (d) => {
  const [, m, day] = d.split("-");
  return `${+m}/${+day}`;
};

// Shared line-chart with ghosts, colored peers, a bold "you" line, hover crosshair.
function LineChart({ dates, series, youName, peers, valueKey, invertY, yTicks, title, note }) {
  const [hover, setHover] = useState(null);
  const W = 600, H = 240, padL = 34, padR = 12, padT = 12, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = dates.length;
  if (n === 0) return null;

  const vals = series.flatMap((s) => s[valueKey]);
  const maxV = invertY ? Math.max(...vals) : Math.max(...vals, 1);
  const minV = invertY ? 1 : 0;
  const x = (i) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) =>
    invertY
      ? padT + ((v - minV) / (maxV - minV || 1)) * plotH
      : padT + plotH - (v / (maxV || 1)) * plotH;

  const path = (arr) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const peerSet = new Set(peers.map((p) => p.name));
  const ghosts = series.filter((s) => s.name !== youName && !peerSet.has(s.name));
  const you = series.find((s) => s.name === youName);

  const ticks = yTicks || [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxV));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - padL) / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  // tooltip rows: you + peers, sorted by displayed value
  const rows = [you, ...peers]
    .filter(Boolean)
    .map((s) => ({ name: s.name, v: s[valueKey][hover], color: s === you ? INK : s.color }))
    .sort((a, b) => (invertY ? a.v - b.v : b.v - a.v));

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{title}</div>
      {note && <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>{note}</div>}
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", touchAction: "none" }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* gridlines + y ticks */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
              <text x={padL - 5} y={y(t) + 3} textAnchor="end" fontSize="9" fill={MUTED}>
                {t}
              </text>
            </g>
          ))}
          {/* x labels */}
          {dates.map((d, i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill={MUTED}>
              {fmtDate(d)}
            </text>
          ))}
          {/* ghosts */}
          {ghosts.map((s) => (
            <path key={s.name} d={path(s[valueKey])} fill="none" stroke={GHOST} strokeWidth="1" />
          ))}
          {/* hover crosshair */}
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} stroke={MUTED} strokeWidth="1" strokeDasharray="3 3" />
          )}
          {/* peers */}
          {peers.map((s) => (
            <path key={s.name} d={path(s[valueKey])} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
          ))}
          {/* you */}
          {you && (
            <path d={path(you[valueKey])} fill="none" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          )}
          {/* hover dots */}
          {hover != null &&
            [you, ...peers].filter(Boolean).map((s) => (
              <circle key={s.name} cx={x(hover)} cy={y(s[valueKey][hover])} r="3" fill={s === you ? INK : s.color} stroke="#fff" strokeWidth="1" />
            ))}
        </svg>
        {hover != null && (
          <div
            style={{
              position: "absolute", top: 4,
              left: x(hover) / W > 0.5 ? "auto" : `${(x(hover) / W) * 100}%`,
              right: x(hover) / W > 0.5 ? `${(1 - x(hover) / W) * 100}%` : "auto",
              background: "#fff", border: "1px solid " + GRID, borderRadius: 8,
              padding: "6px 8px", fontSize: 11, pointerEvents: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)", maxWidth: 180, zIndex: 2,
            }}
          >
            <div style={{ color: MUTED, marginBottom: 3 }}>{fmtDate(dates[hover])}</div>
            {rows.slice(0, 10).map((r) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: r.name === youName ? 700 : 400 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.name.split(" ")[0]} {r.name === youName ? "(you)" : ""}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {invertY ? `#${r.v}` : r.v}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 8 }}>
        <LegendItem color={INK} label="You" bold />
        {peers.map((s) => (
          <LegendItem key={s.name} color={s.color} label={s.name.split(" ")[0]} />
        ))}
        {ghosts.length > 0 && <LegendItem color={GHOST} label={`+${ghosts.length} others`} />}
      </div>
    </div>
  );
}

function LegendItem({ color, label, bold }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#52514e", fontWeight: bold ? 700 : 400 }}>
      <span style={{ width: 10, height: 3, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
}

// Grouped bars: you vs field average, per round.
function AccuracyChart({ acc }) {
  const [hover, setHover] = useState(null);
  const rounds = [
    { key: "groups", label: "Group Stage", d: acc.groups },
    { key: "r32", label: "Round of 32", d: acc.r32 },
    { key: "r16", label: "Round of 16", d: acc.r16 },
    { key: "qf", label: "Quarter-finals", d: acc.qf },
    { key: "sf", label: "Semi-finals", d: acc.sf },
  ].filter((r) => r.d.total > 0);
  if (!rounds.length) return null;
  const pct = (c, t) => (t ? Math.round((c / t) * 100) : 0);

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        Accuracy by round — you vs field average
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {rounds.map((r) => {
          const youPct = pct(r.d.you, r.d.total);
          const avgPct = pct(r.d.avg, r.d.total);
          return (
            <div key={r.key}>
              <div style={{ fontSize: 11, color: "#52514e", marginBottom: 4 }}>
                {r.label}
              </div>
              {[
                { who: "You", val: youPct, raw: r.d.you, color: INK },
                { who: "Field avg", val: avgPct, raw: r.d.avg, color: HUES[0] },
              ].map((b) => (
                <div key={b.who} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}
                  onMouseEnter={() => setHover(`${r.key}-${b.who}`)}
                  onMouseLeave={() => setHover(null)}>
                  <span style={{ fontSize: 11, width: 62, color: "#52514e", fontWeight: b.who === "You" ? 700 : 400 }}>
                    {b.who}
                  </span>
                  <div style={{ flex: 1, background: GHOST, borderRadius: 5, height: 16, position: "relative" }}>
                    <div style={{ width: `${b.val}%`, background: b.color, height: "100%", borderRadius: 5, minWidth: 2 }} />
                    {hover === `${r.key}-${b.who}` && (
                      <span style={{ position: "absolute", right: 4, top: -18, fontSize: 10, color: MUTED }}>
                        {typeof b.raw === "number" ? b.raw.toFixed(b.who === "You" ? 0 : 1) : b.raw}/{r.d.total} correct
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, width: 34, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {b.val}%
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Your points vs field average, split by stage (stacked).
function BreakdownChart({ you, participants }) {
  const withAny = participants;
  const avg = (f) => (withAny.length ? withAny.reduce((s, p) => s + f(p), 0) / withAny.length : 0);
  const rows = [
    { who: "You", g: you.groupPts, r: you.r32Pts, s: you.r16Pts, q: you.qfPts, f: you.sfPts, bold: true },
    { who: "Field avg", g: avg((p) => p.groupPts), r: avg((p) => p.r32Pts), s: avg((p) => p.r16Pts), q: avg((p) => p.qfPts), f: avg((p) => p.sfPts) },
  ];
  const max = Math.max(...rows.map((x) => x.g + x.r + x.s + x.q + x.f), 1);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        Points breakdown — you vs field average
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((x) => (
          <div key={x.who}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#52514e", marginBottom: 3 }}>
              <span style={{ fontWeight: x.bold ? 700 : 400 }}>{x.who}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {Math.round(x.g + x.r + x.s + x.q + x.f)} pts
              </span>
            </div>
            <div style={{ display: "flex", height: 18, borderRadius: 5, overflow: "hidden", background: GHOST }}>
              <div style={{ width: `${(x.g / max) * 100}%`, background: HUES[1] }} title={`Groups ${Math.round(x.g)}`} />
              <div style={{ width: "2px", background: "#fff" }} />
              <div style={{ width: `${(x.r / max) * 100}%`, background: HUES[0] }} title={`R32 ${Math.round(x.r)}`} />
              <div style={{ width: "2px", background: "#fff" }} />
              <div style={{ width: `${(x.s / max) * 100}%`, background: HUES[2] }} title={`R16 ${Math.round(x.s)}`} />
              <div style={{ width: "2px", background: "#fff" }} />
              <div style={{ width: `${(x.q / max) * 100}%`, background: HUES[3] }} title={`QF ${Math.round(x.q)}`} />
              <div style={{ width: "2px", background: "#fff" }} />
              <div style={{ width: `${(x.f / max) * 100}%`, background: HUES[4] }} title={`SF ${Math.round(x.f)}`} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        <LegendItem color={HUES[1]} label="Group stage" />
        <LegendItem color={HUES[0]} label="Round of 32" />
        <LegendItem color={HUES[2]} label="Round of 16" />
        <LegendItem color={HUES[3]} label="Quarter-finals" />
        <LegendItem color={HUES[4]} label="Semi-finals" />
      </div>
    </div>
  );
}

export default function Analytics({ participants, ranked, myName, results, groupStandings }) {
  const { dates, series } = useMemo(
    () => buildTimeline(participants, results, groupStandings),
    [participants, results, groupStandings],
  );
  const me = ranked.find((p) => p.name === myName);
  const acc = useMemo(
    () => (me ? accuracyByRound(me, participants, results, groupStandings) : null),
    [me, participants, results, groupStandings],
  );

  if (!dates.length) {
    return (
      <div style={{ fontSize: 13, color: MUTED, padding: "16px 2px" }}>
        No results yet — analytics appear once matches are decided.
      </div>
    );
  }

  // top 8 peers by current total, excluding you
  const peerNames = ranked
    .filter((p) => p.name !== myName)
    .slice(0, 8)
    .map((p) => p.name);
  const peers = peerNames
    .map((name, i) => {
      const s = series.find((x) => x.name === name);
      return s ? { ...s, color: HUES[i % HUES.length] } : null;
    })
    .filter(Boolean);

  return (
    <div>
      <LineChart
        dates={dates}
        series={series}
        youName={myName}
        peers={peers}
        valueKey="cum"
        title="Cumulative points over time"
        note="Group points land when each group finishes; R32 points per match."
      />
      <LineChart
        dates={dates}
        series={series}
        youName={myName}
        peers={peers}
        valueKey="rank"
        invertY
        yTicks={[1, Math.ceil(participants.length / 2), participants.length]}
        title="Rank over time"
        note="Lower is better — #1 at the top."
      />
      {acc && <AccuracyChart acc={acc} />}
      {me && <BreakdownChart you={me} participants={ranked} />}
    </div>
  );
}
