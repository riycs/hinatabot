import config from "./config.js"
import { Client, Serialize } from "./lib/serialize.js"

import baileys from "@whiskeysockets/baileys"
const { useMultiFileAuthState, DisconnectReason, makeInMemoryStore, jidNormalizedUser, makeCacheableSignalKeyStore, PHONENUMBER_MCC } = baileys
import { Boom } from "@hapi/boom"
import Pino from "pino"
import NodeCache from "node-cache"
import chalk from "chalk"
import readline from "readline"
import { parsePhoneNumber } from "libphonenumber-js"
import open from "open"
import path from "path"

const database = (new (await import("./lib/database.js")).default())
const store = makeInMemoryStore({ logger: Pino({ level: "fatal" }).child({ level: "fatal" }) })

const pairingCode = !!config.options.pairingNumber || process.argv.includes("--pairing-code")

async function start() {
   process.on("unhandledRejection", (err) => console.error(err))

   const content = await database.read()
   if (content && Object.keys(content).length === 0) {
      global.db = {
         groups: {},
         users: {},
         ...(content || {}),
      }
      await database.write(global.db)
   } else {
      global.db = content
   }

   const { state, saveCreds } = await useMultiFileAuthState(`./${config.options.sessionName}`)
   const msgRetryCounterCache = new NodeCache()

   const hinata = baileys.default({
      logger: Pino({ level: "fatal" }).child({ level: "fatal" }),
      printQRInTerminal: !pairingCode,
      auth: {
         creds: state.creds,
         keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" }).child({ level: "fatal" })),
      },
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
         let jid = jidNormalizedUser(key.remoteJid)
         let msg = await store.loadMessage(jid, key.id)

         return msg?.message || ""
      },
      msgRetryCounterCache,
      defaultQueryTimeoutMs: undefined,
   })

   store.bind(hinata.ev)

   hinata.ev.on("contacts.update", (update) => {
      for (let contact of update) {
         let id = jidNormalizedUser(contact.id)
         if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
      }
   })

   await Client({ hinata, store })

   if (pairingCode && !hinata.authState.creds.registered) {
   	 let nomor = config.options.pairingNumber.replace(/[^0-9]/gi, '')
		setTimeout(async () => {
			let code = await hinata.requestPairingCode(nomor)
			code = code?.match(/.{1,4}/g)?.join("-") || code
			console.log(chalk.black(chalk.bgGreen("Code:")), chalk.black(chalk.white(code)))
		}, 3000)
	}

   hinata.ev.on("connection.update", async (update) => {
      const { lastDisconnect, connection, qr } = update
      if (connection) {
         console.info(`Connection Status : ${connection}`)
      }

      if (connection === "close") {
         let reason = new Boom(lastDisconnect?.error)?.output.statusCode
         if (reason === DisconnectReason.badSession) {
            console.log(`Bad Session File, Please Delete Session and Scan Again`)
            process.send('reset')
         } else if (reason === DisconnectReason.connectionClosed) {
            console.log("Connection closed, reconnecting....")
            await start()
         } else if (reason === DisconnectReason.connectionLost) {
            console.log("Connection Lost from Server, reconnecting...")
            await start()
         } else if (reason === DisconnectReason.connectionReplaced) {
            console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First")
            process.exit(1)
         } else if (reason === DisconnectReason.loggedOut) {
            console.log(`Device Logged Out, Please Scan Again And Run.`)
            process.exit(1)
         } else if (reason === DisconnectReason.restartRequired) {
            console.log("Restart Required, Restarting...")
            await start()
         } else if (reason === DisconnectReason.timedOut) {
            console.log("Connection TimedOut, Reconnecting...")
            process.send('reset')
         } else if (reason === DisconnectReason.multideviceMismatch) {
            console.log("Multi device mismatch, please scan again")
            process.exit(0)
         } else {
            console.log(reason)
            process.send('reset')
         }
      }

      if (connection === "open") {
         hinata.sendMessage(config.options.owner[0] + "@s.whatsapp.net", {
            text: `${hinata?.user?.name || "Hinata"} telah terhubung...`,
         })
      }
   })

   hinata.ev.on("creds.update", saveCreds)

   hinata.ev.on("messages.upsert", async (message) => {
      if (!message.messages) return
      const m = await Serialize(hinata, message.messages[0])
      await (await import(`./event/message.js?v=${Date.now()}`)).default(hinata, m, message)
   })

   hinata.ev.on("group-participants.update", async (message) => {
      await (await import(`./event/group-participants.js?v=${Date.now()}`)).default(hinata, message)
   })

   hinata.ev.on("groups.update", async (update) => {
      await (await import(`./event/group-update.js?v=${Date.now()}`)).default(hinata, update)
   })

   hinata.ev.on("call", async (json) => {
      if (config.options.antiCall) {
         for (const id of json) {
            if (id.status === "offer") {
               let msg = await hinata.sendMessage(id.from, {
                  text: `Maaf untuk saat ini, Kami tidak dapat menerima panggilan, entah dalam group atau pribadi\n\nJika Membutuhkan bantuan ataupun request fitur silahkan chat owner🤗`,
                  mentions: [id.from],
               })
               // hinata.sendContact(id.from, config.options.owner, msg)
               await hinata.rejectCall(id.id, id.from)
            }
         }
      }
   })

   setInterval(async () => {
      if (global.db) await database.write(global.db)
   }, 30000)

   return hinata
}

start()
