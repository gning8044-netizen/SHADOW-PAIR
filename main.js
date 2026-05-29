// main.js - Tele-WA Bridge Command Handler (Full MD Features)
const fs = require('fs');
const wa = require('./libs/wa');
const config = require('./config');
const QRCode = require('qrcode');
const axios = require('axios');

// ========== KEYBOARD ==========
const mainKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📱 Pairing Code', callback_data: 'pair_code' }, { text: '📷 QR Code', callback_data: 'pair_qr' }],
      [{ text: '📊 Status', callback_data: 'status' }, { text: 'ℹ️ Info', callback_data: 'info' }],
      [{ text: '🎨 Sticker', callback_data: 'sticker' }, { text: '🎵 Play', callback_data: 'play' }]
    ]
  }
};

// ========== QUOTE STYLE ==========
const fmt = (text, title) => {
  let t = text.replace(/\n/g, '\n║  ');
  return `╔══════════════════╗\n║  *${title}*\n╠══════════════════╣\n║  ${t}\n╚══════════════════╝`;
};

// ========== HANDLE ==========
async function handleMessage(bot, msg) {
  const chatId = msg.chat?.id || msg.message?.chat?.id;
  const text = msg.text || '';

  // ========== COMMANDS ==========
  if (text?.startsWith('/')) {
    const args = text.slice(1).split(' ');
    const cmd = args[0].toLowerCase();
    const params = args.slice(1);

    switch (cmd) {

      // ========== START ==========
      case 'start':
        await bot.sendMessage(chatId, fmt(`👋 Selamat datang di ${config.name}!\n\nBot Telegram-WhatsApp Bridge.\n\n📌 /menu untuk semua fitur`, 'WELCOME'), { parse_mode: 'Markdown', reply_markup: mainKeyboard.reply_markup });
        break;

      // ========== MENU ==========
      case 'menu':
      case 'help':
        await bot.sendMessage(chatId, fmt(`📌 *BRIDGE*\n/pairing - Pairing Code\n/qr - QR Code\n/status - Status\n/send - Kirim WA\n\n🎨 *MAKER*\n/brat <teks> - Brat Sticker\n/qc <teks> - Quote Chat\n/iqc <teks> - iPhone QC\n\n🎵 *DOWNLOADER*\n/play <judul> - Download Lagu\n/pinterest <url> - Pinterest\n/igstory <user> - IG Story`, 'MENU'), { parse_mode: 'Markdown' });
        break;

      // ========== PAIRING CODE ==========
      case 'pairing':
      case 'pair':
        if (!params[0]) {
          await bot.sendMessage(chatId, '❌ /pairing 628xxx', { parse_mode: 'Markdown' });
          break;
        }
        const phone = params[0].replace(/[^0-9]/g, '');
        const pMsg = await bot.sendMessage(chatId, '⏳ *Meminta kode...*', { parse_mode: 'Markdown' });
        try {
          const r = await wa.start(phone);
          if (r.success && r.code) {
            const cf = r.code.match(/.{1,4}/g)?.join('-') || r.code;
            await bot.sendMessage(chatId, fmt(`🔑 *${cf}*\n\n📱 WA → Perangkat Tertaut`, 'KODE PAIRING'), { parse_mode: 'Markdown' });
          } else if (r.alreadyConnected) {
            await bot.sendMessage(chatId, '✅ Sudah terhubung!', { parse_mode: 'Markdown' });
          } else {
            await bot.sendMessage(chatId, `❌ ${r.message}`, { parse_mode: 'Markdown' });
          }
        } catch (e) {
          await bot.sendMessage(chatId, `❌ ${e.message}`, { parse_mode: 'Markdown' });
        }
        break;

      // ========== QR CODE ==========
      case 'qr':
      case 'qrcode':
        if (!params[0]) {
          await bot.sendMessage(chatId, '❌ /qr 628xxx', { parse_mode: 'Markdown' });
          break;
        }
        const qrPhone = params[0].replace(/[^0-9]/g, '');
        const qrMsg = await bot.sendMessage(chatId, '⏳ *Membuat QR...*', { parse_mode: 'Markdown' });
        try {
          const qrBuf = await QRCode.toBuffer(qrPhone, { type: 'png', width: 400, margin: 2 });
          await bot.sendPhoto(chatId, qrBuf, { caption: fmt(`📷 *QR CODE*\n📱 ${qrPhone}\n\nScan di WhatsApp → Perangkat Tertaut`, 'QR PAIRING'), parse_mode: 'Markdown' });
        } catch (e) {
          await bot.sendMessage(chatId, `❌ ${e.message}`, { parse_mode: 'Markdown' });
        }
        break;

      // ========== STATUS ==========
      case 'status':
        await bot.sendMessage(chatId, fmt(`📱 WA: ${wa.isConnected ? '🟢 Connected' : '🔴 Disconnected'}\n📞 Nomor: +${wa.botNumber || 'N/A'}`, 'STATUS'), { parse_mode: 'Markdown' });
        break;

      // ========== SEND WA ==========
      case 'send':
      case 'wa':
        if (!wa.isConnected) { await bot.sendMessage(chatId, '❌ Pairing dulu!', { parse_mode: 'Markdown' }); break; }
        if (params.length < 2) { await bot.sendMessage(chatId, '❌ /send 628xxx teks', { parse_mode: 'Markdown' }); break; }
        await wa.sendMessage(params[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net', { text: params.slice(1).join(' ') });
        await bot.sendMessage(chatId, '✅ Terkirim!', { parse_mode: 'Markdown' });
        break;

      // ========== BRAT STICKER ==========
      case 'brat':
        if (!params[0]) { await bot.sendMessage(chatId, '❌ /brat <teks>', { parse_mode: 'Markdown' }); break; }
        const bratText = params.join(' ');
        if (bratText.length > 50) { await bot.sendMessage(chatId, '❌ Maks 50 karakter!', { parse_mode: 'Markdown' }); break; }
        await bot.sendMessage(chatId, '⏳ Membuat brat...', { parse_mode: 'Markdown' });
        try {
          const { createCanvas } = require('@napi-rs/canvas');
          const sharp = require('sharp');
          const cv = createCanvas(512, 512);
          const cx = cv.getContext('2d');
          cx.fillStyle = '#000'; cx.fillRect(0, 0, 512, 512);
          cx.fillStyle = '#FFF'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
          const fs = bratText.length <= 10 ? 80 : bratText.length <= 20 ? 60 : bratText.length <= 30 ? 45 : 35;
          cx.font = `bold ${fs}px Arial`;
          const words = bratText.split(' '); const lines = []; let cl = '';
          for (const w of words) { const tl = cl ? cl + ' ' + w : w; if (cx.measureText(tl).width > 450 && cl) { lines.push(cl); cl = w; } else cl = tl; }
          if (cl) lines.push(cl);
          const lh = fs + 10; const sy = 256 - ((lines.length - 1) * lh) / 2;
          lines.forEach((l, i) => cx.fillText(l.toUpperCase(), 256, sy + (i * lh)));
          const buf = await sharp(cv.toBuffer('image/png')).resize(512, 512).webp({ quality: 90 }).toBuffer();
          await bot.sendSticker(chatId, buf);
        } catch (e) { await bot.sendMessage(chatId, `❌ ${e.message}`, { parse_mode: 'Markdown' }); }
        break;

      // ========== PLAY ==========
      case 'play':
      case 'song':
        if (!params[0]) { await bot.sendMessage(chatId, '❌ /play <judul>', { parse_mode: 'Markdown' }); break; }
        await bot.sendMessage(chatId, '⏳ Mencari...', { parse_mode: 'Markdown' });
        try {
          const yts = require('yt-search');
          const s = await yts(params.join(' '));
          if (!s.videos?.[0]) { await bot.sendMessage(chatId, '❌ Tidak ditemukan!', { parse_mode: 'Markdown' }); break; }
          const v = s.videos[0];
          const dl = await axios.get(`https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(v.url)}`, { timeout: 30000 });
          if (dl.data?.data?.url) {
            await bot.sendMessage(chatId, `🎵 *${v.title}*\n👤 ${v.author?.name}\n⏱ ${v.timestamp}`, { parse_mode: 'Markdown' });
            await bot.sendAudio(chatId, dl.data.data.url, { title: v.title, performer: v.author?.name });
          }
        } catch (e) { await bot.sendMessage(chatId, `❌ ${e.message}`, { parse_mode: 'Markdown' }); }
        break;

      // ========== PINTEREST ==========
      case 'pinterest':
      case 'pin':
        if (!params[0]) { await bot.sendMessage(chatId, '❌ /pinterest <url>', { parse_mode: 'Markdown' }); break; }
        await bot.sendMessage(chatId, '⏳ Download Pinterest...', { parse_mode: 'Markdown' });
        try {
          const pr = await axios.get(`https://rynekoo-api.hf.space/downloader/pinterest?url=${encodeURIComponent(params[0])}`, { timeout: 30000 });
          const pu = Array.isArray(pr.data?.result) ? pr.data.result[0] : pr.data?.result;
          if (pu) {
            if (pu.includes('.mp4')) await bot.sendVideo(chatId, pu);
            else await bot.sendPhoto(chatId, pu);
          }
        } catch (e) { await bot.sendMessage(chatId, `❌ ${e.message}`, { parse_mode: 'Markdown' }); }
        break;

      // ========== IG STORY ==========
      case 'igstory':
      case 'igst':
        if (!params[0]) { await bot.sendMessage(chatId, '❌ /igstory <username>', { parse_mode: 'Markdown' }); break; }
        await bot.sendMessage(chatId, '⏳ Download IG Story...', { parse_mode: 'Markdown' });
        try {
          const sr = await axios.get(`https://rynekoo-api.hf.space/downloader/instagram-story?username=${encodeURIComponent(params[0])}`, { timeout: 30000 });
          if (sr.data?.result?.length > 0) {
            for (let i = 0; i < Math.min(sr.data.result.length, 5); i++) {
              const su = sr.data.result[i];
              if (su.includes('.mp4')) await bot.sendVideo(chatId, su);
              else await bot.sendPhoto(chatId, su);
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        } catch (e) { await bot.sendMessage(chatId, `❌ ${e.message}`, { parse_mode: 'Markdown' }); }
        break;

      // ========== INFO ==========
      case 'info':
        const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        await bot.sendMessage(chatId, fmt(`🤖 ${config.name} v${config.version}\n📱 WA: ${wa.isConnected ? '✅' : '❌'}\n💾 ${mem} MB\n⏱ ${Math.floor(process.uptime())}s`, 'INFO'), { parse_mode: 'Markdown' });
        break;

      default:
        await bot.sendMessage(chatId, `❌ /menu untuk bantuan`, { parse_mode: 'Markdown' });
    }
  }

  // ========== CALLBACK QUERY ==========
  if (msg.callback_query) {
    const d = msg.callback_query.data;
    const cid = msg.callback_query.message.chat.id;
    switch (d) {
      case 'pair_code': await bot.sendMessage(cid, '📱 /pairing 628xxx', { parse_mode: 'Markdown' }); break;
      case 'pair_qr': await bot.sendMessage(cid, '📷 /qr 628xxx', { parse_mode: 'Markdown' }); break;
      case 'status': await bot.sendMessage(cid, `📊 WA: ${wa.isConnected ? '🟢 ON' : '🔴 OFF'}`, { parse_mode: 'Markdown' }); break;
      case 'info': await bot.sendMessage(cid, `ℹ️ ${config.name} v${config.version}`, { parse_mode: 'Markdown' }); break;
    }
    await bot.answerCallbackQuery(msg.callback_query.id);
  }
}

module.exports = { handleMessage, mainKeyboard };