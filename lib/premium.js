const fs = require('fs');
const toMs = require('ms');

/**
 * Tambah user ke daftar premium.
 * @param {string} userId - ID pengguna.
 * @param {string} expired - Waktu kadaluarsa (ms string) atau 'PERMANENT'.
 * @param {Array} _dir - Database premium.
 */
const addPremiumUser = (userId, expired, _dir) => {
    const expired_at = (expired === undefined || expired === 'PERMANENT') 
        ? 'PERMANENT' 
        : Date.now() + toMs(expired);
    const obj = { id: userId, expired: expired_at };
    _dir.push(obj);
};

/**
 * Ambil posisi user premium di database.
 * @param {string} userId
 * @param {Array} _dir
 * @returns {number|null}
 */
const getPremiumPosition = (userId, _dir) => {
    return _dir.findIndex(user => user.id === userId);
};

/**
 * Ambil tanggal expired premium user.
 * @param {string} userId
 * @param {Array} _dir
 * @returns {string|number|null}
 */
const getPremiumExpired = (userId, _dir) => {
    const user = _dir.find(u => u.id === userId);
    return user ? user.expired : null;
};

/**
 * Cek apakah user adalah premium.
 * @param {string} userId
 * @param {Array} _dir
 * @returns {boolean}
 */
const checkPremiumUser = (userId, _dir) => {
    return _dir.some(user => user.id === userId);
};

/**
 * Cek & hapus user premium yang kadaluarsa secara berkala.
 * @param {Object} conn - Koneksi bot.
 * @param {Array} _dir
 */
const expiredCheck = (conn, _dir) => {
    setInterval(() => {
        const now = Date.now();
        _dir.forEach((user, index) => {
            if (user.expired !== 'PERMANENT' && now >= user.expired) {
                console.log(`Premium expired: ${user.id}`);
                const teks = 'Premium Expired, Terimakasih Sudah Berlangganan Di Hinata Bot';
                conn.sendMessage(user.id, { text: teks });
                _dir.splice(index, 1);
            }
        });
    }, 1000);
};

/**
 * Ambil semua ID user premium.
 * @param {Array} _dir
 * @returns {Array}
 */
const getAllPremiumUser = (_dir) => {
    return _dir.map(user => user.id);
};

module.exports = {
    addPremiumUser,
    getPremiumExpired,
    getPremiumPosition,
    expiredCheck,
    checkPremiumUser,
    getAllPremiumUser
};