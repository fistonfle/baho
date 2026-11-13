// Password-reset tokens.
//
// The link sent by email carries a random 32-byte token. Only its SHA-256 hash
// is stored, so a copy of the database does not let anyone take over an
// account. A token is valid once and expires after PASSWORD_RESET_TTL_MINUTES
// (60 by default). Like every other service here, PostgreSQL is used when it
// is available and an in-memory list of the same shape when it is not.

import crypto from 'crypto';

import { pool } from '../../config/db.js';
import { inMemoryStore } from '../../config/store.js';

const ttlMinutes = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60);

export const tokenTtlMinutes = ttlMinutes;

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const expiryFrom = (now = Date.now()) => new Date(now + ttlMinutes * 60 * 1000);

// A fresh token invalidates the earlier ones for the same user, so a second
// "forgot password" email always wins.
export const createResetToken = async (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = expiryFrom();
  try {
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
    await pool.query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );
  } catch {
    inMemoryStore.passwordResets = (inMemoryStore.passwordResets || []).filter((entry) => entry.userId !== userId);
    inMemoryStore.passwordResets.push({ userId, tokenHash, expiresAt, usedAt: null });
  }
  return { token, expiresAt };
};

// Returns the user id the token belongs to, or null when it is unknown,
// already used or expired. The token is consumed, so it cannot be replayed.
export const consumeResetToken = async (token) => {
  if (!token) return null;
  const tokenHash = hashToken(token);
  try {
    const result = await pool.query(
      `DELETE FROM password_resets
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id AS "userId"`,
      [tokenHash]
    );
    return result.rows[0]?.userId ?? null;
  } catch {
    const resets = inMemoryStore.passwordResets || [];
    const index = resets.findIndex(
      (entry) => entry.tokenHash === tokenHash && !entry.usedAt && new Date(entry.expiresAt) > new Date()
    );
    if (index === -1) return null;
    const [entry] = resets.splice(index, 1);
    return entry.userId;
  }
};

export const clearResetTokens = async (userId) => {
  try {
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
  } catch {
    inMemoryStore.passwordResets = (inMemoryStore.passwordResets || []).filter((entry) => entry.userId !== userId);
  }
};
