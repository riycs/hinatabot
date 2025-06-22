const fs = require("fs");
const moment = require('moment-timezone');
moment.tz.setDefault("Asia/Jakarta").locale("id");

const date = moment(Date.now()).tz('Asia/Jakarta').locale('id').format('a');
const ucapanWaktu = "Selamat " + date.charAt(0).toUpperCase() + date.slice(1);
const more = String.fromCharCode(8206);
const readmore = more.repeat(4001);

// Export help
exports.help = (
  pushname,
  prefix,
  isOwner,
  isPremium,
  sender,
  getLimit,
  cekGLimit,
  getBalance,
  limitCount,
  gcount,
  toRupiah
) => {
  return `👋 Hai ${pushname}!

Tanggal: ${moment.tz('Asia/Jakarta').format('DD/MM/YY')}
Waktu: ${moment.tz('Asia/Jakarta').format('HH:mm:ss')}
Library: Baileys | Prefix: ${prefix}

Status: ${isOwner ? 'Owner' : isPremium ? 'Premium' : 'Free'}
Limit Harian: ${isPremium ? '∞' : getLimit(sender, limitCount, global.db.limit)}
Limit Game: ${isOwner ? '∞' : cekGLimit(sender, gcount, global.db.glimit)}
Balance: $${toRupiah(getBalance(sender, global.db.balance))}
${readmore}
╭──「 🏠 MAIN MENU 」
│› ${prefix}cekprem
│› ${prefix}listprem
╰────

╭──「 🕌 ISLAMIC 」
│› ${prefix}surahlist
│› ${prefix}surah
╰────

╭──「 🛠️ CONVERTER 」
│› ${prefix}sticker
│› ${prefix}stickerwm
╰────

╭──「 📥 DOWNLOADER 」
│› ${prefix}tiktok
╰────

╭──「 🔎 SEARCH 」
│› ${prefix}wikipedia
│› ${prefix}pinterest
╰────

╭──「 🤖 BAILEYS/GRUP 」
│› ${prefix}hidetag
│› ${prefix}add
│› ${prefix}kick
╰────

╭──「 🎮 GAME ZONE 」
│› ${prefix}tebakgambar
│› ${prefix}kuis
╰────

╭──「 💰 BANK/BALANCE 」
│› ${prefix}topbalance
│› ${prefix}transfer
│› ${prefix}buylimit
│› ${prefix}buyglimit
│› ${prefix}limit
╰────

╭──「 👑 OWNER/MOD 」
│› ${prefix}addprem
│› ${prefix}delprem
│› ${prefix}csesi
│› ${prefix}reset
│› x evalcode
│› $ exec
╰────`
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(`Update ${__filename}`);
    delete require.cache[file];
    require(file);
});