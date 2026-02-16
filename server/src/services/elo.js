/**
 * ELO Rating System Implementation
 *
 * Standard ELO formula used in chess and competitive games
 * K-factor: 32 (determines sensitivity of rating changes)
 * Initial rating: 1500
 */

const K_FACTOR = 32;
const INITIAL_RATING = 1500;

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
 * @returns {number} New ELO rating
 */
function calculateNewElo(currentElo, expectedScore, actualScore) {
  return currentElo + K_FACTOR * (actualScore - expectedScore);
}

/**
 * Calculate ELO changes for both players after a game
 * @param {number} winner_elo - Current ELO of winner
 * @param {number} loser_elo - Current ELO of loser
 * @returns {object} Object with new ratings and change amount
 */
export function calculateEloChange(winner_elo, loser_elo) {
  const winnerExpected = calculateExpectedScore(winner_elo, loser_elo);
  const loserExpected = calculateExpectedScore(loser_elo, winner_elo);

  const winnerNewElo = calculateNewElo(winner_elo, winnerExpected, 1);
  const loserNewElo = calculateNewElo(loser_elo, loserExpected, 0);

  const eloChange = Math.round((winnerNewElo - winner_elo) * 10) / 10;

  return {
    winner_new_elo: Math.round(winnerNewElo * 10) / 10,
    loser_new_elo: Math.round(loserNewElo * 10) / 10,
    elo_change: eloChange
  };
}

export { K_FACTOR, INITIAL_RATING };
