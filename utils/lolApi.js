const API_KEY = process.env.RIOT_API_KEY;

async function getRankFromRiotId(riotId) {
  try {
    console.log("getRank");

    const [gameName, tagLine] = riotId.trim().split('#');

    // ① PUUID取得
    const accountRes = await fetch(
      `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${API_KEY}`
    );

    const account = await accountRes.json();
    console.log("Account:", account);

    if (!account.puuid) return "アカウント取得失敗";

    // ② Summoner取得
    const summonerRes = await fetch(
      `https://jp1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}?api_key=${API_KEY}`
    );

    const summoner = await summonerRes.json();
    console.log("Summoner:", summoner);

    // 🔥 エラー判定
    if (summoner.status) return "サモナー取得失敗";

    if (!summoner.id) {
      console.log("IDなし:", summoner);
      return "サモナーID取得失敗";
    }

    // ③ ランク取得（ここ重要）
    const rankRes = await fetch(
      `https://jp1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}?api_key=${API_KEY}`
    );

    const ranks = await rankRes.json();
    console.log("Rank raw:", ranks);

    // 🔥 APIエラー
    if (!Array.isArray(ranks)) return "ランク取得失敗";

    // 🔥 未プレイ
    if (ranks.length === 0) return "ランク未プレイ";

    const solo = ranks.find(r => r.queueType === 'RANKED_SOLO_5x5');

    if (!solo) return "ソロランクなし";

    return `${solo.tier} ${solo.rank} (${solo.leaguePoints}LP)`;

  } catch (err) {
    console.error(err);
    return "取得失敗";
  }
}

module.exports = { getRankFromRiotId };