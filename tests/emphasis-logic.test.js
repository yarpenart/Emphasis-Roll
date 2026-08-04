import assert from "node:assert/strict";
import test from "node:test";

import { chooseEmphasisResult, distanceFromTen, TIEBREAKERS } from "../scripts/emphasis-logic.js";

test("distance is measured from 10", () => {
  assert.equal(distanceFromTen(1), 9);
  assert.equal(distanceFromTen(10), 0);
  assert.equal(distanceFromTen(20), 10);
});

test("keeps the result farther from 10", () => {
  assert.equal(chooseEmphasisResult(1, 20), 1);
  assert.equal(chooseEmphasisResult(18, 4), 0);
  assert.equal(chooseEmphasisResult(2, 11), 0);
});

test("standard tiebreaker requests a reroll", () => {
  assert.equal(chooseEmphasisResult(7, 13, TIEBREAKERS.REROLL), null);
  assert.equal(chooseEmphasisResult(10, 10, TIEBREAKERS.REROLL), null);
});

test("variant tiebreaker keeps the higher result", () => {
  assert.equal(chooseEmphasisResult(7, 13, TIEBREAKERS.HIGHER), 1);
  assert.equal(chooseEmphasisResult(13, 7, TIEBREAKERS.HIGHER), 0);
  assert.equal(chooseEmphasisResult(5, 5, TIEBREAKERS.HIGHER), 0);
});
