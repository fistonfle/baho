import { generateVAPIDKeys, sendNotification, setVapidDetails, WebPushError } from 'web-push';

import { pool } from '../../config/db.js';
import { appBaseUrl } from '../mail/mailer.js';

// Web push: the notification a learner gets on their phone when Baho is closed.
//
// The browser holds a subscription that names the push service of its own maker
// (Google, Mozilla, Apple) and two keys. The payload is encrypted to those keys
// before it leaves this server, so the push service forwards a message it cannot
// read. That is a better guarantee than email, where the provider reads
// everything, which is why the notification text here can be a little more
// useful than the one Baho sends by email.
//
// On a phone this works in Chrome and Firefox on Android, and on iPhone only
// once the learner has added Baho to the Home Screen, which is the iOS rule for
// web push. A learner on an older phone simply never sees the prompt, and the
// email path still covers them.

const publicKey = process.env.VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const subject = process.env.VAPID_SUBJECT || 'mailto:no-reply@baho.filito.rw';

export const isPushConfigured = () => Boolean(publicKey && privateKey) && process.env.BAHO_DEMO_MODE !== 'true';

if (isPushConfigured()) setVapidDetails(subject, publicKey, privateKey);

export const pushPublicKey = () => (isPushConfigured() ? publicKey : null);

// Offered by the API so an administrator setting up a new server has a pair to
// paste into the environment without hunting for a tool.
export const newVapidKeys = () => generateVAPIDKeys();

export const saveSubscription = async (userId, subscription) => {
  const { endpoint, keys } = subscription || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) return false;
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [userId, endpoint, keys.p256dh, keys.auth]
  );
  return true;
};

export const removeSubscription = async (userId, endpoint) => {
  const result = await pool.query(
    'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2 RETURNING id',
    [userId, endpoint]
  );
  return Boolean(result.rows[0]);
};

export const hasSubscription = async (userId) => {
  const result = await pool.query('SELECT 1 FROM push_subscriptions WHERE user_id = $1 LIMIT 1', [userId]);
  return Boolean(result.rows[0]);
};

// A subscription dies when the learner uninstalls the app, clears the browser or
// simply turns notifications off in the operating system. The push service says
// so with 404 or 410, and the row is dropped: keeping it would mean trying
// forever and would leave a record of a device that no longer exists.
const forget = async (endpoint) => {
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  } catch {
    // Nothing more to do: the next send will try again.
  }
};

// Sends to every device the learner has signed in on. Returns how many accepted
// it; zero means nothing was delivered, which is why email runs alongside.
export const sendPush = async (userId, payload) => {
  if (!isPushConfigured()) return { sent: 0, reason: 'push-not-configured' };
  let rows = [];
  try {
    rows = (await pool.query('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [userId])).rows;
  } catch (error) {
    return { sent: 0, reason: error.message };
  }

  const body = JSON.stringify({ url: appBaseUrl(), ...payload });
  let sent = 0;
  for (const row of rows) {
    try {
      await sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, body);
      sent += 1;
    } catch (error) {
      if (error instanceof WebPushError && [404, 410].includes(error.statusCode)) {
        await forget(row.endpoint);
      } else {
        console.error(`[push] Could not deliver to a device: ${error.message}`);
      }
    }
  }
  return { sent, devices: rows.length };
};
