import { pool } from '../../config/db.js';
import { appBaseUrl, isMailConfigured, sendMail } from '../mail/mailer.js';
import { isPushConfigured, sendPush } from '../push/push.service.js';

// Sends reminders by email at the time the learner chose.
// last_sent_on stops duplicates on the same day.

const KIGALI = 'Africa/Kigali';

// Rwanda local time, whatever the server timezone is.
export const kigaliNow = (at = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KIGALI,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(at).reduce((all, part) => ({ ...all, [part.type]: part.value }), {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`
  };
};

const reminderEmail = (name, label, time) => ({
  subject: 'Baho: urwibutso rwawe',
  text: [
    `Muraho ${name || ''}`.trim() + ',',
    '',
    `Urwibutso wiyandikiye kuri Baho rwa saa ${time}:`,
    '',
    label,
    '',
    `Fungura Baho: ${appBaseUrl()}`,
    '',
    'Ushobora guhagarika ubu butumwa ukuraho imeyili yawe mu mwirondoro wawe.',
    '',
    'Baho - bahoapp.site'
  ].join('\n'),
  html: `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#14304d;line-height:1.6">
      <p>Muraho ${name || ''},</p>
      <p>Urwibutso wiyandikiye kuri Baho rwa saa ${time}:</p>
      <p style="font-size:18px;font-weight:bold">${label}</p>
      <p>
        <a href="${appBaseUrl()}" style="display:inline-block;background:#0b5845;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none">
          Fungura Baho
        </a>
      </p>
      <p style="color:#5b7083;font-size:13px">Ushobora guhagarika ubu butumwa ukuraho imeyili yawe mu mwirondoro wawe.</p>
      <p style="color:#5b7083;font-size:13px">Baho &mdash; bahoapp.site</p>
    </div>
  `
});

// Due reminders (10 minute window) not sent yet today.
const dueReminders = async (now) => {
  const result = await pool.query(
    `SELECT r.id, r.user_id, r.title, to_char(r.reminder_time, 'HH24:MI') AS at, u.full_name, u.email
       FROM reminders r
       JOIN users u ON u.id = r.user_id
      WHERE (u.email IS NOT NULL OR EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = u.id))
        AND r.reminder_time <= $1::time
        AND r.reminder_time > ($1::time - interval '10 minutes')
        AND (r.last_sent_on IS NULL OR r.last_sent_on <> $2::date)`,
    [now.time, now.date]
  );
  return result.rows;
};

// Marked as sent even if the mail fails, to avoid endless retries.
export const sendDueReminders = async (at = new Date()) => {
  const now = kigaliNow(at);
  let sent = 0;
  let pushed = 0;
  const due = await dueReminders(now);
  for (const reminder of due) {
    // Push first, email as fallback.
    const push = await sendPush(reminder.user_id, {
      title: 'Baho',
      body: reminder.title,
      tag: `reminder-${reminder.id}`
    });
    pushed += push.sent;
    if (reminder.email) {
      const result = await sendMail({ to: reminder.email, ...reminderEmail(reminder.full_name, reminder.title, reminder.at) });
      if (result.delivered) sent += 1;
    }
    await pool.query('UPDATE reminders SET last_sent_on = $1::date WHERE id = $2', [now.date, reminder.id]);
  }
  return { due: due.length, sent, pushed };
};

let ticker = null;

export const startReminderMailer = () => {
  if (ticker) return ticker;
  if (process.env.BAHO_DEMO_MODE === 'true') return null;
  if (!isMailConfigured() && !isPushConfigured()) {
    console.log('[reminders] Neither SMTP nor web push is configured, so reminders stay inside the app.');
    return null;
  }
  ticker = setInterval(() => {
    sendDueReminders().catch((error) => console.error(`[reminders] ${error.message}`));
  }, 60_000);
  // Don't keep the process alive just for this timer.
  ticker.unref?.();
  console.log(`[reminders] Reminders will be sent${isPushConfigured() ? ' to subscribed devices' : ''}${isPushConfigured() && isMailConfigured() ? ' and' : ''}${isMailConfigured() ? ' by email' : ''}.`);
  return ticker;
};

export const stopReminderMailer = () => {
  if (ticker) clearInterval(ticker);
  ticker = null;
};
