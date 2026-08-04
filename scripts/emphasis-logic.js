export const TIEBREAKERS = Object.freeze({
  REROLL: "reroll",
  HIGHER: "higher"
});

/** Return a d20 result's distance from the Emphasis midpoint. */
export function distanceFromTen(result) {
  return Math.abs(Number(result) - 10);
}

/**
 * Choose which of two d20 results is kept.
 *
 * @returns {0|1|null} The kept result's index, or null when both dice must be rerolled.
 */
export function chooseEmphasisResult(first, second, tiebreaker = TIEBREAKERS.REROLL) {
  const firstDistance = distanceFromTen(first);
  const secondDistance = distanceFromTen(second);

  if (firstDistance > secondDistance) return 0;
  if (secondDistance > firstDistance) return 1;
  if (tiebreaker === TIEBREAKERS.HIGHER) return Number(second) > Number(first) ? 1 : 0;
  return null;
}
