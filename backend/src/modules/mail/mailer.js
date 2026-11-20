// Sends email through SMTP (Gmail by default). Without config it just logs the message.

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT || 465);
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';
// Port 465 is implicit TLS; 587 starts plain and upgrades with STARTTLS.
const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
const from = process.env.MAIL_FROM || (user ? `Baho <${user}>` : 'Baho <no-reply@baho.local>');

// Never send real email in demo/test mode.
export const isMailConfigured = () => Boolean(user && pass) && process.env.BAHO_DEMO_MODE !== 'true';

export const appBaseUrl = () => (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

let transport = null;

// Loaded lazily so the API still starts without nodemailer.
const getTransport = async () => {
  if (transport) return transport;
  const { default: nodemailer } = await import('nodemailer');
  transport = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  return transport;
};

export const sendMail = async ({ to, subject, text, html }) => {
  if (!isMailConfigured()) {
    console.warn(`[mail] SMTP is not configured; the message to ${to} was not sent.`);
    console.warn(`[mail] Subject: ${subject}`);
    console.warn(`[mail] ${text}`);
    return { delivered: false, reason: 'smtp-not-configured' };
  }
  try {
    const mailer = await getTransport();
    const info = await mailer.sendMail({ from, to, subject, text, html });
    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    // Don't reveal if the address exists, just log the error.
    console.error(`[mail] Could not send to ${to}: ${error.message}`);
    return { delivered: false, reason: error.message };
  }
};

export const mailSettings = { host, port, secure, from, configured: isMailConfigured() };
