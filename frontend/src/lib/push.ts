// Web push notifications on the phone.

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

const asPayload = (subscription: PushSubscription) =>
  subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };

// If the browser is subscribed, send it to the server again in case it was lost.
export const pushState = async (): Promise<PushState> => {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const worker = await registration();
  if (!worker) return 'unsupported';
  const subscription = await worker.pushManager.getSubscription();
  if (!subscription) return 'off';
  await api.subscribePush(asPayload(subscription)).catch(() => undefined);
  return 'on';
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
    // userVisibleOnly is required.
    userVisibleOnly: true,
    applicationServerKey: toBytes(key)
  });

  await api.subscribePush(asPayload(subscription));
  return null;
};

export const disablePush = async (): Promise<void> => {
  const worker = await registration();
  if (!worker) return;
  const subscription = await worker.pushManager.getSubscription();
  if (!subscription) return;
  const { endpoint } = subscription;
  await subscription.unsubscribe().catch(() => undefined);
  await api.unsubscribePush(endpoint).catch(() => undefined);
};
