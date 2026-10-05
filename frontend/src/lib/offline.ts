// Offline helpers: service worker registration, a local copy of downloaded
// content, and an outbox for issue reports written while offline (FR06, FR19).

import { api } from '../services/api';

export const registerServiceWorker = () => {
  // The dev server rebuilds files on every change, so only cache the production build.
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
};

export const saveCache = (name: string, value: unknown) => {
  try {
    localStorage.setItem(`baho-cache-${name}`, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the app still works online.
  }
};

export const loadCache = <T>(name: string): T | null => {
  try {
    const value = localStorage.getItem(`baho-cache-${name}`);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

type PendingIssue = { id: number; title: string; description: string };

const OUTBOX_KEY = 'baho-outbox';

export const getOutbox = (): PendingIssue[] => loadCache<PendingIssue[]>(OUTBOX_KEY) || [];

export const queueIssue = (issue: PendingIssue) => saveCache(OUTBOX_KEY, [...getOutbox(), issue]);

// Sends every queued report; anything that still fails stays in the outbox.
export const flushOutbox = async () => {
  const pending = getOutbox();
  const failed: PendingIssue[] = [];
  for (const issue of pending) {
    try {
      await api.createIssue({ title: issue.title, description: issue.description });
    } catch {
      failed.push(issue);
    }
  }
  saveCache(OUTBOX_KEY, failed);
  return pending.length - failed.length;
};
