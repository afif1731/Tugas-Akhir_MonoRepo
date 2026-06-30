import qrcode from 'qrcode-terminal';
import { Client, LocalAuth } from 'whatsapp-web.js';

import { ReporterConfig } from './reporter.config';

const whatsappClient = new Client({
  authStrategy: new LocalAuth({
    clientId: ReporterConfig.Whatsapp.CLIENT_ID,
    dataPath: '../.wawebjs-auth',
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  },
});

whatsappClient.on('qr', qr => {
  console.log('WhatsApp QR Code received. Scan to authenticate.');
  qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
  console.log('WhatsApp Client is ready and listening!');
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
whatsappClient.on('message', async message => {
  if (message.body.toLowerCase() === '!ping') {
    await message.reply(
      '*PONG!*\n\n' + `Chat Id: ${message.from}\n` + `_sent at ${new Date()}_`, // eslint-disable-line @typescript-eslint/restrict-template-expressions
    );
  }
});

whatsappClient.on('disconnected', reason => {
  console.error('Whatsapp Client disconnected', reason);
});

whatsappClient.on('auth_failure', message => {
  console.error('Failed to authenticate', message);
});

export { whatsappClient };
