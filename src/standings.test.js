import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, findMatch, computeStandings } from "./standings.js";

const ev = (a, sa, b, sb, date = "2026-06-20") => ({
  date: `${date}T18:00Z`,
  competitions: [
    {
      status: { type: { state: "post" } },
      competitors: [
        { team: { displayName: a }, score: String(sa) },
        { team: { displayName: b }, score: String(sb) },
      ],
    },
  ],
});

test("normalize unifies ESPN spellings", () => {
  assert.equal(normalize("Ivory Coast"), normalize("Cote d'Ivoire"));
  assert.equal(normalize("Türkiye"), normalize("Turkey"));
  assert.equal(normalize("Cape Verde"), normalize("Cabo Verde"));
  assert.equal(normalize("United States"), normalize("USA"));
});

test("findMatch matches either home/away ordering", () => {
  assert.equal(findMatch("Japan", "Brazil")?.t1, "Brazil");
  assert.equal(findMatch("Brazil", "Japan")?.t1, "Brazil");
});

test("computeStandings ranks a full group by pts→GD→GF with ESPN name quirks", () => {
  // Group A: Mexico, Korea Republic, Czechia, South Africa. Use "South Korea"
  // for Korea Republic to exercise normalize.
  const K = "South Korea";
  const events = [
    ev("Mexico", 2, K, 0),
    ev("Mexico", 3, "Czechia", 0),
    ev("Mexico", 1, "South Africa", 0),
    ev(K, 2, "Czechia", 1),
    ev(K, 1, "South Africa", 1),
    ev("Czechia", 0, "South Africa", 0, "2026-06-27"),
  ];
  const st = computeStandings(events).A;
  assert.equal(st.complete, true);
  assert.equal(st.completeDate, "2026-06-27");
  assert.equal(st.order[0], "Mexico"); // 9 pts
  assert.equal(st.order[1], "Korea Republic"); // 4 pts, mapped from "South Korea"
});

test("computeStandings marks incomplete groups (fewer than 6 finals)", () => {
  const st = computeStandings([ev("Mexico", 1, "South Korea", 0)]).A;
  assert.equal(st.complete, false);
  assert.equal(st.completeDate, null);
});
