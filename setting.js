const fs = require("fs");

global.options = {
    pairingNumber: "", // Nomor kamu
    session: 'auth_info_baileys',
    public: true
}

global.ownerNumber = [
    "6281xxx", // Nomor kamu
    ""
]

global.sticker = {
	packName: "hinatabot",
	author: "@riiycs"
}

global.main = {
	limit: 25,
	glimit: {
		free: 15,
		premium: 35
	},
	game: {
        waktu: 60
    }
}

global.mess = {
    wait: "Tunggu sebentar ya...",
    owner: "Fitur ini hanya bisa digunakan oleh Owner.",
    premium: "Fitur ini khusus untuk pengguna Premium.",
    limit: "Limit harian kamu sudah habis. Silakan tunggu hingga pukul 00.00 WIB atau upgrade ke Premium.",
    glimit: "Limit game kamu sudah habis. Silakan tunggu hingga pukul 00.00 WIB atau upgrade ke Premium.",
    error: "Terjadi kesalahan pada sistem. Silakan coba lagi nanti."
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(`Update ${__filename}`)
    delete require.cache[file]
    require(file)
})