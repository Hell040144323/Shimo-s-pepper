const API_KEY = process.env.RIOT_API_KEY;

async function getRankFromRiotId(riotId) {
  try {
    const [gameName, tagLine] = riotId.split('#');

    // ① PUUID取得
    const accountRes = await fetch(
      `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${API_KEY}`
    );

    const account = await accountRes.json();
    if (!account.puuid) return "取得失敗";

    // ② Summoner取得
    const summonerRes = await fetch(
      `https://jp1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}?api_key=${API_KEY}`
    );

    const summoner = await summonerRes.json();
    if (!summoner.id) return "取得失敗";

    // ③ ランク取得
    const rankRes = await fetch(
      `https://jp1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}?api_key=${API_KEY}`
    );


    const ranks = await rankRes.json();

    console.log(account);
    console.log(summoner);
    console.log(ranks);

    const solo = ranks.find(r => r.queueType === 'RANKED_SOLO_5x5');

    if (!solo) return "ランクなし";


    return `${solo.tier} ${solo.rank} (${solo.leaguePoints}LP)`;

  } catch (err) {
    console.error(err);
    return "取得失敗";
  }
}

module.exports = { getRankFromRiotId };