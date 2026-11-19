// Notifications on the phone itself (web push).
//
// The browser keeps a subscription naming its own maker's push service and two
// keys; the server encrypts every message to those keys, so the service that
// carries it cannot read it. Baho uses it to say a reply has arrived and to
// deliver the reminders a learner set.
//
// Where it works: Chrome and Firefox on Android, and the major desktop
// browsers. On an iPhone only once Baho has been added to the Home Screen,
// which is Apple's rule for web push. Anywhere else the learner is simply never
// offered it, and the email path still covers them.

import { api } from '../services/api';

export const pushSupported = () =>
  typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window;

export type PushState = 'unsupported' | 'blocked' | 'off' | 'on';

// The VAPID key travels as base64url and the browser wants raw bytes.
const toBytes = (base64url: string) => {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
};

const registration = async () => {
  if (!pushSupported()) return null;
  // The worker is registered on load; this waits for it rather than assuming.
  return navigator.serviceWorker.ready.catch(() => null);
};

export const pushState = async (): Promise<PushState> => {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const worker = await registration();
  if (!worker) return 'unsupported';
  return (await worker.pushManager.getSubscription()) ? 'on' : 'off';
};

// Returns null when the device is now subscribed, or a reason it is not.
export const enablePush = async (): Promise<string | null> => {
  if (!pushSupported()) return 'unsupported';
  const worker = await registration();
  if (!worker) return 'unsupported';

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'dismissed';

  const { key, enabled } = await api.getPushKey();
  if (!enabled || !key) return 'server';

  const existing = await worker.pushManager.getSubscription();
  const subscription = existing ?? await worker.pushManager.subscribe({
    // Every push must show a notification; a silent one is not allowed, and
    // Baho has no reason to want one.
    userVisibleOnly: true,
    applicationServerKey: toBytes(key)
  });

  await api.subscribePush(subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
  return null;
};

// Dropped on the device and on the server, so nothing is left pointing at a
// phone that has asked to be left alone.
export const disablePush = async (): Promise<void> => {
  const worker = await registration();
  if (!worker) return;
  const subscription = await worker.pushManager.getSubscription();
  if (!subscription) return;
  const { endpoint } = subscription;
  await subscription.unsubscribe().catch(() => undefined);
  await api.unsubscribePush(endpoint).catch(() => undefined);
};
