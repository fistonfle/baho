import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { hasSubscription, isPushConfigured, pushPublicKey, removeSubscription, saveSubscription } from './push.service.js';

// Public VAPID key the browser needs to subscribe.
export const getPushKey = (_req, res) => res.json({ key: pushPublicKey(), enabled: isPushConfigured() });

export const subscribeToPush = async (req, res) => {
  if (!isPushConfigured()) {
    return res.status(503).json({ message: 'Notifications are not set up on this server' });
  }
  try {
    const saved = await saveSubscription(req.user.id, req.body?.subscription ?? req.body);
    if (!saved) return res.status(400).json({ message: 'A complete push subscription is required' });
    return res.status(201).json({ message: 'This device will receive notifications' });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Notifications need the database, which is not available' });
    }
    return res.status(503).json({ message: 'Could not save the subscription' });
  }
};

export const unsubscribeFromPush = async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (!endpoint) return res.status(400).json({ message: 'The subscription endpoint is required' });
  try {
    await removeSubscription(req.user.id, endpoint);
    return res.json({ message: 'This device will no longer receive notifications' });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) return res.status(503).json({ message: 'Could not remove the subscription' });
    return res.status(503).json({ message: 'Notifications need the database, which is not available' });
  }
};

// Does this account have at least one subscribed device?
export const getPushStatus = async (req, res) => {
  if (!isPushConfigured()) return res.json({ enabled: false, devices: false });
  try {
    return res.json({ enabled: true, devices: await hasSubscription(req.user.id) });
  } catch {
    return res.json({ enabled: true, devices: false });
  }
};
