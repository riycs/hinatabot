const chalk = require("chalk");
const axios = require("axios");

const fetchAPI = async (url, params = {}, responseType = "json") => {
    try {
        const res = await axios.get(url, { params, responseType });
        console.log(
            chalk.black(chalk.bgYellow(' [fetchAPI] ')),
            '\n' + chalk.greenBright(url),
            '\n' + chalk.gray(`=>`),
            chalk.cyanBright(JSON.stringify(res.data)?.slice(0, 100) + '...')
        );
        return res.data;
    } catch (err) {
        console.log(
            chalk.black(chalk.bgRed(' [fetchAPI ERROR] ')),
            '\n' + chalk.redBright(url),
            '\n' + chalk.gray(`=>`),
            chalk.yellow(err.message)
        );
        throw new Error("Gagal menghubungi API.");
    }
};

module.exports = {
    quranSurahList: () => fetchAPI("https://muslim-api-three.vercel.app/v1/quran/surah"),
    quranSurahDetail: (id) => fetchAPI("https://muslim-api-three.vercel.app/v1/quran/surah", { id }),
    tiktok: (url) => fetchAPI("https://api.siputzx.my.id/api/tiktok/v2", { url }),
    wikipedia: (query) => fetchAPI("https://api.siputzx.my.id/api/s/wikipedia", { query }),
    pinterest: (query) => fetchAPI("https://api.siputzx.my.id/api/s/pinterest", { query }),
    tebakgambar: () => fetchAPI("https://raw.githubusercontent.com/riycs/database/master/games/tebakgambar.json"),
    kuis: () => fetchAPI("https://raw.githubusercontent.com/riycs/database/master/games/tekateki.json")
};
