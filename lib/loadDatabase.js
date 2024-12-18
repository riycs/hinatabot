import config from "../config.js"


export default function loadDatabase(m) {
    const isNumber = x => typeof x === "number" && !isNaN(x)
    const isBoolean = x => typeof x === "boolean" && Boolean(x)
    let user = global.db.users[m.sender]
    if (typeof user !== "object") global.db.users[m.sender] = {}
    if (user) {
    	if (!("name" in user)) user.name = m.pushName
    	if (!("lastChat" in user)) user.lastChat = new Date * 1
        if (!isNumber(user.limit)) user.limit = m.isOwner ? config.limit.VIP : config.limit.free
        if (!isBoolean(user.premium)) user.premium = m.isOwner ? true : false
        if (!isBoolean(user.VIP)) user.VIP = m.isOwner ? true : false
        if (!isBoolean(user.banned)) user.banned = false
    } else {
        global.db.users[m.sender] = {
        	name: m.pushName,
            lastChat: new Date * 1,
            limit: m.isOwner ? config.limit.VIP : config.limit.free,
            premium: m.isOwner ? true : false,
            VIP: m.isOwner ? true : false,
            banned: false,
        }
    }

    if (m.isGroup) {
        let group = global.db.groups[m.from]
        if (typeof group !== "object") global.db.groups[m.from] = {}
        if (group) {
            if (!isBoolean(group.mute)) group.mute = false
            if (!isNumber(group.lastChat)) group.lastChat = new Date * 1
            if (!isBoolean(group.welcome)) group.welcome = true
            if (!isBoolean(group.leave)) group.leave = true
        } else {
            global.db.groups[m.from] = {
                lastChat: new Date * 1,
                mute: false,
                welcome: true,
                leave: true
            }
        }
    }
}