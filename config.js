// menu
const menu = {
   MAIN: ["help", "script", "speed", "runtime"],
   CONVERT: ["sticker", "toimg", "emojimix", "qc"],
   DOWNLOADER: ["tiktok"],
   GROUP: ["linkgroup", "setnamegc", "setdesc", "welcome", "leave", "group", "hidetag", "add"],
   OWNER: ["mode", "mute", "rvo"]
}

// limit
const limit = {
   free: 25,
   premium: 150,
   VIP: "Unlimited"
}

export default {
   menu,

   // setting
   options: {
      public: true,
      antiCall: true,
      database: "database.json", // akhiri .json saat menggunakan database json atau menggunakan mongo uri
      owner: [""], // contoh: 62xxx
      sessionName: "session",
      prefix: /^[°•π÷×¶∆£¢€¥®™+✓_=|/~!?@#%^&.©^]/i,
      pairingNumber: "" // contoh: 62xxx
   },

   // pack sticker
   Exif: {
  	packId: "https://hibot.riycs.my.id",
      packName: `hinatabot`,
      packPublish: "@riiycs",
      packEmail: "hinatabot@riycs.my.id",
      packWebsite: "https://hibot.riycs.my.id",
   },

   // tanggapan pesan
   msg: {
        owner: "Fitur hanya dapat diakses oleh Owner!",
        group: "Fitur hanya dapat diakses dalam Grup!",
        private: "Fitur hanya dapat diakses melalui Obrolan Pribadi!",
        admin: "Fitur hanya dapat diakses oleh Admin Grup!",
        botAdmin: "Bot bukan Admin, tidak dapat menggunakan Fiturnya!",
        error: "Tampaknya mengalami kesalahan yang tidak terduga, mohon ulangi perintah Anda beberapa saat lagi",
        wait: "Tunggu sebentar..."
    }
}