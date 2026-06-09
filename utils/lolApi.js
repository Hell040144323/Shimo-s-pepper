const fetch = require('node-fetch');

const API_KEY = process.env.RIOT_API_KEY;

// 🔥 RiotID → PUUID
async function getPUUID(name, tag) {
  const res = await fetch(
    `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}?api_key=${API_KEY}`
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data.puuid;
}

// 🔥 PUUID → ランク
async function getRank(puuid) {
  const res = await fetch(
    `https://jp1.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}?api_key=${API_KEY}`
  );

  if (!res.ok) return '取得失敗';

  const ranks = await res.json();

  const solo = ranks.find(r => r.queueType === 'RANKED_SOLO_5x5');

  if (!solo) return 'ランクなし';

  return `${solo.tier} ${solo.rank} (${solo.leaguePoints}LP)`;
}

// 🔥 まとめて取得
async function getRankFromRiotId(fullId) {
  const [name, tag] = fullId.split('#');

  const puuid = await getPUUID(name, tag);
  if (!puuid) return '取得失敗';

  return await getRank(puuid);
}

module.exports = {
  getRankFromRiotId
};