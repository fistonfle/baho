// Learners sign in with a Rwandan mobile number and a short PIN, like mobile money.

// 078 123 4567, 0781234567, 250781234567 and +250 78 123 4567 are all stored as +250781234567.
// Rwandan mobile numbers start with 072, 073 (Airtel) or 078, 079 (MTN).
export const normalizePhone = (input) => {
  const compact = String(input || '').replace(/[\s().-]/g, '');
  const match = compact.match(/^(?:\+?250|0)(7[2389]\d{7})$/);
  return match ? `+250${match[1]}` : null;
};

export const isPin = (value) => /^\d{4,6}$/.test(String(value || ''));

// A PIN is short, so a number is locked for a while after repeated wrong PINs.
const maxFailures = 5;
const lockMinutes = 15;
const failures = new Map();

export const isLocked = (key) => (failures.get(key)?.lockedUntil ?? 0) > Date.now();

export const recordFailure = (key) => {
  const entry = failures.get(key) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= maxFailures) {
    entry.count = 0;
    entry.lockedUntil = Date.now() + lockMinutes * 60 * 1000;
  }
  failures.set(key, entry);
};

export const clearFailures = (key) => failures.delete(key);
