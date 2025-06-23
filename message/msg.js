const fs = require('fs');
const util = require("util");
const {
    exec
} = require("child_process");

const axios = require("axios");
const chalk = require("chalk");
const moment = require("moment-timezone");
const ms = require("parse-ms");
const baileys = require("baileys");

const fetch = (...args) =>
    import('node-fetch').then(({
        default: fetch
    }) => fetch(...args));

const Api = require("../lib/Api");
const {
    randomNomor,
    toRupiah,
    pickRandom,
    getRandom,
    sleep
} = require("../lib/function");
const {
    addPlayGame,
    getJawabanGame,
    isPlayGame,
    cekWaktuGame,
    getGamePosi
} = require("../lib/game");
const {
    isLimit,
    limitAdd,
    getLimit,
    giveLimit,
    addBalance,
    kurangBalance,
    getBalance,
    isGame,
    gameAdd,
    givegame,
    cekGLimit
} = require("../lib/limit");
const _prem = require("../lib/premium");

let tebakgambar = [];
let kuis = [];

let groupMetadata = {};
let groupName = "";
let participant = [];
let groupAdmin = [];
let groupMember = [];
let isAdmin = false;
let isBotAdmin = false;

moment.tz.setDefault('Asia/Jakarta').locale('id');

setInterval(() => {
    const now = moment().tz('Asia/Jakarta');
    const time = now.format("HH:mm");
    if (time === "00:00") {
        global.db.limit = [];
        global.db.glimit = [];
        console.log(`[${now.format("YYYY-MM-DD HH:mm:ss")}] Reset limit berhasil!`);
    }
}, 60000);

module.exports = sock = async (sock, m, chatUpdate, store) => {
    try {

        const getContentType = baileys.getContentType;
        const getFullText = (msg) => {
            try {
                const mtype = msg?.mtype || getContentType(msg?.message || {});
                const message = msg?.message || {};
                switch (mtype) {
                    case "conversation":
                        return message.conversation || '';
                    case "imageMessage":
                        return message.imageMessage?.caption || '';
                    case "videoMessage":
                        return message.videoMessage?.caption || '';
                    case "documentMessage":
                        return message.documentMessage?.caption || '';
                    case "extendedTextMessage":
                        return message.extendedTextMessage?.text || '';
                    case "buttonsResponseMessage":
                        return message.buttonsResponseMessage?.selectedButtonId || '';
                    case "listResponseMessage":
                        return message.listResponseMessage?.singleSelectReply?.selectedRowId || '';
                    case "templateButtonReplyMessage":
                        return message.templateButtonReplyMessage?.selectedId || '';
                    case "interactiveResponseMessage":
                        try {
                            const data = JSON.parse(msg.msg?.nativeFlowResponseMessage?.paramsJson || '{}');
                            return data.id || '';
                        } catch {
                            return '';
                        }
                    case "pollCreationMessage":
                        return `📊 Poll: ${message.pollCreationMessage?.name || ''}`;
                    case "reactionMessage":
                        return `@${message.reactionMessage?.key?.participant?.split('@')[0]} mereaksi: ${message.reactionMessage?.text || ''}`;
                    case "viewOnceMessage": {
                        const inner = message.viewOnceMessage?.message;
                        const innerType = getContentType(inner || {});
                        return inner?.[innerType]?.caption || '';
                    }
                    case "templateMessage": {
                        const buttons = message?.templateMessage?.hydratedTemplate?.hydratedButtons || [];
                        for (const btn of buttons) {
                            if (btn.copyableTextButton) return btn.copyableTextButton.copyText || btn.copyableTextButton.displayText || '';
                            if (btn.urlButton) return btn.urlButton.displayText || '';
                            if (btn.callButton) return btn.callButton.displayText || '';
                        }
                        return '';
                    }
                    case "messageContextInfo":
                        return message.buttonsResponseMessage?.selectedButtonId ||
                            message.listResponseMessage?.singleSelectReply?.selectedRowId ||
                            msg.text || '';
                    default:
                        return msg.text || msg.body || '';
                }
            } catch (e) {
                return '';
            }
        };

        const body = getFullText(m);
        const pushname = m.pushName || "No Name";
        const botNumber = await sock.decodeJid(sock.user.id);

        const prefixRegex = /^[°•π÷×¶∆£¢€¥®™+✓_=|/~!?#%^&.©^]/;
        const prefix = prefixRegex.test(body) ? body.match(prefixRegex)[0] : "#";

        const command = body.toLowerCase().split(" ")[0] || "";
        const isCmd = command.startsWith(prefix);
        const args = body.trim().split(" ");
        const text = body.slice(command.length + 1).trim();
        const quoted = m.quoted || m;
        const mime = (quoted.msg || quoted).mimetype || "";

        if (m.isGroup) {
            try {
                groupMetadata = await sock.groupMetadata(m.chat);
                groupName = groupMetadata.subject;
                participant = groupMetadata.participants || [];
                groupMember = participant;
                groupAdmin = participant
                    .filter(p => p.admin !== null)
                    .map(p => p.id);
                isAdmin = groupAdmin.includes(m.sender);
                isBotAdmin = groupAdmin.includes(botNumber);
            } catch (e) {
                console.error("Gagal ambil metadata grup:", e);
            }
        }

        const senderJid = m.sender;
        const isOwner = global.ownerNumber
            .map(num => num.replace(/\D/g, '') + '@s.whatsapp.net')
            .includes(senderJid);
        const isUser = global.db.pendaftar.includes(senderJid);
        const isPremium = isOwner || _prem.checkPremiumUser(senderJid, global.db.premium);

        // Game limit
        const gcount = isPremium ?
            global.main.glimit.premium :
            global.main.glimit.free;

        // Public/self
        if (!global.options.public && !isOwner) return;

        // Cek command
        const isValidCommand = isCmd && args[0]?.length > 1;

        // Auto daftar
        if (isValidCommand && !isUser) {
            global.db.pendaftar.push(m.sender);
        }

        // Cek expired premium
        _prem.expiredCheck(sock, global.db.premium);

        // Handle game
        function handleTebakan(m, sock, dbx, main) {
            cekWaktuGame(sock, dbx);
            if (!isPlayGame(m.chat, dbx) || !isUser) return;
            const pos = getGamePosi(m.chat, dbx);
            const data = dbx[pos];
            const jawaban = getJawabanGame(m.chat, dbx);
            const userJawab = body.toLowerCase();
            const dariBotSendiri = quoted?.id === data?.msg?.id;
            if (dariBotSendiri && userJawab === 'nyerah') {
                m.reply(`Yah nyerah!\nJawabannya: ${jawaban}`);
                dbx.splice(pos, 1);
                return true;
            }
            if (userJawab === jawaban) {
                const uang = randomNomor(100, 150);
                addBalance(m.sender, uang, global.db.balance);
                m.reply(`*🎊 Selamat Jawaban Kamu Benar 🎉*\n\nJawaban: ${jawaban}\nHadiah: $${uang} balance\n\nMau main lagi? ketik *${main}*`);
                dbx.splice(pos, 1);
                return true;
            }
            return false;
        }
        handleTebakan(m, sock, tebakgambar, `${prefix}tebakgambar`);
        handleTebakan(m, sock, kuis, `${prefix}kuis`);

        // Log
        if (isValidCommand && !m.key.fromMe) {
            console.log(
                chalk.black(chalk.bgWhite('- FROM')), chalk.black(chalk.bgGreen(pushname)),
                chalk.black(chalk.yellow(m.sender)),
                '\n' + chalk.black(chalk.bgWhite('- IN')), chalk.black(chalk.bgGreen(m.isGroup ? groupName : 'Private Chat')),
                chalk.black(chalk.yellow(m.chat)),
                '\n' + chalk.black(chalk.bgWhite('- COMMAND')), chalk.black(chalk.bgGreen(command)),
                '\n' + chalk.black(chalk.bgWhite('- HIT')), chalk.black(chalk.bgGreen(hit))
            );
        }

        switch (command) {

            /* MAIN MENU */

            case prefix + "menu":
            case prefix + "help": {
                const cekUser = await getUser(m.sender.split('@')[0]);
                const {
                    help
                } = require("../message/help");
                const menu = help(
                    pushname,
                    prefix,
                    isOwner,
                    isPremium,
                    senderJid,
                    getLimit,
                    cekGLimit,
                    getBalance,
                    global.main.limit,
                    gcount,
                    toRupiah
                );
                m.reply(menu);
            }
            break;

            case prefix + "cekprem":
            case prefix + "cekpremium": {
                if (!isPremium) return m.reply(global.mess.premium);
                if (isOwner) return m.reply('Ngapain?');
                const expired = _prem.getPremiumExpired(m.sender, global.db.premium);
                if (expired === 'PERMANENT') return m.reply('PERMANENT');
                const timeLeft = ms(expired - Date.now());
                const teks = `Expired: ${timeLeft.days} hari ${timeLeft.hours} jam ${timeLeft.minutes} menit ${timeLeft.seconds} detik`;
                return m.reply(teks);
            }
            break;

            case prefix + "listprem":
            case prefix + "listpremium": {
                const sorted = global.db.premium.slice().sort((a, b) => {
                    if (a.expired === 'PERMANENT') return -1;
                    if (b.expired === 'PERMANENT') return 1;
                    return b.expired - a.expired;
                });
                let teks = `*LIST PENGGUNA PREMIUM*\n\nJumlah: ${global.db.premium.length}\n\n`;
                sorted.forEach((user, i) => {
                    const id = user.id.split('@')[0];
                    teks += `*${i + 1}.* @${id}\n`;
                    if (user.expired === 'PERMANENT') {
                        teks += `*Expired:* PERMANENT\n\n`;
                    } else {
                        const time = ms(user.expired - Date.now());
                        teks += `*Expired:* ${time.days} hari ${time.hours} jam ${time.minutes} menit ${time.seconds} detik\n\n`;
                    }
                });
                return m.reply(teks);
            }
            break;

            case prefix + "sc":
            case prefix + "script":
            case prefix + "source":
            case prefix + "sourcecode": {
            	addCountCmd('#script', m.sender, global.db._cmd);
            	const teks = `Bot ini open-source dan bebas dikembangkan.
Jangan lupa ⭐ repo ini kalau membantu ya!

🔗 https://github.com/riycs/hinatabot`;
                m.reply(teks);
            }
            break;

            /* ISLAM */

            case prefix + "surahlist": {
                try {
                    const res = await Api.quranSurahList();
                    const list = res.data;
                    if (!Array.isArray(list)) return m.reply("Gagal mengambil daftar surah.");
                    let teks = `📖 *Daftar Surah Al-Quran (${list.length} Surah)*\n\n`;
                    for (const surah of list) {
                        teks += `*${surah.number}.* ${surah.name_id || 'Tanpa Nama'}\n`;
                    }
                    m.reply(teks.trim());
                } catch (err) {
                    m.reply(global.mess.error);
                }
            }
            break;

            case prefix + "surah": {
                if (!text || isNaN(text)) {
                    return m.reply(`Contoh:\n- ${prefix}surah 1\n- ${prefix}surah 36\n\nGunakan hanya *nomor surah*.\nCek semua surah: ${prefix}surahlist`);
                }
                try {
                    const number = parseInt(text);
                    const res = await Api.quranSurahList();
                    const surahList = res.data;
                    const targetSurah = surahList.find(s => parseInt(s.number) === number);
                    if (!targetSurah) return m.reply('Surah tidak ditemukan.');
                    const data = await Api.quranSurahDetail(number);
                    const surahDetail = data.data;
                    const sendAudio = await sock.sendMessage(m.chat, {
                        audio: { url: surahDetail.audio_url },
                        mimetype: 'audio/mpeg',
                        fileName: `${surahDetail.name_id}.mp3`,
                        ptt: true
                    }, { quoted: m });
                    await sock.sendMessage(m.chat, {
                        text: surahDetail.tafsir.trim()
                    }, { quoted: sendAudio });
                } catch (err) {
                    m.reply(global.mess.error);
                }
            }
            break;

            /* CONVERT MENU */

            case prefix + "s":
            case prefix + "stiker":
            case prefix + "sticker": {
                if (isLimit(m.sender, isPremium, isOwner, global.main.limit, global.db.limit)) {
                    return m.reply(global.mess.limit);
                }
                const type = /image/.test(mime) ? 'image' : /video/.test(mime) ? 'video' : quoted?.isAnimated ? 'animated' : null;
                if (!type) return m.reply(`Balas media dengan caption: ${command}`);
                const media = await quoted.download();
                if (type === 'video' && quoted.seconds > 8) return m.reply("⚠️ Maksimal durasi video 8 detik!");
                const file = type === 'image' ?
                    await sock.sendImageAsSticker(m.chat, media, m, {
                        packname: global.sticker.packName,
                        author: global.sticker.author
                    }) :
                    await sock.sendVideoAsSticker(m.chat, media, m, {
                        packname: global.sticker.packName,
                        author: global.sticker.author
                    });
                fs.unlinkSync(file);
                limitAdd(m.sender, global.db.limit);
            }
            break;

            case prefix + "swm":
            case prefix + "stikerwm":
            case prefix + "stickerwm": {
                if (!isPremium) return m.reply(global.mess.premium);
                const type = /image|webp/.test(mime) ? 'image' : /video/.test(mime) ? 'video' : quoted?.isAnimated ? 'animated' : null;
                if (!type) return m.reply(`Balas media dengan caption: ${command} Packname|Author`);
                const [pName, aName] = text.split('|').map(x => x.trim());
                if (!pName) return m.reply(`Kirim: ${command} Packname|Author`);
                const media = await quoted.download();
                if (type === 'video' && quoted.seconds > 8) return m.reply("⚠️ Maksimal durasi video 8 detik!");
                const file = type === 'image' ?
                    await sock.sendImageAsSticker(m.chat, media, m, {
                        packname: pName,
                        author: aName
                    }) :
                    await sock.sendVideoAsSticker(m.chat, media, m, {
                        packname: pName,
                        author: aName
                    });
                fs.unlinkSync(file);
            }
            break;

                /* DOWNLOADER MENU */

            case prefix + "tiktok":
            case prefix + "tt": {
                if (isLimit(m.sender, isPremium, isOwner, global.main.limit, global.db.limit)) {
                    return m.reply(global.mess.limit);
                }
                if (!text) return m.reply(`Kirim perintah: ${command} link TikTok`);
                const cleanUrl = text.trim().split(/\s+/)[0];
                const tiktokRegex = /(?:https?:\/\/)?(?:www\.)?(?:vt\.|vm\.)?tiktok\.com\/(?:@[\w.-]+\/video\/\d+|t\/[\w-]+|[\w-]+)/i;
                if (!tiktokRegex.test(cleanUrl)) {
                    return m.reply(`Link tidak valid!\nContoh: ${command} https://www.tiktok.com/@username/video/123456`);
                }
                m.reply(global.mess.wait);
                try {
                    const res = await Api.tiktok(cleanUrl);
                    const data = res.data?.download;
                    const title = res.data?.metadata?.description || 'Tiktok...';
                    const filename = `${res.data?.metadata?.description}.mp4` || getRandom('Tiktok.mp4');
                    if (data.video && Array.isArray(data.video)) {
                        await sock.sendBuffer(m, 'video', data.video[0], title, filename);
                    } else if (data.photo && Array.isArray(data.photo)) {
                        for (const img of data.photo) {
                            await sock.sendBuffer(m, 'image', img, '');
                            await sleep(1000); // Delay antar slide
                        }
                    } else {
                        return m.reply("Gagal mendapatkan video atau slide dari link tersebut.");
                    }
                    limitAdd(m.sender, global.db.limit);
                } catch (err) {
                    m.reply(global.mess.error);
                }
            }
            break;

            /* SEARCHING MENU */

            case prefix + "wikipedia":
            case prefix + "wiki": {
                if (isLimit(m.sender, isPremium, isOwner, global.main.limit, global.db.limit)) return m.reply(global.mess.limit);
                if (!text) return m.reply(`Kirim perintah: ${command} query`);
                m.reply(global.mess.wait);
                try {
                    const res = await Api.wikipedia(text);
                    const {
                        wiki,
                        thumb
                    } = res.data || {};
                    if (!wiki) return m.reply("Hasil Wikipedia tidak ditemukan.");
                    await sock.sendBuffer(m, 'image', thumb, wiki.trim());
                    limitAdd(m.sender, global.db.limit);
                } catch {
                    m.reply(global.mess.error);
                }
            }
            break;

            case prefix + "pinterest":
            case prefix + "pin": {
                if (isLimit(m.sender, isPremium, isOwner, global.main.limit, global.db.limit)) return m.reply(global.mess.limit);
                if (!text) return m.reply(`Kirim perintah: ${command} query`);
                m.reply(global.mess.wait);
                try {
                    const res = await Api.pinterest(text);
                    const result = res.data?.[0];
                    if (!result) return m.reply("Gambar Pinterest tidak ditemukan.");
                    await sock.sendBuffer(m, 'image', result.images_url, result.pin);
                    limitAdd(m.sender, global.db.limit);
                } catch {
                    m.reply(global.mess.error);
                }
            }
            break;

            /* BAILEYS MENU */

            case prefix + "hidetag":
            case prefix + "ht": {
                if (!m.isGroup) return m.reply(global.mess.group);
                if (!isAdmin) return m.reply(global.mess.admin);
                if (!text) return m.reply("Kirim teks untuk hide tag!");
                const mentions = participant.map(user => user.id);
                await sock.sendMessage(m.chat, {
                    text,
                    mentions
                });
            }
            break;

            /* GROUP MENU */

            case prefix + "add": {
                if (!isOwner) return m.reply("Fitur telah dinonaktifkan!");
                if (!m.isGroup) return m.reply(global.mess.group);
                if (!isAdmin) return m.reply(global.mess.admin);
                if (!isBotAdmin) return m.reply(global.mess.botAdmin);
                let users = m.mentionedJid.length !== 0 ?
                    m.mentionedJid.slice(0, 2) :
                    m.quoted ? [m.quoted.sender] :
                    text.split(",").map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').slice(0, 2);
                if (users.length === 0) return m.reply('Masukkan nomor yang ingin ditambahkan.');
                try {
                    const res = await sock.groupParticipantsUpdate(m.chat, users, 'add');
                    for (let i of res) {
                        if (i.status === 403) {
                            m.reply('Tidak dapat menambahkan. Mungkin karena pengaturan privasi.');
                        } else if (i.status === 409) {
                            m.reply('Nomor tersebut sudah ada di grup ini.');
                        } else {
                            m.reply(`Status: ${i.status}`);
                        }
                    }
                } catch (err) {
                    m.reply(`Terjadi kesalahan: ${err}`);
                }
            }
            break;

            case prefix + "kick": {
                if (!m.isGroup) return m.reply(global.mess.group);
                if (!isAdmin) return m.reply(global.mess.admin);
                if (!isBotAdmin) return m.reply(global.mess.botAdmin);
                let nomor = m.mentionedJid.length !== 0 ?
                    m.mentionedJid[0] :
                    m.quoted ?
                    m.quoted.sender :
                    null;
                if (!nomor) return m.reply('Tag atau balas pesan anggota yang ingin dikeluarkan.');
                try {
                    await sock.groupParticipantsUpdate(m.chat, [nomor], 'remove');
                    m.reply('Berhasil mengeluarkan anggota.');
                } catch (err) {
                    m.reply(`Gagal mengeluarkan anggota: ${err}`);
                }
            }
            break;

            /* GAME MENU */

            case prefix + "tebakgambar": {
                if (isGame(m.sender, isOwner, gcount, global.db.glimit))
                    return m.reply(global.mess.glimit);
                if (isPlayGame(m.chat, tebakgambar)) {
                    const pos = getGamePosi(m.chat, tebakgambar);
                    return sock.sendMessage(m.chat, {
                        text: `Masih ada game yang belum diselesaikan.`
                    }, {
                        quoted: tebakgambar[pos].msg
                    });
                }
                try {
                    const res = await Api.tebakgambar();
                    const data = pickRandom(res);
                    const { img, deskripsi, jawaban } = data;
                    const teks = `*TEBAK GAMBAR*\n\nDeskripsi: ${deskripsi}\nPetunjuk: ${jawaban.replace(/[AIUEO]/gi, '_')}\nWaktu: 90 detik\n\nBalas soal ini dengan *Nyerah* jika ingin menyerah.`;
                    const msg = await sock.sendMessage(m.chat, {
                        image: {
                            url: img
                        },
                        caption: teks
                    }, {
                        quoted: m
                    });
                    const jawab = jawaban.toLowerCase();
                    addPlayGame(m.chat, 'Tebak Gambar', jawab, 90, msg, tebakgambar);
                    gameAdd(m.sender, global.db.glimit);
                } catch (err) {
                    m.reply(global.mess.error);
                }
            }
            break;

            case prefix + "kuis": {
                if (isGame(m.sender, isOwner, gcount, global.db.glimit))
                    return m.reply(global.mess.glimit);
                if (isPlayGame(m.chat, kuis)) {
                    const pos = getGamePosi(m.chat, kuis);
                    return sock.sendMessage(m.chat, {
                        text: `Masih ada game yang belum diselesaikan.`
                    }, {
                        quoted: kuis[pos].msg
                    });
                }
                try {
                    const res = await Api.kuis();
                    const data = pickRandom(res);
                    const { soal, jawaban } = data;
                    const teks = `*GAME KUIS*\n\nSoal: ${soal}\nPetunjuk: ${jawaban.replace(/[AIUEO]/gi, '_')}\nWaktu: ${global.main.game.waktu} detik\n\nBalas soal ini dengan *Nyerah* jika ingin menyerah.`;
                    const msg = await sock.sendMessage(m.chat, {
                        text: teks
                    }, {
                        quoted: m
                    });
                    const jawab = jawaban.toLowerCase();
                    addPlayGame(m.chat, 'Game Kuis', jawab, global.main.game.waktu, msg, kuis);
                    gameAdd(m.sender, global.db.glimit);
                } catch (err) {
                    m.reply(global.mess.error);
                }
            }
            break;

            /* LIMIT */

            case prefix + "topbalance": {
                let sorted = global.db.balance.sort((a, b) => b.balance - a.balance);
                let teks = '*── 「 TOP BALANCE 」 ──*\n\n';
                let limit = Math.min(10, sorted.length);
                for (let i = 0; i < limit; i++) {
                    teks += `*${i + 1}.* @${sorted[i].id.split('@')[0]}\n`;
                    teks += `• Balance: $${sorted[i].balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}\n\n`;
                }
                m.reply(teks);
            }
            break;

            case prefix + "transfer":
            case prefix + "tf": {
                if (!m.isGroup) return m.reply(global.mess.group);
                if (!text) return m.reply(`Gunakan format:\n*${command}* @0 nominal\nContoh: ${command} @0 2000`);
                const target = m.mentionedJid[0];
                const nominal = parseInt(args[2]);
                if (!target) return m.reply('Tag user yang ingin kamu transfer.');
                if (!args[2]) return m.reply('Masukkan nominal transfer.');
                if (isNaN(nominal)) return m.reply('Nominal harus berupa angka.');
                if (nominal < 5) return m.reply('Minimal transfer adalah 5 balance.');
                const senderBal = getBalance(m.sender, global.db.balance);
                if (senderBal < nominal) {
                    return m.reply(`Balance kamu tidak cukup untuk transfer $${nominal}.\nCek saldo dengan *${prefix}balance*`);
                }
                const tax = Math.ceil(nominal * 0.02);
                const received = nominal - tax;
                kurangBalance(m.sender, nominal, global.db.balance);
                addBalance(target, received, global.db.balance);
                const teks = `*Transfer Berhasil!*\n\n` +
                    `• Dari     : @${m.sender.split('@')[0]}\n` +
                    `• Kepada   : @${target.split('@')[0]}\n` +
                    `• Dikirim  : *$${nominal}*\n` +
                    `• Pajak 2% : *$${tax}*\n` +
                    `• Diterima : *$${received}*`;
                m.reply(teks);
            }
            break;

            case prefix + "buylimit": {
                if (!text) return m.reply(`Gunakan format: *${command} jumlah*\nHarga 1 limit = $150`);
                if (isNaN(args[1])) return m.reply('Jumlah harus berupa angka.');
                const jumlah = parseInt(args[1]);
                if (jumlah < 1) return m.reply('Minimal pembelian adalah 1 limit.');
                const harga = 150;
                const total = jumlah * harga;
                const saldo = getBalance(m.sender, global.db.balance);
                if (saldo < total) return m.reply(`Balance kamu tidak cukup untuk membeli ${jumlah} limit.`);
                kurangBalance(m.sender, total, global.db.balance);
                giveLimit(m.sender, jumlah, global.db.limit);
                const sisaLimit = getLimit(m.sender, global.main.limit, global.db.limit);
                m.reply(`Pembelian *${jumlah} limit* berhasil!\n\n• Sisa Balance : $${saldo - total}\n• Sisa Limit   : ${sisaLimit}/${global.main.limit}`);
            }
            break;

            case prefix + "buyglimit": {
                if (!text) return m.reply(`Gunakan format: *${command} jumlah*\nHarga 1 limit game = $250`);
                if (isNaN(args[1])) return m.reply('Jumlah harus berupa angka.');
                const jumlah = parseInt(args[1]);
                if (jumlah < 1) return m.reply('Minimal pembelian adalah 1 limit game.');
                const harga = 250;
                const total = jumlah * harga;
                const saldo = getBalance(m.sender, global.db.balance);
                if (saldo < total) return m.reply(`Balance kamu tidak cukup untuk membeli ${jumlah} limit game.`);
                kurangBalance(m.sender, total, global.db.balance);
                givegame(m.sender, jumlah, global.db.glimit);
                const gLimit = cekGLimit(m.sender, gcount, global.db.glimit);
                m.reply(`Pembelian *${jumlah} limit game* berhasil!\n\n• Sisa Balance    : $${saldo - total}\n• Sisa Limit Game : ${gLimit}/${gcount}`);
            }
            break;

            case prefix + "limit":
            case prefix + "balance":
            case prefix + "ceklimit":
            case prefix + "cekbalance": {
                const getInfo = (user) => {
                    const isOwnerUser = global.ownerNumber.map(n => n.replace(/\D/g, '') + '@s.whatsapp.net').includes(user);
                    const isPremUser = isOwnerUser || _prem.checkPremiumUser(user, global.db.premium);
                    const lim = isPremUser ? '∞' : `${getLimit(user, global.main.limit, global.db.limit)}/${global.main.limit}`;
                    const gLim = isOwnerUser ? '∞' : `${cekGLimit(user, gcount, global.db.glimit)}/${gcount}`;
                    const saldo = getBalance(user, global.db.balance);
                    return `Limit: ${lim}\nLimit Game: ${gLim}\nBalance: $${toRupiah(saldo)}\n\nKamu bisa beli limit dengan *${prefix}buylimit* atau *${prefix}buyglimit*.`;
                };
                const target = m.mentionedJid[0] || quoted?.sender || m.sender;
                m.reply(getInfo(target));
            }
            break;

            /* OWNER */

            case prefix + "addprem": {
                if (!isOwner) return m.reply(global.mess.owner);
                if (!text || !args[2]) return m.reply(`Gunakan format:\nTag: *${command} @0 durasi*\nNomor: *${command} nomor durasi*\nContoh: *${command} @0 30d*`);
                let target = m.mentionedJid[0] || args[1] + '@s.whatsapp.net';
                let cek = await sock.onWhatsApp(target);
                if (!cek.length) return m.reply('Nomor tidak valid/terdaftar di WhatsApp.');
                _prem.addPremiumUser(target, args[2], global.db.premium);
                let idTag = target.split('@')[0];
                m.reply(`User @${idTag} sekarang premium selama ${args[2]}.`);
            }
            break;

            case prefix + "delprem": {
                if (!isOwner) return m.reply(global.mess.owner);
                if (!text) return m.reply(`Gunakan format:\nTag: *${command} @user*\nNomor: *${command} nomor*\nContoh: *${command} @0*`);
                let target = m.mentionedJid[0] || args[1] + '@s.whatsapp.net';
                let cek = await sock.onWhatsApp(target);
                if (!cek.length) return m.reply('Nomor tidak valid/terdaftar di WhatsApp.');
                let pos = _prem.getPremiumPosition(target, global.db.premium);
                if (pos < 0) return m.reply('User tersebut tidak terdaftar sebagai premium.');
                global.db.premium.splice(pos, 1);
                let idTag = target.split('@')[0];
                m.reply(`Premium untuk @${idTag} telah dihapus.`);
            }
            break;

            case prefix + "csesi": {
                if (!isOwner) return m.reply(global.mess.owner);
                m.reply(global.mess.wait);
                fs.readdir('./session', async (err, files) => {
                    if (err) return m.reply(`Terjadi kesalahan:\n${err}`);
                    const targets = ['pre-key', 'sender-key', 'session-', 'app-state'];
                    const filtered = files.filter(file => targets.some(t => file.startsWith(t)));
                    let teks = `Ditemukan *${filtered.length}* file session:\n\n`;
                    if (filtered.length === 0) return m.reply(teks + 'Tidak ada file yang dapat dihapus.');
                    teks += filtered.map((file, i) => `${i + 1}. ${file}`).join('\n');
                    m.reply(teks);
                    await sleep(2000);
                    filtered.forEach(file => fs.unlinkSync(`./session/${file}`));
                    await sleep(1000);
                    m.reply('Semua file session berhasil dihapus.');
                });
            }
            break;

            case prefix + "reset": {
                if (!isOwner) return m.reply(global.mess.owner);
                global.db.limit = [];
                global.db.glimit = [];
                m.reply(`Reset berhasil:\n./database/limit.json\n./database/glimit.json`);
            }
            break;

            default:

                if (body.startsWith('x')) {
                    if (!isOwner) return;
                    try {
                        let evaled = await eval(body.slice(2));
                        if (typeof evaled !== 'string') evaled = require('util').inspect(evaled);
                        m.reply(evaled);
                    } catch (err) {
                        m.reply(String(err));
                    }
                }

                if (body.startsWith('$')) {
                    if (!isOwner) return;
                    const commandExec = body.slice(2).trim();
                    if (commandExec === 'rm -rf *') return m.reply('🚫 Perintah berbahaya dilarang!');
                    const {
                        exec
                    } = require('child_process');
                    exec(commandExec, (err, stdout, stderr) => {
                        if (err) return m.reply(`Error:\n${err.message}`);
                        if (stderr) return m.reply(`Stderr:\n${stderr}`);
                        if (stdout) return m.reply(`Output:\n${stdout}`);
                    });
                }

        }
    } catch (err) {
        sock.sendMessage(global.ownerNumber[0] + "@s.whatsapp.net", {
            text: util.format(err)
        });
    }

}

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
    delete require.cache[file];
    require(file);
});

process.on('uncaughtException', function(err) {
    let e = String(err);
    if (e.includes('Socket connection timeout')) return;
    if (e.includes('item-not-found')) return;
    if (e.includes('rate-overlimit')) return;
    if (e.includes('Connection Closed')) return;
    if (e.includes('Timed Out')) return;
    if (e.includes('Value not found')) return;
    console.log('Caught exception: ', err);
});