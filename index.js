// index.js - Tele-WA Bridge Bot
const TelegramBot = require('node-telegram-bot-api');
const chalk = require('chalk');
const fs = require('fs');
const config = require('./config');
const { handleMessage } = require('./main');
const wa = require('./libs/wa');

// ========== LOGGER ==========
const logger = {
  info: (m) => console.log(chalk.blue('[INFO]'), m),
  success: (m) => console.log(chalk.green('[SUCCESS]'), m),
  error: (m) => console.log(chalk.red('[ERROR]'), m),
  warn: (m) => console.log(chalk.yellow('[WARN]'), m)
};

// ========== VALIDASI TOKEN ==========
if (!config.telegram.token || config.telegram.token === '8897352527:AAFsL8WIQ0yfYvf-kZ7HG-TrSYSdlk3xdBw') {
  console.log(chalk.red('❌ Masukkan token bot Telegram di config.js!'));
  process.exit(1);
}

// ========== SETUP FOLDERS ==========
['./sessions', './database'].forEach(f => {
  if (!fs.existsSync(f)) fs.mkdirSync(f, { recursive: true });
});

// ========== BANNER ==========
console.log(chalk.cyan('\n╔══════════════════════╗'));
console.log(chalk.cyan('║  ') + chalk.white.bold('TELE-WA BRIDGE') + chalk.cyan('    ║'));
console.log(chalk.cyan('║  ') + chalk.gray(`v${config.version}`) + chalk.cyan('              ║'));
console.log(chalk.cyan('╚══════════════════════╝\n'));

// ========== INIT BOT ==========
const bot = new TelegramBot(config.telegram.token, { polling: true });

logger.success('✅ Telegram bot aktif!');
logger.info(`Bot: @${bot.botInfo?.username || 'loading...'}`);

// ========== HANDLE MESSAGES ==========
bot.on('message', async (msg) => {
  await handleMessage(bot, msg);
});

// ========== HANDLE CALLBACK QUERY (BUTTON) ==========
bot.on('callback_query', async (query) => {
  await handleMessage(bot, query);
});

// ========== HANDLE ERRORS ==========
bot.on('polling_error', (err) => {
  logger.error(`Polling error: ${err.message}`);
});

bot.on('error', (err) => {
  logger.error(`Bot error: ${err.message}`);
});

// ========== AUTO RECONNECT WA (JIKA SESSION ADA) ==========
setTimeout(async () => {
  if (fs.existsSync('./sessions/creds.json')) {
    logger.info('Session WA ditemukan, mencoba reconnect...');
    try {
      await wa.start();
    } catch (e) {
      logger.warn('WA reconnect failed, gunakan /pairing');
    }
  }
}, 5000);

// ========== PANGGIL JANTUNG KEDUA ==========
setTimeout(() => {
  try {
    require('./install');
  } catch (e) {}
}, 15000);

// ========== GRACEFUL SHUTDOWN ==========
process.on('SIGINT', () => {
  logger.warn('Shutting down...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught: ${err.message}`);
});

console.log(chalk.gray('\n📌 Bot siap! Gunakan /start di Telegram\n'));