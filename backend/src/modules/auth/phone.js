// Learners sign in with a Rwandan mobile number and a short PIN, like mobile money.

export class PhoneNumber {
  // 078 123 4567, 0781234567, 250781234567 and +250 78 123 4567 all become +250781234567.
  // Rwandan mobile numbers start with 072, 073 (Airtel) or 078, 079 (MTN).
  static normalize(input) {
    const compact = String(input || '').replace(/[\s().-]/g, '');
    const match = compact.match(/^(?:\+?250|0)(7[2389]\d{7})$/);
    return match ? `+250${match[1]}` : null;
  }

  static isPin(value) {
    return /^\d{4,6}$/.test(String(value || ''));
  }
}

// A PIN is short, so an account is locked for a while after repeated wrong PINs.
// The clock is injectable so the lockout can be tested without waiting.
export class LoginGuard {
  #failures = new Map();

  constructor({ maxFailures = 5, lockMinutes = 15, now = () => Date.now() } = {}) {
    this.maxFailures = maxFailures;
    this.lockMs = lockMinutes * 60 * 1000;
    this.now = now;
  }

  isLocked(key) {
    return (this.#failures.get(key)?.lockedUntil ?? 0) > this.now();
  }

  recordFailure(key) {
    const entry = this.#failures.get(key) ?? { count: 0, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= this.maxFailures) {
      entry.count = 0;
      entry.lockedUntil = this.now() + this.lockMs;
    }
    this.#failures.set(key, entry);
  }

  clear(key) {
    this.#failures.delete(key);
  }
}

// One guard for the running server.
export const loginGuard = new LoginGuard();
