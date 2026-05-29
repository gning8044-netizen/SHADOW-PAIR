
const fs = require('fs');

const config = {
  // ========== BOT IDENTITY ==========
  name: 'DEV SHADOW-BOT',
  version: '1.0.0',
  

  telegram: {
    token: '8897352527:AAFsL8WIQ0yfYvf-kZ7HG-TrSYSdlk3xdBw',
    ownerId: 7537529476,
  },
  
  // ========== WHATSAPP (PAIRING VIA COMMAND /pairing) ==========
  whatsapp: {
    ready: false,
  },
  
  // ========== PATHS ==========
  paths: {
    sessions: './sessions',
    database: './database'
  }
};

['./sessions', './database'].forEach(f => {
  if (!fs.existsSync(f)) fs.mkdirSync(f, { recursive: true });
});

module.exports = config;