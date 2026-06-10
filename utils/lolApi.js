const API_KEY = process.env.RIOT_API_KEY;

async function getRankFromRiotId(riotId) {
  try {
    console.log("getRank");
    const [gameName, tagLine] = riotId.split('#');

    // ① PUUID取得
    const accountRes = await fetch(
      `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${API_KEY}`
    );

    const account = await accountRes.json();
    console.log("Account:",account);
    if (!account.puuid) return "アカウント取得失敗";

    // ② Summoner取得
    const summonerRes = await fetch(
  `https://jp1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}?api_key=${API_KEY}`
);
    const summoner = await summonerRes.json();
    console.log("Summoner:",summoner);
    if (!summoner.puuid) return "サモナー取得失敗";

    // ③ ランク取得
    const rankRes = await fetch(
      `https://jp1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.puuidid}?api_key=${API_KEY}`
    );

    console.log("Rank raw:", ranks);

    const ranks = await rankRes.json();

    const solo = ranks.find(r => r.queueType === 'RANKED_SOLO_5x5');

    if (!solo) return "ランクなし";


    return `${solo.tier} ${solo.rank} (${solo.leaguePoints}LP)`;

  } catch (err) {
    console.error(err);
    return "取得失敗";
  }
}

module.exports = { getRankFromRiotId };