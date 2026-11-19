// Outgoing email, used for staff password resets.
//
// Configured for an SMTP server through the environment; Gmail is the default
// host, so setting SMTP_USER to a Gmail address and SMTP_PASS to a Google
// "app password" (not the account password) is enough. With nothing configured
// the message is written to the server log instead of being sent, so a
// developer can still copy the reset link and finish the flow locally.

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT || 465);
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';
// Port 465 is implicit TLS; 587 starts plain and upgrades with STARTTLS.
const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
const from = process.env.MAIL_FROM || (user ? `Baho <${user}>` : 'Baho <no-reply@baho.local>');

// Demo mode is the offline/test mode: the database is switched off and nothing
// may leave the machine, so no message is ever sent from it however the SMTP
// settings are filled in. Without this a test run would post real email to the
// made-up addresses the tests use.
export const isMailConfigured = () => Boolean(user && pass) && process.env.BAHO_DEMO_MODE !== 'true';

// Where the app itself lives, for links inside a message. Kept here so every
// module that writes an email uses the same address.
export const appBaseUrl = () => (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

let transport = null;

// nodemailer is loaded only when a message is actually sent, so the API still
// starts if the dependency has not been installed.
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
    // A failure to send must never reveal whether the address exists, so the
    // caller still answers with the same message; the reason is logged here.
    console.error(`[mail] Could not send to ${to}: ${error.message}`);
    return { delivered: false, reason: error.message };
  }
};

export const mailSettings = { host, port, secure, from, configured: isMailConfigured() };
