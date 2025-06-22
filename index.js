process.on('unhandledRejection', (reason, p) => {
    console.error('UNHANDLED PROMISE REJECTION');
    console.error(reason);
});

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION');
    console.error(err);
});

require("./setting");
require("./lib/database");

const fs = require("fs");
const {
    join
} = require("path");

const chalk = require("chalk");
const axios = require("axios");
const Pino = require("pino");
const FileType = require("file-type");
const PhoneNumber = require("awesome-phonenumber");
const {
    Boom
} = require("@hapi/boom");

const {
    default: makeWASocket,
    DisconnectReason,
    downloadContentFromMessage,
    generateWAMessageFromContent,
    jidDecode,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require("baileys");

const {
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid
} = require("./lib/exif");
const {
    getBuffer,
    smsg
} = require("./lib/function");

const pairingCode = !!global.options.pairingNumber || process.argv.includes('--pairing-code');

const store = {
    contacts: {}
};

async function startRiy() {
    const sessionDir = join(process.cwd(), global.options.session);
    const {
        state,
        saveCreds
    } = await useMultiFileAuthState(sessionDir);
    const {
        version
    } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: Pino({
            level: "silent"
        }),
        printQRInTerminal: !pairingCode,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false,
        markOnlineOnConnect: false
    });

    if (pairingCode && !sock.authState.creds.registered) {
        let nomor = global.options.pairingNumber.replace(/[^0-9]/gi, '');
        setTimeout(async () => {
            let code = await sock.requestPairingCode(nomor);
            code = code?.match(/.{1,4}/g)?.join('-') || code;
            console.log(chalk.black(chalk.bgGreen('Code:')), chalk.black(chalk.white(code)));
        }, 3000);
    }

    sock.ev.on("creds.update", saveCreds);

    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, {
        recursive: true
    });
    fs.chmodSync(sessionDir, 0o755);
    fs.readdir(sessionDir, (err, files) => {
        if (!err) files.forEach(file => fs.chmod(join(sessionDir, file), 0o644, () => {}));
    });

    sock.ev.on("connection.update", async (update) => {
        const {
            connection,
            lastDisconnect
        } = update;
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (connection === 'open') {
            await sock.sendMessage(global.ownerNumber[0] + '@s.whatsapp.net', {
                text: "Bot connected"
            });
            console.log(chalk.greenBright(`Koneksi terhubung`));
        }
        if (connection === 'close') {
            switch (reason) {
                case DisconnectReason.badSession:
                    console.log(chalk.redBright(`Bad session, restart...`));
                    return startRiy();
                case DisconnectReason.connectionClosed:
                case DisconnectReason.connectionLost:
                    console.log(chalk.redBright(`Koneksi terputus, reconnect...`));
                    return startRiy();
                case DisconnectReason.connectionReplaced:
                    console.log(chalk.redBright(`Session digantikan. Restart bot.`));
                    break;
                case DisconnectReason.loggedOut:
                    console.log(chalk.redBright(`Perangkat logout. Scan ulang.`));
                    break;
                case DisconnectReason.restartRequired:
                    console.log(chalk.redBright(`Restart diperlukan. Restart...`));
                    return startRiy();
                case DisconnectReason.timedOut:
                    console.log(chalk.redBright(`Timeout. Reconnect...`));
                    return startRiy();
                default:
                    console.log(chalk.redBright(`Disconnect tidak diketahui: ${reason}`));
                    return startRiy();
            }
        }
    });

    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages?.[0];
            if (!mek?.message) return;
            const type = Object.keys(mek.message)[0];
            if (type === "ephemeralMessage") return;
            if (mek.key.remoteJid === "status@broadcast") return;
            const m = smsg(sock, mek, store);
            if (m.isBaileys) return;
            if (!m.key.fromMe) {
                await sock.readMessages([m.key]);
            }
            require("./message/msg")(sock, m, chatUpdate, mek, store);
        } catch (err) {
            console.error("Error in messages.upsert:", err);
        }
    });

    sock.ev.on('contacts.update', update => {
        update.forEach(contact => {
            try {
                const id = sock.decodeJid(contact.id);
                if (!id) return;
                store.contacts[id] = {
                    id,
                    name: contact.notify || contact.vname || contact.name || 'Unknown'
                };
            } catch (e) {
                console.error('Error updating contact:', e);
            }
        });
    });

    sock.ev.on('group-participants.update', async (anu) => {
        console.log(anu);
    });

    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        const isResourceJid = /:\d+@/i.test(jid);
        if (isResourceJid) {
            const decoded = jidDecode(jid) || {};
            if (decoded.user && decoded.server) {
                return `${decoded.user}@${decoded.server}`;
            }
        }
        return jid;
    };

    sock.getName = (jid, withoutContact = false) => {
        const id = sock.decodeJid(jid);
        const v = store.contacts[id] || {};
        return (
            (withoutContact ? '' : v.name) ||
            v.subject ||
            v.verifiedName ||
            PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international') // fallback: nomor WA
        );
    };

    sock.sendMessageFromContent = async (jid, msg, opt = {}) => {
        let prepare = await generateWAMessageFromContent(jid, msg, {
            contextInfo: {},
            ...opt
        });
        sock.relayMessage(jid, prepare.message, {
            messageId: prepare.key.id
        });
        return prepare;
    };

    sock.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        return buffer;
    };

    sock.sendBuffer = async (m, type, url, caption = '', filename = null) => {
        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            let buffer = Buffer.from(res.data);
            const mimetype = type === 'video' ? 'video/mp4' :
                type === 'audio' ? 'audio/mpeg' :
                'image/jpeg';
            const message = {
                [type]: buffer,
                mimetype,
                ...(filename && {
                    fileName: filename
                }),
                ...(type === 'audio' && {
                    ptt: false
                }),
                ...(type !== 'audio' && caption ? {
                    caption
                } : {})
            };
            await sock.sendMessage(m.chat, message, {
                quoted: m
            });
            buffer = null;
        } catch (err) {
            console.error(`Gagal kirim ${type}:`, err.message || err);
            m.reply(global.mess.error || 'Gagal mengirim media.');
        }
    };

    sock.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path :
            /^data:.?\/.?;base64,/i.test(path) ? Buffer.from(path.split(',')[1], 'base64') :
            /^https?:\/\//.test(path) ? await getBuffer(path) :
            fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer = (options && (options.packname || options.author)) ? await writeExifImg(buff, options) : await imageToWebp(buff);
        await sock.sendMessage(jid, {
            sticker: {
                url: buffer
            },
            ...options
        }, {
            quoted
        });
        return buffer;
    };

    sock.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifVid(buff, options);
        } else {
            buffer = await videoToWebp(buff);
        }
        await sock.sendMessage(jid, {
            sticker: {
                url: buffer
            },
            ...options
        }, {
            quoted
        });
        return buffer;
    };
}

startRiy();