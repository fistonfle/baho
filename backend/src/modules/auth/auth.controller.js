import { pool } from '../../config/db.js';
import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { inMemoryStore } from '../../config/store.js';
import { createToken, hashPassword, verifyPassword } from './security.js';

const normalizedEmail = (email) => String(email || '').trim().toLowerCase();

const publicUser = (user, role = 'learner') => ({
  id: user.id,
  name: user.full_name ?? user.fullName ?? user.name,
  email: user.email,
  language: user.preferred_language ?? user.preferredLanguage ?? 'Kinyarwanda',
  role
});

export const getCreators = async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.full_name AS "fullName", u.email, s.role FROM users u JOIN staff s ON s.user_id = u.id ORDER BY s.role, u.created_at DESC'
    );
    return res.json({ staff: result.rows });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not load creator accounts' });
    }
    const staff = inMemoryStore.users
      .map((user) => {
        const membership = inMemoryStore.staff.find((entry) => entry.userId === user.id);
        return membership ? { id: user.id, fullName: user.fullName, email: user.email, role: membership.role } : null;
      })
      .filter(Boolean);
    return res.json({ staff });
  }
};

export const createCreator = async (req, res) => {
  const { fullName, email, password, role = 'creator' } = req.body || {};

  if (!['creator', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Role must be creator or admin' });
  }

  if (!fullName?.trim() || !email?.trim() || !password || String(password).length < 8) {
    return res.status(400).json({ message: 'Full name, email and a password of at least 8 characters are required' });
  }

  const cleanEmail = normalizedEmail(email);

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows[0]) {
      return res.status(409).json({ message: 'A creator with that email already exists' });
    }

    const client = await pool.connect();
    let user;
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'INSERT INTO users (full_name, email, password_hash, preferred_language) VALUES ($1, $2, $3, $4) RETURNING id, full_name AS "fullName", email, preferred_language AS "preferredLanguage"',
        [String(fullName).trim(), cleanEmail, hashPassword(password), 'Kinyarwanda']
      );
      user = result.rows[0];
      await client.query('INSERT INTO staff (user_id, role) VALUES ($1, $2)', [user.id, role]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return res.status(201).json({
      message: 'Creator created successfully',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role
      }
    });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'A creator with that email already exists' });
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save the creator account' });
    }
    const existing = inMemoryStore.users.find((entry) => entry.email === cleanEmail);
    if (existing) {
      return res.status(409).json({ message: 'A creator with that email already exists' });
    }

    const user = {
      id: Date.now(),
      fullName: String(fullName).trim(),
      email: cleanEmail,
      passwordHash: hashPassword(password),
      preferredLanguage: 'Kinyarwanda'
    };

    inMemoryStore.users.push(user);
    inMemoryStore.staff.push({ id: Date.now() + 1, userId: user.id, role });

    return res.status(201).json({
      message: 'Creator created successfully',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role
      }
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const cleanEmail = normalizedEmail(email);
  try {
    const result = await pool.query(
      "SELECT u.id, u.full_name, u.email, u.password_hash, u.preferred_language, COALESCE(s.role, 'learner') AS role FROM users u LEFT JOIN staff s ON s.user_id = u.id WHERE u.email = $1",
      [cleanEmail]
    );
    const user = result.rows[0];
    if (user && verifyPassword(password, user.password_hash)) {
      const identity = publicUser(user, user.role);
      return res.json({ token: createToken(identity), user: identity });
    }
  } catch (error) {
    const user = inMemoryStore.users.find((entry) => entry.email === cleanEmail);
    if (user && verifyPassword(password, user.passwordHash)) {
      const role = inMemoryStore.staff.find((entry) => entry.userId === user.id)?.role || 'learner';
      const identity = publicUser(user, role);
      return res.json({ token: createToken(identity), user: identity });
    }
  }
  return res.status(401).json({ message: 'Invalid email or password' });
};

export const register = async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name?.trim() || !email?.trim() || !password || String(password).length < 8) {
    return res.status(400).json({ message: 'Name, email and a password of at least 8 characters are required' });
  }
  const cleanEmail = normalizedEmail(email);
  try {
    const result = await pool.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, preferred_language',
      [name.trim(), cleanEmail, hashPassword(password)]
    );
    const identity = publicUser(result.rows[0]);
    return res.status(201).json({ message: 'Registration successful', user: identity, token: createToken(identity) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with that email already exists' });
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save the account' });
    }
    if (inMemoryStore.users.some((user) => user.email === cleanEmail)) {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }
    const user = { id: Date.now(), fullName: name.trim(), email: cleanEmail, passwordHash: hashPassword(password) };
    inMemoryStore.users.push(user);
    const identity = publicUser(user);
    return res.status(201).json({ message: 'Registration successful in demo mode', user: identity, token: createToken(identity) });
  }
};
