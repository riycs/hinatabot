const toMs = require('ms')

exports.addPlayGame = (chatId, game, jawaban, expiredSeconds, msg, db) => {
    const newGame = {
        id: chatId,
        game,
        jawaban,
        expired: Date.now() + toMs(`${expiredSeconds}s`),
        msg
    }
    db.push(newGame)
}

exports.getJawabanGame = (chatId, db) => {
    const game = db.find(item => item.id === chatId)
    return game ? game.jawaban : undefined
}

exports.isPlayGame = (chatId, db) => db.some(item => item.id === chatId)

exports.cekWaktuGame = (conn, db) => {
    setInterval(() => {
        for (let i = 0; i < db.length; i++) {
            if (Date.now() >= db[i].expired) {
                const expiredGame = db[i]
                conn.sendMessage(expiredGame.id, {
                    text: `*--「 ${expiredGame.game} 」--*\n\n*Waktu Habis*\n*Jawaban :* ${expiredGame.jawaban}`
                }, { quoted: expiredGame.msg })
                db.splice(i, 1)
                i--
            }
        }
    }, 1000)
}

exports.getGamePosi = (chatId, db) => db.findIndex(item => item.id === chatId)