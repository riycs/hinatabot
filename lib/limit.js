const fs = require('fs');

/**
 * Cek apakah user sudah mencapai batas limit harian.
 * @param {string} sender - ID pengguna.
 * @param {boolean} isPremium - Status premium pengguna.
 * @param {boolean} isOwner - Status owner bot.
 * @param {number} limitCount - Batas limit harian.
 * @param {Array} _db - Database limit.
 * @returns {boolean} True jika limit habis.
 */
exports.isLimit = (sender, isPremium, isOwner, limitCount, _db) => {
    if (isOwner || isPremium) return false;
    let user = _db.find(u => u.id === sender);
    if (!user) {
        _db.push({ id: sender, limit: 0 });
        return false;
    }
    return user.limit >= limitCount;
};

/**
 * Tambah limit harian user +1.
 * @param {string} sender
 * @param {Array} _db
 */
exports.limitAdd = (sender, _db) => {
    let user = _db.find(u => u.id === sender);
    if (user) {
        user.limit += 1;
    }
};

/**
 * Ambil sisa limit harian user.
 * @param {string} sender
 * @param {number} limitCount
 * @param {Array} _db
 * @returns {number}
 */
exports.getLimit = (sender, limitCount, _db) => {
    let user = _db.find(u => u.id === sender);
    return user ? limitCount - user.limit : limitCount;
};

/**
 * Kurangi limit user sejumlah tertentu.
 * @param {string} sender
 * @param {number} amount
 * @param {Array} _db
 */
exports.giveLimit = (sender, amount, _db) => {
    let user = _db.find(u => u.id === sender);
    if (user) {
        user.limit -= amount;
    } else {
        _db.push({ id: sender, limit: 0 });
    }
};

/**
 * Tambahkan saldo pengguna.
 * @param {string} sender
 * @param {number} amount
 * @param {Array} _db
 */
exports.addBalance = (sender, amount, _db) => {
    let user = _db.find(u => u.id === sender);
    if (user) {
        user.balance += amount;
    } else {
        _db.push({ id: sender, balance: amount });
    }
};

/**
 * Kurangi saldo pengguna.
 * @param {string} sender
 * @param {number} amount
 * @param {Array} _db
 */
exports.kurangBalance = (sender, amount, _db) => {
    let user = _db.find(u => u.id === sender);
    if (user) {
        user.balance -= amount;
    }
};

/**
 * Ambil saldo pengguna.
 * @param {string} sender
 * @param {Array} _db
 * @returns {number}
 */
exports.getBalance = (sender, _db) => {
    let user = _db.find(u => u.id === sender);
    return user ? user.balance : 0;
};

/**
 * Cek apakah user melebihi batas limit game harian.
 * @param {string} sender
 * @param {boolean} isOwner
 * @param {number} gcount
 * @param {Array} _db
 * @returns {boolean}
 */
exports.isGame = (sender, isOwner, gcount, _db) => {
    if (isOwner) return false;
    let user = _db.find(u => u.id === sender);
    if (!user) {
        _db.push({ id: sender, glimit: 0 });
        return false;
    }
    return user.glimit >= gcount;
};

/**
 * Tambah limit game harian user +1.
 * @param {string} sender
 * @param {Array} _db
 */
exports.gameAdd = (sender, _db) => {
    let user = _db.find(u => u.id === sender);
    if (user) {
        user.glimit += 1;
    }
};

/**
 * Kurangi limit game user sejumlah tertentu.
 * @param {string} sender
 * @param {number} amount
 * @param {Array} _db
 */
exports.givegame = (sender, amount, _db) => {
    let user = _db.find(u => u.id === sender);
    if (user) {
        user.glimit -= amount;
    } else {
        _db.push({ id: sender, glimit: 0 });
    }
};

/**
 * Ambil sisa limit game harian user.
 * @param {string} sender
 * @param {number} gcount
 * @param {Array} _db
 * @returns {number}
 */
exports.cekGLimit = (sender, gcount, _db) => {
    let user = _db.find(u => u.id === sender);
    return user ? gcount - user.glimit : gcount;
};