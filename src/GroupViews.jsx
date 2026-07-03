import { FLAGS, GROUP_LETTERS } from "./data.js";
import { s } from "./styles.js";

// Actual final group standings (Results → Groups). Highlights top-2 (qualifiers).
export function GroupStandingsView({ standings }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {GROUP_LETTERS.map((L) => {
        const st = standings[L];
        return (
          <div key={L} style={s.groupCard}>
            <div style={s.groupHead}>
              Group {L}
              {st && !st.complete && (
                <span style={s.provisional}>provisional</span>
              )}
            </div>
            {st ? (
              st.order.map((team, i) => (
                <div key={team} style={s.standRow(i < 2)}>
                  <span style={{ width: 16, color: "#888" }}>{i + 1}</span>
                  <span style={{ flex: 1 }}>
                    {FLAGS[team] || ""} {team}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: "#aaa" }}>no data</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// A participant's group predictions vs actual (My Picks → Groups).
export function GroupPicksView({ groups, standings }) {
  if (!groups)
    return (
      <div style={{ fontSize: 13, color: "#888", padding: "8px 2px" }}>
        No group-stage picks entered.
      </div>
    );
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {GROUP_LETTERS.map((L) => {
        const picks = groups[L];
        const st = standings[L];
        if (!picks) return null;
        return (
          <div key={L} style={s.groupCard}>
            <div style={s.groupHead}>
              Group {L}
              {st && !st.complete && (
                <span style={s.provisional}>provisional</span>
              )}
            </div>
            {picks.map((team, i) => {
              const actual = st?.order[i];
              const correct = st?.complete && actual === team;
              const wrong = st?.complete && actual !== team;
              return (
                <div key={i} style={s.standRow(false, correct, wrong)}>
                  <span style={{ width: 16, color: "#888" }}>{i + 1}</span>
                  <span style={{ flex: 1 }}>
                    {FLAGS[team] || ""} {team}
                  </span>
                  {st?.complete && (
                    <span style={{ fontSize: 12, fontWeight: "bold", color: correct ? "#3b6d11" : "#a32d2d" }}>
                      {correct ? "✓" : "✗"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
