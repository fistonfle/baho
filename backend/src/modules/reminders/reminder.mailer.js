import { pool } from '../../config/db.js';
import { appBaseUrl, isMailConfigured, sendMail } from '../mail/mailer.js';
import { isPushConfigured, sendPush } from '../push/push.service.js';

// Reminders by email.
//
// A learner sets a reminder as a time of day and a label they write themselves.
// Until SMS is available, a learner who has given Baho an email address is sent
// that reminder by email at the time they chose. The label is their own wording,
// and the profile screen says plainly that it is what gets sent, so nobody is
// surprised by their own words arriving in an inbox. Nothing else about them
// goes into the message.
//
// Reminders repeat daily, so last_sent_on records the day each one last went
// out. That is what stops a second copy if the ticker runs twice in the same
// minute, or the server restarts.

const KIGALI = 'Africa/Kigali';

// The wall clock a learner in Rwanda is reading, whatever zone the server keeps.
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
    'Baho — baho.filito.rw'
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
      <p style="color:#5b7083;font-size:13px">Baho &mdash; baho.filito.rw</p>
    </div>
  `
});

// Reminders whose time has come and that have not gone out today. The ten
// minute window covers a restart or a slow tick; a reminder set just before
// midnight is not carried into the next day, which keeps the day stamp honest.
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

// Marked as sent whether or not the mail server accepted it, so a mail server
// that is down costs a learner one reminder rather than a hundred retries.
export const sendDueReminders = async (at = new Date()) => {
  const now = kigaliNow(at);
  let sent = 0;
  let pushed = 0;
  const due = await dueReminders(now);
  for (const reminder of due) {
    // The phone first. A learner with the app installed gets it there and needs
    // no email at all; the email is the fallback for a phone that cannot take
    // notifications, which is most older handsets.
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
  // The ticker must never be the reason the process stays alive.
  ticker.unref?.();
  console.log(`[reminders] Reminders will be sent${isPushConfigured() ? ' to subscribed devices' : ''}${isPushConfigured() && isMailConfigured() ? ' and' : ''}${isMailConfigured() ? ' by email' : ''}.`);
  return ticker;
};

export const stopReminderMailer = () => {
  if (ticker) clearInterval(ticker);
  ticker = null;
};
