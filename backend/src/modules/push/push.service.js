import { generateVAPIDKeys, sendNotification, setVapidDetails, WebPushError } from 'web-push';

import { pool } from '../../config/db.js';
import { appBaseUrl } from '../mail/mailer.js';

// Web push notifications. Messages are encrypted for the device.

const publicKey = process.env.VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const subject = process.env.VAPID_SUBJECT || 'mailto:no-reply@baho.filito.rw';

export const isPushConfigured = () => Boolean(publicKey && privateKey) && process.env.BAHO_DEMO_MODE !== 'true';

if (isPushConfigured()) setVapidDetails(subject, publicKey, privateKey);

export const pushPublicKey = () => (isPushConfigured() ? publicKey : null);

// Helper to generate VAPID keys for a new server.
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

// 404/410 means the subscription is gone, so delete it.
const forget = async (endpoint) => {
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  } catch {
    // Nothing more to do: the next send will try again.
  }
};

// Sends to all the learner's devices, returns how many accepted it.
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
