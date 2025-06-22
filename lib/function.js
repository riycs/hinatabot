const { extractMessageContent, jidNormalizedUser, proto, getContentType, areJidsSameUser } = require("baileys")
const axios = require('axios')
const moment = require('moment-timezone')
const { sizeFormatter } = require('human-readable')
const util = require('util')

const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000)
exports.unixTimestampSeconds = unixTimestampSeconds

exports.generateMessageTag = (epoch) => {
    let tag = unixTimestampSeconds().toString();
    if (epoch) tag += '.--' + epoch;
    return tag;
}

exports.processTime = (timestamp, now) => moment.duration(now - moment(timestamp * 1000)).asSeconds()

exports.randomNomor = (min, max = null) => {
    if (max !== null) {
        return Math.floor(Math.random() * (max - min + 1)) + Math.ceil(min);
    } else {
        return Math.floor(Math.random() * min) + 1;
    }
}

exports.toRupiah = (x) => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

exports.pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

exports.getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`

exports.getBuffer = async (url, options = {}) => {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', ...options })
        return res.data
    } catch (err) {
        return err
    }
}

exports.formatSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i]
}

exports.fetchJson = async (url, options = {}) => {
    try {
        const res = await axios.get(url, options)
        return res.data
    } catch (err) {
        return err
    }
}

exports.runtime = function(seconds) {
    seconds = Number(seconds)
    const d = Math.floor(seconds / (3600 * 24))
    const h = Math.floor(seconds % (3600 * 24) / 3600)
    const m = Math.floor(seconds % 3600 / 60)
    const s = Math.floor(seconds % 60)
    return `${d > 0 ? `${d} day, ` : ''}${h > 0 ? `${h} hour, ` : ''}${m > 0 ? `${m} minute, ` : ''}${s > 0 ? `${s} second` : ''}`
}

exports.clockString = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor(ms / 60000) % 60
    const s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}

exports.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

exports.isUrl = (url) => /https?:\/\/[^\s]+/.test(url)

exports.getTime = (format, date) => date ? moment(date).locale('id').format(format) : moment.tz('Asia/Jakarta').locale('id').format(format)

exports.formatDate = (n, locale = 'id') => new Date(n).toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric'
})

exports.tanggal = (numer) => {
    const myMonths = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const myDays = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const tgl = new Date(numer);
    const day = tgl.getDate(), bulan = tgl.getMonth();
    const thisDay = myDays[tgl.getDay()], year = tgl.getFullYear();
    return `${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`
}

exports.formatp = sizeFormatter({
    std: 'JEDEC', decimalPlaces: 2, keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
})

exports.jsonformat = (string) => JSON.stringify(string, null, 2)

exports.format = (...args) => util.format(...args)

exports.bytesToSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

exports.getSizeMedia = (path) => new Promise((resolve, reject) => {
    if (/http/.test(path)) {
        axios.get(path).then(res => {
            const length = parseInt(res.headers['content-length'])
            resolve(!isNaN(length) ? exports.bytesToSize(length, 3) : 'error')
        })
    } else if (Buffer.isBuffer(path)) {
        const length = Buffer.byteLength(path)
        resolve(exports.bytesToSize(length, 3))
    } else reject('Invalid path')
})

exports.parseMention = (text = '') => [...text.matchAll(/@(\d{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')

exports.getGroupAdmins = (participants) => participants.filter(p => p.admin).map(p => p.id)

exports.smsg = (sock, m, store) => {
    if (!m) return m;
    const M = proto.WebMessageInfo;
    if (m.key) {
        m.id = m.key.id;
        m.chat = m.key.remoteJid;
        m.from = m.key.remoteJid?.startsWith('status')
            ? jidNormalizedUser(m.key.participant || m.participant)
            : jidNormalizedUser(m.key.remoteJid);
        m.isBaileys = m.id?.startsWith('BAE5') && m.id.length === 16;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat?.endsWith('@g.us');
        m.sender = sock.decodeJid((m.fromMe && sock.user.id) || m.participant || m.key.participant || m.chat || '');
        if (m.isGroup) m.participant = sock.decodeJid(m.key.participant || '');
    }
    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = (m.mtype === 'viewOnceMessage')
            ? m.message[m.mtype]?.message?.[getContentType(m.message[m.mtype].message)]
            : m.message[m.mtype];
        m.body = m.message?.conversation
            || m.msg?.caption
            || m.msg?.text
            || m.msg?.contentText
            || m.msg?.selectedDisplayText
            || m.msg?.title
            || (m.mtype === 'listResponseMessage' && m.msg?.singleSelectReply?.selectedRowId)
            || (m.mtype === 'buttonsResponseMessage' && m.msg?.selectedButtonId)
            || (m.mtype === 'reactionMessage' && `@${m.msg?.key?.participant?.split('@')[0]} mereaksi: ${m.msg?.text}`)
            || (m.mtype === 'pollCreationMessage' && `📊 Poll: ${m.msg?.name}`)
            || '';
        m.mentionedJid = m.msg?.contextInfo?.mentionedJid || [];
        const quoted = m.msg?.contextInfo?.quotedMessage || null;
        if (quoted) {
            let type = getContentType(quoted);
            m.quoted = quoted[type];
            if (type === 'productMessage') {
                type = getContentType(m.quoted);
                m.quoted = m.quoted[type];
            }
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted };
            m.quoted.key = {
                remoteJid: m.msg.contextInfo?.remoteJid || m.chat,
                participant: jidNormalizedUser(m.msg.contextInfo?.participant || ''),
                fromMe: areJidsSameUser(
                    jidNormalizedUser(m.msg.contextInfo?.participant || ''),
                    jidNormalizedUser(sock.user?.id || '')
                ),
                id: m.msg.contextInfo?.stanzaId,
            };
            m.quoted.mtype = type;
            m.quoted.id = m.msg.contextInfo?.stanzaId;
            m.quoted.chat = m.msg.contextInfo?.remoteJid || m.chat;
            m.quoted.isBaileys = m.quoted.id?.startsWith('BAE5') && m.quoted.id.length === 16;
            m.quoted.sender = sock.decodeJid(m.msg.contextInfo?.participant || '');
            m.quoted.fromMe = m.quoted.sender === (sock.user && sock.user.id);
            m.quoted.text = m.quoted.text
                || m.quoted.caption
                || m.quoted.contentText
                || m.quoted.conversation
                || m.quoted.selectedDisplayText
                || m.quoted.title
                || '';
            m.quoted.mentionedJid = m.msg.contextInfo?.mentionedJid || [];
            m.quoted.download = () => sock.downloadMediaMessage(m.quoted);
            m.getQuotedMessage = m.getQuotedObj = async () => {
                if (!m.quoted.id) return null;
                const q = await store.loadMessage(m.chat, m.quoted.id, sock);
                return exports.smsg(sock, q, store);
            };
            const vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            });
            m.quoted.delete = () => sock.sendMessage(m.quoted.chat, { delete: vM.key });
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) =>
                sock.copyNForward(jid, vM, forceForward, options);
        }
    }
    if (m.msg?.url) m.download = () => sock.downloadMediaMessage(m.msg);
    m.text = m.body;
    m.reply = (text, options = {}) => sock.sendMessage(m.chat, {
        text,
        mentions: [...text.matchAll(/@(\d{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net'),
        ...options
    }, { quoted: m });
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) =>
        sock.copyNForward(jid, m, forceForward, options);
    return m;
};