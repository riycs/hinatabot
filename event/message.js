import config from "../config.js"
import Func from "../lib/function.js"
import { tiktok } from "../lib/tiktok.js"

import fs from "fs"
import chalk from "chalk"
import axios from "axios"
import path from "path"
import { getBinaryNodeChildren } from "@whiskeysockets/baileys"
import { exec } from "child_process"
import { format } from "util"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const __filename = Func.__filename(import.meta.url)
const require = createRequire(import.meta.url)

export default async function Message(hinata, m, chatUpdate) {
    try {
        if (!m) return
        if (!config.options.public && !m.isOwner) return
        if (m.from && db.groups[m.from]?.mute && !m.isOwner) return
        if (m.isBaileys) return

        (await import("../lib/loadDatabase.js")).default(m)

        const prefix = m.prefix
        const isCmd = m.body.startsWith(prefix)
        const command = isCmd ? m.command.toLowerCase() : ""
        const quoted = m.isQuoted ? m.quoted : m

        if (isCmd && !m.isBaileys) {
            console.log(chalk.black(chalk.bgWhite("- FROM")), chalk.black(chalk.bgGreen(m.pushName)), chalk.black(chalk.yellow(m.sender)) + "\n" + chalk.black(chalk.bgWhite("- IN")), chalk.black(chalk.bgGreen(m.isGroup ? m.metadata.subject : "Private Chat", m.from)) + "\n" + chalk.black(chalk.bgWhite("- MESSAGE")), chalk.black(chalk.bgGreen(m.body || m.type)))
        }

        switch (command) {

            case "menu": case "help": {
                let text = ` Hi @${m.sender.split`@`[0]}👋\n\n`

                Object.entries(config.menu).map(([type, command]) => {
                    text += ` *${type}*\n`
                    text += ` *≻* ${command.map(a => `${prefix + a}`).join("\n *≻* ")}\n\n`
                }).join('\n\n')

                return hinata.sendMessage(m.from, {
                    text, contextInfo: {
                        mentionedJid: hinata.parseMention(text),
                        externalAdReply: {
                            title: "LIST MENU",
                            mediaType: 1,
                            previewType: 0,
                            renderLargerThumbnail: true,
                            thumbnail: fs.readFileSync("./temp/@riiycs.jpg"),
                            sourceUrl: config.Exif.packWebsite
                        }
                    }
                }, { quoted: m })
            }
            break
            case "owner": {
                hinata.sendContact(m.from, config.options.owner, m)
            }
            break
            case "script": case "sc": {
                m.reply("https://github.com/riycs/hinata-bot")
            }
            break
            case "speed": {
                const moment = (await import("moment-timezone")).default
                const calculatePing = function (timestamp, now) {
                    return moment.duration(now - moment(timestamp * 1000)).asSeconds();
                }
                m.reply(`${calculatePing(m.timestamp, Date.now())} seconds`)
            }
            break
            case "runtime": {
                m.reply(Func.runtime(process.uptime()))
            }
            break
    
            // convert/tools
            case "sticker": case "s": case "stiker": {
            	if (!m.isOwner && db.users[m.sender].limit < 1) return m.reply(`Limit kamu sudah habis! akan di reset setiap jam: 12.00 & 00.00`)
            	if (/image|video|webp/i.test(quoted.mime)) {
                    m.reply("wait")
                    hitUser("sticker", db.hitUser)
                    const buffer = await quoted.download()
                    if (quoted?.msg?.seconds > 10) return m.reply(`Durasi video maks 9 detik`)
                    let exif
                    if (m.text) {
                        let [packname, author] = m.text.split("|")
                        exif = { packName: packname ? packname : "", packPublish: author ? author : "" }
                    } else {
                        exif = { ...config.Exif }
                    }
                    m.reply(buffer, { asSticker: true, ...exif })
                    db.users[m.sender].limit -= Number(1)
                } else if (m.mentions[0]) {
                    m.reply("wait")
                    hitUser("sticker", db.hitUser)
                    let url = await hinata.profilePictureUrl(m.mentions[0], "image");
                    m.reply(url, { asSticker: true, ...config.Exif })
                    db.users[m.sender].limit -= Number(1)
                } else if (/(https?:\/\/.*\.(?:png|jpg|jpeg|webp|mov|mp4|webm|gif))/i.test(m.text)) {
                    m.reply("wait")
                    m.reply(Func.isUrl(m.text)[0], { asSticker: true, ...config.Exif })
                    db.users[m.sender].limit -= Number(1)
                } else {
                    m.reply(`Kirim/Reply Media dengan caption: ${prefix + command}`)
                }
            }
            break
            case "toimg": case "toimage": {
            	if (!m.isOwner && db.users[m.sender].limit < 1) return m.reply(`Limit kamu sudah habis! akan di reset setiap jam: 12.00 & 00.00`)
            	let { webp2mp4File } = (await import("../lib/sticker.js"))
                if (!/webp/i.test(quoted.mime)) return m.reply(`Reply Sticker dengan caption: ${prefix + command}`)
                hitUser("toimage", db.hitUser)
                if (quoted.isAnimated) {
                    let media = await webp2mp4File((await quoted.download()))
                    await m.reply(media)
                    db.users[m.sender].limit -= Number(1)
                }
                let media = await quoted.download()
                await m.reply(media, { mimetype: "image/png" })
                db.users[m.sender].limit -= Number(1)
            }
            break
            case "emojimix": { 
            	if (!m.text) return m.reply(`Penggunaan: ${prefix + command} Emoji1+Emoji2\nContoh: ${prefix + command} 😅+😁`)
                let [emoji1, emoji2] = m.text.split("+")
                if (!emoji1) return m.reply(`Format salah!\nContoh: ${prefix + command} 😅+😁`)
                if (!emoji2) return m.reply(`Format salah!\nContoh: ${prefix + command} 😅+😁`)
                m.reply("wait")
                let req
                try {
                    req = await axios.get(`https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`)
                } catch (e) {
                    return m.reply("error")
                }
                for (let i of req.data.results) {
                    await m.reply(i.url, { asSticker: true, ...config.Exif })
                }
            }
            break
            case "quote": case "qc": {
            	if (!m.text) return m.reply(`Penggunaan: ${prefix + command} Text\nContoh: ${prefix + command} Hai`)
                if (m.text.length > 25) return m.reply("Text nya kebanyakan bos!")
                m.reply("wait")
                let name = await hinata.getName(m.sender)
                let profile
                try {
                    profile = await hinata.profilePictureUrl(m.sender, "image")
                } catch (e) {
                    profile = "https://lh3.googleusercontent.com/proxy/esjjzRYoXlhgNYXqU8Gf_3lu6V-eONTnymkLzdwQ6F6z0MWAqIwIpqgq_lk4caRIZF_0Uqb5U8NWNrJcaeTuCjp7xZlpL48JDx-qzAXSTh00AVVqBoT7MJ0259pik9mnQ1LldFLfHZUGDGY=w1200-h630-p-k-no-nu"
                }
		        let obj
		        let json
                try {
                    obj = {
                        "type": "quote",
                        "format": "png",
                        "backgroundColor": "#FFFFFF",
                        "width": 512,
                        "height": 768,
                        "scale": 2,
                        "messages": [{
                            "entities": [],
                            "avatar": true,
                            "from": {
                                "id": 1,
                                "name": name,
                                "photo": {
                                    "url": profile
                                }
                            },
                            "text": m.text,
                            "replyMessage": {}
                        }]
                    }
                    json = await axios.post('https://bot.lyo.su/quote/generate', obj, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
		        } catch (e) {
                    return m.reply("error")
		        }
                const buffer = Buffer.from(json.data.result.image, 'base64')
                m.reply(buffer, { asSticker: true, ...config.Exif })
            }
            break

            // downloader
            case "tiktok": case "tt": {
            	if (!/https?:\/\/(www\.|v(t|m|vt)\.|t\.)?tiktok\.com/i.test(m.text)) return m.reply(`Kirim perintah: ${prefix + command} link`)
                await m.reply("wait")
                let req
                try {
                    req = await tiktok(Func.isUrl(m.text)[0])
                } catch (e) {
                    return m.reply("error")
                }
                m.reply(req.no_watermark, { caption: req.title })
            }
            break

            // group
            case "linkgroup": case "linkgrup": case "linkgc": {
                if (!m.isGroup) return m.reply("group")
                if (!m.isAdmin) return m.reply("admin")
                if (!m.isBotAdmin) return m.reply("botAdmin")
                await m.reply("https://chat.whatsapp.com/" + (await hinata.groupInviteCode(m.from)))
            }
            break
            case "setnamegc": {
                if (!m.isGroup) return m.reply("group")
                if (!m.isAdmin) return m.reply("admin")
                if (!m.isBotAdmin) return m.reply("botAdmin")
                if (!m.text) return m.reply(`Penggunaan: ${prefix + command} Text\nContoh: ${prefix + command} Group`)
				await hinata.groupUpdateSubject(m.from, m.text).then(() => {
				    return m.reply("Sukses")
				}).catch((e) => m.reply("error"))
		    }
		    break
			case "setdesc": {
			    if (!m.isGroup) return m.reply("group")
                if (!m.isAdmin) return m.reply("admin")
                if (!m.isBotAdmin) return m.reply("botAdmin")
				if (!m.text) return m.reply(`Penggunaan: ${prefix + command} Text\nContoh: ${prefix + command} Rules`)
				await hinata.groupUpdateDescription(m.from, m.text).then(() => {
			        return m.reply("Sukses")
		        }).catch((e) => m.reply("error"))
		    }
		    break
		    case "welcome": {
                if (!m.isAdmin) return m.reply("admin")
                let db = global.db.groups[m.from]
                if (m.arg[1] === "off") {
                    db.welcome = false
                    m.reply("Berhasil Menonaktifkan Welcome di Grup Ini")
                } else if (m.arg[1] === "on") {
                    db.welcome = true
                    m.reply("Berhasil Mengaktifkan Welcome di Grup Ini")
                } else {
		            m.reply(`Penggunaan: ${prefix + command} options\n\nOptions:\n1 - *off* (menonaktifkan)\n2 - *on* (mengaktifkan)\n\nContoh: ${prefix + command} on`)
				}
            }
            break
            case "leave": {
                if (!m.isAdmin) return m.reply("admin")
                let db = global.db.groups[m.from]
                if (m.arg[1] === "off") {
                    db.leave = false
                    m.reply("Berhasil Menonaktifkan Welcome di Grup Ini")
                } else if (m.arg[1] === "on") {
                    db.leave = true
                    m.reply("Berhasil Mengaktifkan Welcome di Grup Ini")
                } else {
		            m.reply(`Penggunaan: ${prefix + command} options\n\nOptions:\n1 - *off* (menonaktifkan)\n2 - *on* (mengaktifkan)\n\nContoh: ${prefix + command} on`)
				}
            }
            break
            case "group": case "grup": {
		        if (!m.isGroup) return m.reply("group")
                if (!m.isAdmin) return m.reply("admin")
                if (!m.isBotAdmin) return m.reply("botAdmin")
				if (m.arg[1] == "close") {
				    hinata.groupSettingUpdate(m.from, 'announcement')
				    m.reply("Berhasil mengizinkan hanya admin yang dapat mengirim pesan ke grup ini")
				} else if (m.arg[1] == "open") {
			        hinata.groupSettingUpdate(m.from, 'not_announcement')
				    m.reply("Berhasil mengizinkan semua peserta dapat mengirim pesan ke grup ini")
				} else {
		            m.reply(`Penggunaan: ${prefix + command} options\n\nOptions:\n1 - *close* (menutup group)\n2 - *open* (membuka group)\n\nContoh: ${prefix + command} close`)
				}
			}
	        break
	        case "hidetag": case "ht": {
                if (!m.isGroup) return m.reply("group")
                if (!m.isAdmin) return m.reply("admin")
                let mentions = m.metadata.participants.map(a => a.id)
                let mod = await hinata.cMod(m.from, quoted, /hidetag|tag|ht|h|totag/i.test(quoted.body.toLowerCase()) ? quoted.body.toLowerCase().replace(prefix + command, "") : quoted.body)
                hinata.sendMessage(m.from, { forward: mod, mentions }, { quoted: m })
            }
            break
	        case "add": {
                if (!m.isGroup) return m.reply("group")
                if (!m.isAdmin) return m.reply("admin")
                if (!m.isBotAdmin) return m.reply("botAdmin")
                let users = m.mentions.length !== 0 ? m.mentions.slice(0, 2) : m.isQuoted ? [m.quoted.sender] : m.text.split(",").map(v => v.replace(/[^0-9]/g, '') + "@s.whatsapp.net").slice(0, 2)
                if (users.length == 0) return m.reply('Hm')
                await hinata.groupParticipantsUpdate(m.from, users, "add").then(async (res) => {
                    for (let i of res) {
                        if (i.status == 403) {
                            let node = getBinaryNodeChildren(i.content, "add_request")
                            await m.reply(`Tidak dapat menambahkan @${i.jid.split('@')[0]}, kirim undangan...`)
                            let url = await hinata.profilePictureUrl(m.from, "image").catch(_ => "https://lh3.googleusercontent.com/proxy/esjjzRYoXlhgNYXqU8Gf_3lu6V-eONTnymkLzdwQ6F6z0MWAqIwIpqgq_lk4caRIZF_0Uqb5U8NWNrJcaeTuCjp7xZlpL48JDx-qzAXSTh00AVVqBoT7MJ0259pik9mnQ1LldFLfHZUGDGY=w1200-h630-p-k-no-nu")
                            await hinata.sendGroupV4Invite(i.jid, m.from, node[0]?.attrs?.code || node.attrs.code, node[0]?.attrs?.expiration || node.attrs.expiration, m.metadata.subject, url, "Undangan untuk bergabung dengan Grup WhatsApp saya")
                        }
                        else if (i.status == 409) return m.reply(`@${i.jid?.split('@')[0]} sudah ada di grup ini`)
                        else m.reply(Func.format(i))
                    }
                })
            }
            break

            // owner
            case "mode": {
                if (!m.isOwner) return m.reply("owner")
                if (config.options.public) {
                    config.options.public = false
                    m.reply('Berhasil mengubah Mode Self')
                } else {
                    config.options.public = true
                    m.reply('Berhasil mengubah Mode Public')
                }
            }
            break
            case "mute": {
                if (!m.isOwner) return m.reply("owner")
                let db = global.db.groups[m.from]
                if (m.arg[1] === "off") {
                    db.mute = false
                    m.reply("Berhasil Aktifkan Chat Grup Ini")
                } else if (m.arg[1] === "on") {
                    db.mute = true
                    m.reply("Berhasil Menonaktifkan Chat Grup Ini")
                } else {
		            m.reply(`Penggunaan: ${prefix + command} options\n\nOptions:\n1 - *off* (menonaktifkan)\n2 - *on* (mengaktifkan)\n\nContoh: ${prefix + command} close`)
				}
            }
            break
            case "rvo": {
            	if (!m.isOwner) return m.reply("owner")
                if (!quoted.msg.viewOnce) return m.reply(`Reply ViewOnce dengan caption: ${prefix + command}`)
                quoted.msg.viewOnce = false
                await hinata.sendMessage(m.from, { forward: quoted }, { quoted: m })
            }
            break

            default:
            if (["x"].some(a => m.body?.toLowerCase()?.startsWith(a))) {
                if (!m.isOwner) return
                let evalCmd = ""
                try {
                    evalCmd = /await/i.test(m.text) ? eval("(async() => { " + m.text + " })()") : eval(m.text)
                } catch (e) {
                    evalCmd = e
                }
                new Promise(async (resolve, reject) => {
                    try {
                        resolve(evalCmd);
                    } catch (err) {
                        reject(err)
                    }
                })
                ?.then((res) => m.reply(format(res)))
                ?.catch((err) => m.reply(format(err)))
            }

            if (["$"].some(a => m.body?.toLowerCase()?.startsWith(a))) {
                if (!m.isOwner) return
                try {
                    exec(m.text, async (err, stdout) => {
                        if (err) return m.reply(Func.format(err))
                        if (stdout) return m.reply(Func.format(stdout))
                    })
                } catch (e) {
                    m.reply(Func.format(e))
                }
            }

        }
    } catch (e) {
        m.reply(format(e))
    }
}
