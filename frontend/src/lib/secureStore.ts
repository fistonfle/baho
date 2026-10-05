// Small encrypted store for sensitive answers (NFR05).
// A non-extractable AES-GCM key is generated once and kept in IndexedDB, and
// each record is encrypted with a fresh IV before it is written.
// Web Crypto needs a secure context (https or localhost); elsewhere we fall
// back to plain localStorage so the demo still works.

const DB_NAME = 'baho-secure';
const STORE = 'items';

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const idbGet = async <T>(key: string) => {
  const db = await openDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
};

const idbSet = async (key: string, value: unknown) => {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const idbDelete = async (key: string) => {
  const db = await openDb();
  return new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(key);
    transaction.oncomplete = () => resolve();
  });
};

const canEncrypt = () => typeof window !== 'undefined' && window.isSecureContext && 'crypto' in window && 'subtle' in crypto && 'indexedDB' in window;

const getDeviceKey = async () => {
  const existing = await idbGet<CryptoKey>('device-key');
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await idbSet('device-key', key);
  return key;
};

export const saveSecure = async (name: string, value: unknown) => {
  if (!canEncrypt()) {
    localStorage.setItem(`baho-plain-${name}`, JSON.stringify(value));
    return;
  }
  const key = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  await idbSet(name, { iv, cipher });
};

export const loadSecure = async <T>(name: string): Promise<T | null> => {
  try {
    if (!canEncrypt()) {
      const plain = localStorage.getItem(`baho-plain-${name}`);
      return plain ? JSON.parse(plain) : null;
    }
    const record = await idbGet<{ iv: Uint8Array<ArrayBuffer>; cipher: ArrayBuffer }>(name);
    if (!record) return null;
    const key = await getDeviceKey();
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv }, key, record.cipher);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
};

export const removeSecure = async (name: string) => {
  localStorage.removeItem(`baho-plain-${name}`);
  if (canEncrypt()) await idbDelete(name);
};
