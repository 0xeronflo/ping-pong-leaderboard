/**
 * ELO Rating System Implementation
 *
 * Standard ELO formula used in chess and competitive games
 * K-factor: 32 (determines sensitivity of rating changes)
 * Initial rating: 1500
 */

const K_FACTOR = 32;
const INITIAL_RATING = 1500;

// A 3-set match (e.g. 2-1) is the baseline for the sets multiplier.
const REFERENCE_SETS = 3;

// Average point differential per set at which the diff multiplier equals 1.0.
// Games with a larger average diff get a boost (up to 1.5x); smaller diff gets reduced.
const REFERENCE_DIFF = 5;

/**
 * Calculate expected score for a player
 * @param {number} playerElo - Current ELO rating of the player
 * @param {number} opponentElo - Current ELO rating of the opponent
 * @returns {number} Expected score (0 to 1)
 */
function calculateExpectedScore(playerElo, opponentElo) {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Calculate new ELO rating after a game
 * @param {number} currentElo - Current ELO rating
 * @param {number} expectedScore - Expected score (0 to 1)
 * @param {number} actualScore - Actual score (1 for win, 0 for loss)
 * @param {number} effectiveK - Scaled K-factor
 * @returns {number} New ELO rating
 */
function calculateNewElo(currentElo, expectedScore, actualScore, effectiveK) {
  return currentElo + effectiveK * (actualScore - expectedScore);
}

/**
 * Calculate ELO changes for both players after a game.
 *
 * The K-factor is scaled by two independent multipliers:
 *   - Sets multiplier:  totalSets / REFERENCE_SETS  (more sets = more impact)
 *   - Diff multiplier:  min(1.5, avgPointDiffPerSet / REFERENCE_DIFF)
 *                       (larger margins = more impact, capped at 1.5×)
 *
 * Baseline (K = 32 exactly): 3 sets with an average 5-point margin per set.
 *
 * @param {number} winner_elo - Current ELO of winner
 * @param {number} loser_elo  - Current ELO of loser
 * @param {Array}  sets       - Array of { player1_score, player2_score } objects
 * @returns {object} Object with new ratings and change amount
 */
export function calculateEloChange(winner_elo, loser_elo, sets = []) {
  const totalSets = sets.length > 0 ? sets.length : REFERENCE_SETS;

  const avgDiff = sets.length > 0
    ? sets.reduce((sum, s) => sum + Math.abs(s.player1_score - s.player2_score), 0) / sets.length
    : REFERENCE_DIFF;

  const setsMultiplier = totalSets / REFERENCE_SETS;
  const diffMultiplier = Math.min(1.5, avgDiff / REFERENCE_DIFF);
  const effectiveK = K_FACTOR * setsMultiplier * diffMultiplier;

  const winnerExpected = calculateExpectedScore(winner_elo, loser_elo);
  const loserExpected = calculateExpectedScore(loser_elo, winner_elo);

  const winnerNewElo = calculateNewElo(winner_elo, winnerExpected, 1, effectiveK);
  const loserNewElo = calculateNewElo(loser_elo, loserExpected, 0, effectiveK);

  const eloChange = Math.round((winnerNewElo - winner_elo) * 10) / 10;

  return {
    winner_new_elo: Math.round(winnerNewElo * 10) / 10,
    loser_new_elo: Math.round(loserNewElo * 10) / 10,
    elo_change: eloChange
  };
}

export { K_FACTOR, INITIAL_RATING };
