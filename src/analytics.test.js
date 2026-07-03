import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTimeline, accuracyByRound } from "./analytics.js";

const standings = {
  A: {
    order: ["Mexico", "Korea Republic", "Czechia", "South Africa"],
    complete: true,
    completeDate: "2026-06-25",
  },
};
const results = {
  0: { winner: "Brazil", date: "2026-06-28" },
  1: { winner: "Germany", date: "2026-06-29" },
};

test("buildTimeline accumulates points across the timeline", () => {
  const participants = [
    {
      name: "You",
      picks: {
        r32: ["Brazil", "Japan"],
        groups: { A: ["Mexico", "Korea Republic", "Czechia", "South Africa"] },
      },
    },
  ];
  const { dates, series } = buildTimeline(participants, results, standings);
  assert.deepEqual(dates, ["2026-06-25", "2026-06-28", "2026-06-29"]);
  // 40 (group, 6/25) → +10 Brazil (6/28) → Japan wrong (6/29)
  assert.deepEqual(series[0].cum, [40, 50, 50]);
});

test("accuracyByRound reports you vs field average", () => {
  const you = {
    picks: {
      r32: ["Brazil", "Japan"],
      groups: { A: ["Mexico", "Korea Republic", "Czechia", "South Africa"] },
    },
  };
  const field = [
    you,
    { picks: { r32: ["Brazil", "Germany"], groups: null } },
  ];
  const acc = accuracyByRound(you, field, results, standings);
  assert.equal(acc.r32.you, 1); // Brazil right, Japan wrong
  assert.equal(acc.groups.you, 4); // perfect group
  assert.equal(acc.groups.total, 4); // 1 complete group * 4
});
