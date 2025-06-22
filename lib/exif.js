const fs = require('fs')
const { tmpdir } = require('os')
const Crypto = require('crypto')
const ff = require('fluent-ffmpeg')
const webp = require('node-webpmux')
const path = require('path')

/**
 * Generate nama file random di direktori sementara
 * @param {String} ext - Ekstensi file
 * @returns {String} - Path file lengkap
 */
const getRandomFile = (ext) => path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.${ext}`)

/**
 * Konversi gambar (Buffer) menjadi format WebP
 * @param {Buffer} media 
 * @returns {Promise<Buffer>}
 */
const imageToWebp = async (media) => {
    const tmpFileIn = getRandomFile('jpg')
    const tmpFileOut = getRandomFile('webp')
    fs.writeFileSync(tmpFileIn, media)
    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on('error', reject)
            .on('end', () => resolve(true))
            .addOutputOptions([
                '-vcodec', 'libwebp',
                '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
            ])
            .toFormat('webp')
            .save(tmpFileOut)
    })
    const buff = fs.readFileSync(tmpFileOut)
    fs.unlinkSync(tmpFileIn)
    fs.unlinkSync(tmpFileOut)
    return buff
}

/**
 * Konversi video (Buffer) menjadi format WebP
 * @param {Buffer} media 
 * @returns {Promise<Buffer>}
 */
const videoToWebp = async (media) => {
    const tmpFileIn = getRandomFile('mp4')
    const tmpFileOut = getRandomFile('webp')
    fs.writeFileSync(tmpFileIn, media)
    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on('error', reject)
            .on('end', () => resolve(true))
            .addOutputOptions([
                '-vcodec', 'libwebp',
                '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
                '-loop', '0',
                '-ss', '00:00:00',
                '-t', '00:00:05',
                '-preset', 'default',
                '-an',
                '-vsync', '0'
            ])
            .toFormat('webp')
            .save(tmpFileOut)
    })
    const buff = fs.readFileSync(tmpFileOut)
    fs.unlinkSync(tmpFileIn)
    fs.unlinkSync(tmpFileOut)
    return buff
}

/**
 * Menulis EXIF ke sticker gambar
 * @param {Buffer} media 
 * @param {Object} metadata 
 * @returns {Promise<String>} - Path file WebP dengan EXIF
 */
const writeExifImg = async (media, metadata) => {
    const wMedia = await imageToWebp(media)
    return await writeExifData(wMedia, metadata)
}

/**
 * Menulis EXIF ke sticker video
 * @param {Buffer} media 
 * @param {Object} metadata 
 * @returns {Promise<String>} - Path file WebP dengan EXIF
 */
const writeExifVid = async (media, metadata) => {
    const wMedia = await videoToWebp(media)
    return await writeExifData(wMedia, metadata)
}

/**
 * Menulis EXIF ke sticker, bisa untuk gambar/video/webp langsung
 * @param {Object} media - { mimetype, data }
 * @param {Object} metadata 
 * @returns {Promise<String>} - Path file WebP dengan EXIF
 */
const writeExif = async (media, metadata) => {
    let wMedia
    if (/webp/.test(media.mimetype)) wMedia = media.data
    else if (/image/.test(media.mimetype)) wMedia = await imageToWebp(media.data)
    else if (/video/.test(media.mimetype)) wMedia = await videoToWebp(media.data)
    else throw new Error('Media tidak dikenali')
    return await writeExifData(wMedia, metadata)
}

/**
 * Fungsi utama penulis EXIF ke WebP
 * @param {Buffer} mediaBuffer 
 * @param {Object} metadata 
 * @returns {Promise<String>} - Path file WebP baru
 */
const writeExifData = async (mediaBuffer, metadata) => {
    const tmpFileIn = getRandomFile('webp')
    const tmpFileOut = getRandomFile('webp')
    fs.writeFileSync(tmpFileIn, mediaBuffer)
    if (metadata.packname || metadata.author) {
        const img = new webp.Image()
        const json = {
            "sticker-pack-id": "https://github.com/DikaArdnt/Hisoka-Morou",
            "sticker-pack-name": metadata.packname,
            "sticker-pack-publisher": metadata.author,
            "emojis": metadata.categories ? metadata.categories : [""]
        }
        const exifAttr = Buffer.from([
            0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x16, 0x00, 0x00, 0x00
        ])
        const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8')
        const exif = Buffer.concat([exifAttr, jsonBuff])
        exif.writeUIntLE(jsonBuff.length, 14, 4)
        await img.load(tmpFileIn)
        fs.unlinkSync(tmpFileIn)
        img.exif = exif
        await img.save(tmpFileOut)
        return tmpFileOut
    } else {
        fs.unlinkSync(tmpFileIn)
        throw new Error('Metadata packname/author tidak ditemukan')
    }
}

module.exports = { imageToWebp, videoToWebp, writeExifImg, writeExifVid, writeExif }