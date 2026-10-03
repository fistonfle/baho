import { pool } from '../../config/db.js';
import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { inMemoryStore } from '../../config/store.js';
import { createToken, hashPassword } from './security.js';

const normalizedEmail = (email) => String(email || '').trim().toLowerCase();

export const seedInitialAdmin = async () => {
  const name = process.env.BAHO_ADMIN_NAME?.trim();
  const email = normalizedEmail(process.env.BAHO_ADMIN_EMAIL);
  const password = process.env.BAHO_ADMIN_PASSWORD;

  if (!name || !email || !password) return { seeded: false, reason: 'admin seed settings are incomplete' };
  if (password.length < 12) throw new Error('BAHO_ADMIN_PASSWORD must be at least 12 characters');

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [62741001]);
      const adminResult = await client.query("SELECT id FROM staff WHERE role = 'admin' LIMIT 1");
      if (adminResult.rows[0]) {
        await client.query('COMMIT');
        return { seeded: false, reason: 'an administrator already exists' };
      }

      const userResult = await client.query(
        'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id, full_name, email, preferred_language',
        [name, email, hashPassword(password)]
      );
      if (!userResult.rows[0]) throw new Error('BAHO_ADMIN_EMAIL already belongs to an account');

      const user = userResult.rows[0];
      await client.query('INSERT INTO staff (user_id, role) VALUES ($1, $2)', [user.id, 'admin']);
      await client.query('COMMIT');
      return {
        seeded: true,
        token: createToken({ id: user.id, email: user.email, role: 'admin' }),
        user: { id: user.id, name: user.full_name, email: user.email, role: 'admin' }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;

    if (inMemoryStore.staff.some((entry) => entry.role === 'admin')) {
      return { seeded: false, reason: 'an administrator already exists' };
    }
    if (inMemoryStore.users.some((entry) => entry.email === email)) {
      throw new Error('BAHO_ADMIN_EMAIL already belongs to an account');
    }

    const id = Date.now();
    inMemoryStore.users.push({ id, fullName: name, email, passwordHash: hashPassword(password) });
    inMemoryStore.staff.push({ id: id + 1, userId: id, role: 'admin' });
    return {
      seeded: true,
      token: createToken({ id, email, role: 'admin' }),
      user: { id, name, email, role: 'admin' },
      demoMode: true
    };
  }
};
