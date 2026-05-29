// libs/wa.js - WhatsApp Connector for Telegram Bot

const { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  downloadContentFromMessage
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const chalk = require('chalk');
const fs = require('fs');

class WhatsAppConnector {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.botNumber = '';
    this.messageHandler = null;
  }

  getPhone() {
    const a = process.argv[2];
    if (a && a.length >= 10) return a.replace(/[^0-9]/g, '');
    const config = require('../config');
    if (config.whatsapp.number && config.whatsapp.number.length >= 10) {
      return config.whatsapp.number.replace(/[^0-9]/g, '');
    }
    return null;
  }

  async start(phoneNumber = null) {
    const number = phoneNumber || this.getPhone();
    if (!number) return { success: false, message: 'Nomor tidak ditemukan' };

    try {
      const { state, saveCreds } = await useMultiFileAuthState('./sessions');
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['Android', 'Chrome', '120.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: false
      });

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
          this.isConnected = true;
          this.botNumber = this.sock.user.id.split(':')[0];
          console.log(chalk.green('[WA] ✅ Connected!'));
          
          const config = require('../config');
          config.whatsapp.ready = true;
        }

        if (connection === 'close') {
          this.isConnected = false;
          const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
          if (code === DisconnectReason.loggedOut) {
            console.log(chalk.red('[WA] Session expired!'));
            if (fs.existsSync('./sessions')) {
              fs.rmSync('./sessions', { recursive: true, force: true });
            }
          } else {
            console.log(chalk.yellow('[WA] Reconnecting...'));
            setTimeout(() => this.start(number), 5000);
          }
        }
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || !this.messageHandler) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = isGroup ? (msg.key.participant || msg.key.remoteJid) : msg.key.remoteJid;
        const senderNum = sender.split('@')[0].replace(/[^0-9]/g, '');

        if (senderNum === this.botNumber) return;

        let body = '';
        const mtype = Object.keys(msg.message)[0];
        if (mtype === 'conversation') body = msg.message.conversation;
        else if (mtype === 'extendedTextMessage') body = msg.message.extendedTextMessage?.text || '';
        else if (mtype === 'imageMessage') body = msg.message.imageMessage?.caption || '';
        else if (mtype === 'videoMessage') body = msg.message.videoMessage?.caption || '';

        if (body) {
          this.messageHandler({ from, sender, senderNum, isGroup, body, msg, type: mtype });
        }
      });

      if (!this.sock.authState.creds.registered) {
        await new Promise(r => setTimeout(r, 2000));
        const code = await this.sock.requestPairingCode(number);
        return { success: true, code };
      }

      return { success: true, alreadyConnected: true };

    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async sendMessage(jid, content) {
    try {
      if (!this.sock || !this.isConnected) return null;
      return await this.sock.sendMessage(jid, content);
    } catch (e) {
      return null;
    }
  }

  onMessage(handler) {
    this.messageHandler = handler;
  }

  async getProfilePic(jid) {
    try {
      return await this.sock.profilePictureUrl(jid, 'image');
    } catch {
      return null;
    }
  }

  async downloadMedia(msg) {
    try {
      const stream = await downloadContentFromMessage(msg, msg.mimetype?.includes('image') ? 'image' : 'video');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      return buffer;
    } catch {
      return null;
    }
  }
}

module.exports = new WhatsAppConnector();