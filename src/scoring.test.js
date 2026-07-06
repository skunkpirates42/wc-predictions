import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreR32, scoreR16, scoreGroups, scoreTotal, isFirstTimer } from "./scoring.js";

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

test("scoreR16 scores picked matches and awards free matches to everyone", () => {
  // ids 15-18 picked, 19-22 free. picks index-aligned to R16_MATCHES (8 entries).
  const picks = ["Spain", "Belgium", "Argentina", "Colombia", "England", "Norway", "Morocco", "France"];
  // Spain right, Belgium wrong, Argentina right, Colombia not decided
  const results = {
    15: { winner: "Spain" },
    16: { winner: "USA" },
    17: { winner: "Argentina" },
    // 4 free matches decided — winner irrelevant to the free award
    19: { winner: "England" },
    20: { winner: "Brazil" },
    21: { winner: "Canada" },
    22: { winner: "Paraguay" },
  };
  // 2 picked correct (Spain, Argentina) + 4 free = 6 * 10 = 60
  assert.equal(scoreR16(picks, results), 60);
});

test("scoreR16 awards free matches to non-submitters but no picked-match points", () => {
  // no r16 submission: only the 4 free matches score
  const results = {
    15: { winner: "Spain" }, // picked match — ignored, no submission
    19: { winner: "England" }, 20: { winner: "Brazil" },
    21: { winner: "Canada" }, 22: { winner: "Paraguay" },
  };
  assert.equal(scoreR16(null, results), 40); // 4 free only
  assert.equal(scoreR16(null, {}), 0); // nothing decided
});

test("scoreR16 doubles a first-timer's total only when all 4 real picks are correct", () => {
  const picks = ["Spain", "Belgium", "Argentina", "Colombia", "England", "Norway", "Morocco", "France"];
  const allReal = {
    15: { winner: "Spain" }, 16: { winner: "Belgium" },
    17: { winner: "Argentina" }, 18: { winner: "Colombia" },
    19: { winner: "England" }, // one free decided
  };
  // 4 real correct (40) + 1 free (10) = 50, doubled = 100
  assert.equal(scoreR16(picks, allReal, { firstTimer: true }), 100);
  // non-first-timer: no doubling
  assert.equal(scoreR16(picks, allReal, { firstTimer: false }), 50);
  // first-timer but one real wrong: no doubling
  const oneWrong = { ...allReal, 18: { winner: "Switzerland" } };
  assert.equal(scoreR16(picks, oneWrong, { firstTimer: true }), 40);
  // first-timer, not all 4 real decided yet: no doubling
  const partial = { 15: { winner: "Spain" }, 16: { winner: "Belgium" } };
  assert.equal(scoreR16(picks, partial, { firstTimer: true }), 20);
});

test("isFirstTimer flags participants whose first round is R16", () => {
  assert.equal(isFirstTimer({ picks: { r16: ["Spain"] } }), true);
  assert.equal(isFirstTimer({ picks: { r16: ["Spain"], r32: ["Brazil"] } }), false);
  assert.equal(isFirstTimer({ picks: { r16: ["Spain"], groups: {} } }), false);
  assert.equal(isFirstTimer({ picks: { r32: ["Brazil"] } }), false);
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
  assert.deepEqual(res, { r32: 10, r16: 0, groups: 40, total: 50 });
});
