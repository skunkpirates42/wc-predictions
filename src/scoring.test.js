import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreR32, scoreGroups, scoreTotal } from "./scoring.js";

test("scoreR32 counts correct winners at +10", () => {
  const results = {
    0: { winner: "Brazil" },
    1: { winner: "Germany" },
    2: { winner: "Netherlands" },
  };
  assert.equal(scoreR32(["Brazil", "Germany", "Japan"], results), 20);
});

test("scoreR32 ignores null picks and undecided matches", () => {
  const results = { 0: { winner: "Brazil" }, 1: { winner: "Germany" } };
  assert.equal(scoreR32([null, "Germany"], results), 10);
  assert.equal(scoreR32(["Brazil"], {}), 0);
  assert.equal(scoreR32(null, results), 0);
});

const standings = {
  A: {
    order: ["Mexico", "Korea Republic", "Czechia", "South Africa"],
    complete: true,
  },
};

test("scoreGroups awards +10 per exact slot", () => {
  const picks = { A: ["Mexico", "Korea Republic", "Czechia", "South Africa"] };
  assert.equal(scoreGroups(picks, standings).total, 40);
});

test("scoreGroups partial credit for exact slots only", () => {
  const picks = { A: ["Mexico", "Korea Republic", "South Africa", "Czechia"] };
  assert.equal(scoreGroups(picks, standings).total, 20);
});

test("scoreGroups skips incomplete groups and missing/null picks", () => {
  const incomplete = { A: { order: [], complete: false } };
  const perfect = { A: ["Mexico", "Korea Republic", "Czechia", "South Africa"] };
  assert.equal(scoreGroups(perfect, incomplete).total, 0);
  assert.equal(scoreGroups({}, standings).total, 0);
  assert.equal(scoreGroups(null, standings).total, 0);
});

test("scoreTotal sums both rounds", () => {
  const p = {
    picks: {
      r32: ["Brazil"],
      groups: { A: ["Mexico", "Korea Republic", "Czechia", "South Africa"] },
    },
  };
  const res = scoreTotal(p, { results: { 0: { winner: "Brazil" } }, standings });
  assert.deepEqual(res, { r32: 10, groups: 40, total: 50 });
});
