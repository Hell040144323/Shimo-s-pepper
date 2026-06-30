function convertRankToScore(rank) {
  const tierMap = {
    IRON: 1,
    BRONZE: 2,
    SILVER: 3,
    GOLD: 4,
    PLATINUM: 5,
    EMERALD: 6,
    DIAMOND: 7,
    MASTER: 8,
    GRANDMASTER: 9,
    CHALLENGER: 10
  };

  const rankMap = {
    IV: 1,
    III: 2,
    II: 3,
    I: 4
  };

  return (tierMap[rank.tier] || 0) * 10 + (rankMap[rank.rank] || 0);
}

module.exports = { convertRankToScore };