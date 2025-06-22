const fs = require('fs')

global.db = {
  balance: JSON.parse(fs.readFileSync('./database/balance.json')),
  premium: JSON.parse(fs.readFileSync('./database/premium.json')),
  limit: JSON.parse(fs.readFileSync('./database/limit.json')),
  glimit: JSON.parse(fs.readFileSync('./database/glimit.json')),
  pendaftar: JSON.parse(fs.readFileSync('./database/user.json')),
};

// Auto save
setInterval(() => {
  fs.writeFileSync('./database/balance.json', JSON.stringify(global.db.balance, null, 2));
  fs.writeFileSync('./database/premium.json', JSON.stringify(global.db.premium, null, 2));
  fs.writeFileSync('./database/limit.json', JSON.stringify(global.db.limit, null, 2));
  fs.writeFileSync('./database/glimit.json', JSON.stringify(global.db.glimit, null, 2));
  fs.writeFileSync('./database/user.json', JSON.stringify(global.db.pendaftar, null, 2));
}, 30000);