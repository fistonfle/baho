import crypto from 'crypto';

import { pool } from '../../config/db.js';
import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { inMemoryStore } from '../../config/store.js';
import { loginGuard, PhoneNumber } from './phone.js';
import { createToken, hashPassword, verifyPassword } from './security.js';
import { consumeResetToken, createResetToken, clearResetTokens, tokenTtlMinutes } from './reset.service.js';
import { appBaseUrl, sendMail } from '../mail/mailer.js';
import { setSpecialistTopics, topicsByUser } from '../review/review.service.js';

const staffRoles = ['creator', 'specialist', 'admin'];

const normalizedEmail = (email) => String(email || '').trim().toLowerCase();

const publicUser = (user, role = 'learner') => ({
  id: user.id,
  name: user.full_name ?? user.fullName ?? user.name,
  email: user.email ?? null,
  phone: user.phone ?? null,
  language: user.preferred_language ?? user.preferredLanguage ?? 'Kinyarwanda',
  role
});

export const getCreators = async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.full_name AS "fullName", u.email, s.role FROM users u JOIN staff s ON s.user_id = u.id ORDER BY s.role, u.created_at DESC'
    );
    const topics = await topicsByUser();
    return res.json({ staff: result.rows.map((member) => ({ ...member, topicIds: topics[member.id] || [] })) });
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
    const topics = await topicsByUser();
    return res.json({ staff: staff.map((member) => ({ ...member, topicIds: topics[member.id] || [] })) });
  }
};

// Staff accounts are created without a password. Nobody, the admin included,
// ever knows the new member's password: the row is given a random hash that
// cannot be guessed, and the member chooses their own through an invitation
// link sent to their email address. That link is an ordinary reset token, so
// it is single-use, expires, and is stored only as a hash.
export const createCreator = async (req, res) => {
  const { fullName, email, role = 'creator', topicIds = [] } = req.body || {};

  if (!staffRoles.includes(role)) {
    return res.status(400).json({ message: 'Role must be creator, specialist or admin' });
  }
  if (role === 'specialist' && (!Array.isArray(topicIds) || topicIds.length === 0)) {
    return res.status(400).json({ message: 'Choose at least one topic for the specialist' });
  }

  if (!fullName?.trim() || !email?.trim() || !String(email).includes('@')) {
    return res.status(400).json({ message: 'A full name and an email address are required' });
  }

  // Not a default password and not a placeholder anyone could type: 32 random
  // bytes that are hashed and immediately forgotten, so the only way into the
  // account is the invitation link.
  const unusablePassword = crypto.randomBytes(32).toString('hex');

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
        [String(fullName).trim(), cleanEmail, hashPassword(unusablePassword), 'Kinyarwanda']
      );
      user = result.rows[0];
      await client.query('INSERT INTO staff (user_id, role) VALUES ($1, $2)', [user.id, role]);
      if (role === 'specialist') await setSpecialistTopics(user.id, topicIds, client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const invite = await sendStaffInvite({ id: user.id, email: user.email, fullName: user.fullName }, role);

    return res.status(201).json({
      message: invite.delivered
        ? 'Staff account created. An invitation to choose a password has been emailed.'
        : 'Staff account created. Email is not configured, so send them the invitation link below.',
      invite,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role,
        topicIds: role === 'specialist' ? topicIds.map(Number) : []
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
      passwordHash: hashPassword(unusablePassword),
      preferredLanguage: 'Kinyarwanda'
    };

    inMemoryStore.users.push(user);
    inMemoryStore.staff.push({ id: Date.now() + 1, userId: user.id, role });
    if (role === 'specialist') await setSpecialistTopics(user.id, topicIds);

    const invite = await sendStaffInvite(user, role);

    return res.status(201).json({
      message: invite.delivered
        ? 'Staff account created. An invitation to choose a password has been emailed.'
        : 'Staff account created. Email is not configured, so send them the invitation link below.',
      invite,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role,
        topicIds: role === 'specialist' ? topicIds.map(Number) : []
      }
    });
  }
};

// Body: { identifier, password }. The identifier is a phone number (learners)
// or an email address (staff); `email` and `phone` are accepted too.
export const login = async (req, res) => {
  const { identifier = req.body?.phone ?? req.body?.email, password } = req.body || {};
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Phone number or email and a PIN or password are required' });
  }

  const byEmail = String(identifier).includes('@');
  const key = byEmail ? normalizedEmail(identifier) : PhoneNumber.normalize(identifier);
  if (!key) return res.status(400).json({ message: 'Enter a valid Rwandan phone number' });
  if (loginGuard.isLocked(key)) {
    return res.status(429).json({ message: 'Too many wrong attempts. Try again in 15 minutes' });
  }

  const column = byEmail ? 'email' : 'phone';
  let user = null;
  let role = 'learner';
  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.password_hash, u.preferred_language, COALESCE(s.role, 'learner') AS role
       FROM users u LEFT JOIN staff s ON s.user_id = u.id WHERE u.${column} = $1`,
      [key]
    );
    user = result.rows[0] ? { ...result.rows[0], passwordHash: result.rows[0].password_hash } : null;
    role = user?.role ?? role;
  } catch {
    user = inMemoryStore.users.find((entry) => entry[column] === key) ?? null;
    role = inMemoryStore.staff.find((entry) => entry.userId === user?.id)?.role || 'learner';
  }

  if (user && verifyPassword(password, user.passwordHash)) {
    loginGuard.clear(key);
    const identity = publicUser(user, role);
    return res.json({ token: createToken(identity), user: identity });
  }
  loginGuard.recordFailure(key);
  return res.status(401).json({ message: 'Invalid phone number, email or PIN' });
};

// Learners register with a name, a Rwandan phone number and a 4-6 digit PIN.
export const register = async (req, res) => {
  const { name, phone, pin = req.body?.password } = req.body || {};
  const cleanPhone = PhoneNumber.normalize(phone);
  if (!name?.trim() || !cleanPhone || !PhoneNumber.isPin(pin)) {
    return res.status(400).json({ message: 'A name, a valid Rwandan phone number and a PIN of 4 to 6 digits are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO users (full_name, phone, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, phone, preferred_language',
      [name.trim(), cleanPhone, hashPassword(pin)]
    );
    const identity = publicUser(result.rows[0]);
    return res.status(201).json({ message: 'Registration successful', user: identity, token: createToken(identity) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with that phone number already exists' });
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save the account' });
    }
    if (inMemoryStore.users.some((user) => user.phone === cleanPhone)) {
      return res.status(409).json({ message: 'An account with that phone number already exists' });
    }
    const user = { id: Date.now(), fullName: name.trim(), email: null, phone: cleanPhone, passwordHash: hashPassword(pin), createdAt: new Date().toISOString() };
    inMemoryStore.users.push(user);
    const identity = publicUser(user);
    return res.status(201).json({ message: 'Registration successful in demo mode', user: identity, token: createToken(identity) });
  }
};

// --- Password reset -------------------------------------------------------
// Staff sign in with an email address, so a forgotten password is recovered by
// email. Learners sign in with a phone number and have no address on file, so
// these endpoints only ever match a staff account; recovering a forgotten PIN
// is not built yet.

const resetLink = (token) => `${appBaseUrl()}/?reset=${token}`;

const findUserByEmail = async (email) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name AS "fullName", email FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] ?? null;
  } catch {
    return inMemoryStore.users.find((entry) => entry.email === email) ?? null;
  }
};

const resetEmail = (name, link) => ({
  subject: 'Reset your Baho password',
  text: [
    `Hello ${name || 'there'},`,
    '',
    'Someone asked to reset the password of the Baho staff account registered with this email address.',
    `Open the link below within ${tokenTtlMinutes} minutes to choose a new password:`,
    '',
    link,
    '',
    'The link can be used once. If you did not ask for this, ignore this message: your password stays as it is.',
    '',
    'Baho — baho.filito.rw'
  ].join('\n'),
  html: `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#14304d;line-height:1.6">
      <p>Hello ${name || 'there'},</p>
      <p>Someone asked to reset the password of the Baho staff account registered with this email address.</p>
      <p>
        <a href="${link}" style="display:inline-block;background:#0b5845;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none">
          Choose a new password
        </a>
      </p>
      <p>The link works for ${tokenTtlMinutes} minutes and can be used once. If the button does not open, copy this address into your browser:</p>
      <p style="word-break:break-all"><a href="${link}">${link}</a></p>
      <p>If you did not ask for this, ignore this message: your password stays as it is.</p>
      <p style="color:#5b6b7a">Baho — baho.filito.rw</p>
    </div>`
});

const roleLabel = { creator: 'writer', specialist: 'specialist', admin: 'administrator' };

const inviteEmail = (name, link, role) => ({
  subject: 'Your Baho staff account: choose your password',
  text: [
    `Hello ${name || 'there'},`,
    '',
    `An administrator has created a Baho staff account for you as a ${roleLabel[role] || role}.`,
    'The account has no password yet, and nobody else can sign in to it.',
    `Open the link below within ${tokenTtlMinutes} minutes to choose your own password:`,
    '',
    link,
    '',
    'The link can be used once. If it expires, open Baho, choose "Forgot password" and enter this email address to get a new one.',
    '',
    'Baho \u2014 baho.filito.rw'
  ].join('\n'),
  html: `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#14304d;line-height:1.6">
      <p>Hello ${name || 'there'},</p>
      <p>An administrator has created a Baho staff account for you as a ${roleLabel[role] || role}. The account has no password yet, and nobody else can sign in to it.</p>
      <p>
        <a href="${link}" style="display:inline-block;background:#0b5845;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none">
          Choose your password
        </a>
      </p>
      <p>The link works for ${tokenTtlMinutes} minutes and can be used once. If the button does not open, copy this address into your browser:</p>
      <p style="word-break:break-all"><a href="${link}">${link}</a></p>
      <p>If the link has expired, open Baho, choose &ldquo;Forgot password&rdquo; and enter this email address to get a new one.</p>
      <p style="color:#5b6b7a">Baho \u2014 baho.filito.rw</p>
    </div>`
});

// Issues the invitation that lets a new staff member set their first password.
// The link is returned to the caller only when email is not configured and the
// server is not in production, which is what makes local setup possible
// without an SMTP account. In production it is sent and never returned.
const sendStaffInvite = async (user, role) => {
  const { token } = await createResetToken(user.id);
  const link = resetLink(token);
  const sent = await sendMail({ to: user.email, ...inviteEmail(user.fullName, link, role) });
  const invite = { delivered: Boolean(sent.delivered), expiresInMinutes: tokenTtlMinutes };
  if (!sent.delivered && process.env.NODE_ENV !== 'production') invite.link = link;
  return invite;
};

// The answer is the same whether or not the address belongs to an account, so
// this endpoint cannot be used to find out who has one.
export const requestPasswordReset = async (req, res) => {
  const email = normalizedEmail(req.body?.email);
  const answer = { message: 'If that email address belongs to a staff account, a reset link is on its way.' };

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Enter the email address of your staff account' });
  }

  const user = await findUserByEmail(email);
  if (!user) return res.json(answer);

  const { token } = await createResetToken(user.id);
  const link = resetLink(token);
  const message = resetEmail(user.fullName ?? user.full_name, link);
  const result = await sendMail({ to: email, ...message });

  // In development, with no SMTP server configured, the link is returned so the
  // flow can be finished without email. Never in production.
  if (!result.delivered && process.env.NODE_ENV !== 'production') {
    return res.json({ ...answer, resetLink: link, delivered: false });
  }
  return res.json(answer);
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ message: 'The reset link and a new password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ message: 'The new password must be at least 8 characters' });
  }

  const userId = await consumeResetToken(token);
  if (!userId) {
    return res.status(400).json({ message: 'This reset link has expired or has already been used. Ask for a new one.' });
  }

  const passwordHash = hashPassword(password);
  let email = null;
  try {
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING email',
      [passwordHash, userId]
    );
    if (!result.rows[0]) return res.status(400).json({ message: 'That account no longer exists' });
    email = result.rows[0].email;
  } catch {
    const user = inMemoryStore.users.find((entry) => entry.id === userId);
    if (!user) return res.status(400).json({ message: 'That account no longer exists' });
    user.passwordHash = passwordHash;
    email = user.email;
  }

  // Any other link that was sent stops working, and a lockout from the failed
  // attempts that led here is lifted so the new password can be used at once.
  await clearResetTokens(userId);
  if (email) loginGuard.clear(email);

  return res.json({ message: 'Your password has been changed. Sign in with the new one.' });
};

// --- Learner PIN recovery -------------------------------------------------
// A learner signs in with a phone number and a PIN and has no email address,
// so there is nowhere to send a reset link. Instead an administrator finds the
// account by phone number and sets a new PIN, which is shown once so it can be
// read out to the learner. Nothing else about the account changes, and the
// health profile is encrypted on the learner's own device either way.

const publicLearner = (user) => ({
  id: user.id,
  fullName: user.fullName ?? user.full_name,
  phone: user.phone,
  createdAt: user.createdAt ?? user.created_at ?? null
});

// A PIN an administrator can read out over the phone: 5 digits, never starting
// with a zero so it cannot be written down wrongly.
const generatePin = () => String(crypto.randomInt(10000, 100000));

export const getLearners = async (req, res) => {
  const search = String(req.query?.search || '').trim();
  const digits = search.replace(/\D/g, '');
  const like = `%${search}%`;
  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name AS "fullName", u.phone, u.created_at AS "createdAt"
       FROM users u LEFT JOIN staff s ON s.user_id = u.id
       WHERE s.id IS NULL AND u.phone IS NOT NULL
         AND ($1 = '' OR u.full_name ILIKE $2 OR u.phone LIKE $3)
       ORDER BY u.created_at DESC LIMIT 50`,
      [search, like, digits ? `%${digits}%` : '%']
    );
    return res.json({ learners: result.rows });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not load learner accounts' });
    }
    const staffIds = new Set(inMemoryStore.staff.map((entry) => entry.userId));
    const learners = inMemoryStore.users
      .filter((user) => user.phone && !staffIds.has(user.id))
      .filter((user) => {
        if (!search) return true;
        const name = String(user.fullName || '').toLowerCase();
        return name.includes(search.toLowerCase()) || (digits && String(user.phone).includes(digits));
      })
      .slice(0, 50)
      .map(publicLearner);
    return res.json({ learners });
  }
};

export const resetLearnerPin = async (req, res) => {
  const id = Number(req.params.id);
  const requested = req.body?.pin;
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Unknown learner' });
  if (requested !== undefined && !PhoneNumber.isPin(requested)) {
    return res.status(400).json({ message: 'A PIN is 4 to 6 digits' });
  }

  const pin = requested === undefined ? generatePin() : String(requested);
  const passwordHash = hashPassword(pin);

  let learner = null;
  try {
    const found = await pool.query(
      `SELECT u.id, u.full_name AS "fullName", u.phone, s.id AS "staffId"
       FROM users u LEFT JOIN staff s ON s.user_id = u.id WHERE u.id = $1`,
      [id]
    );
    const row = found.rows[0];
    if (!row) return res.status(404).json({ message: 'No learner with that id' });
    if (row.staffId) return res.status(400).json({ message: 'That is a staff account; it resets its password by email' });
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
    learner = row;
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not change the PIN' });
    }
    const user = inMemoryStore.users.find((entry) => entry.id === id);
    if (!user) return res.status(404).json({ message: 'No learner with that id' });
    if (inMemoryStore.staff.some((entry) => entry.userId === id)) {
      return res.status(400).json({ message: 'That is a staff account; it resets its password by email' });
    }
    user.passwordHash = passwordHash;
    learner = user;
  }

  // Wrong PINs before the call to the administrator may have locked the number.
  if (learner.phone) loginGuard.clear(learner.phone);

  return res.json({
    message: 'The PIN has been changed. Read it to the learner now; it is not shown again.',
    pin,
    learner: publicLearner(learner)
  });
};

// --- Changing your own PIN or password ------------------------------------
// A learner given a temporary PIN by an administrator should be able to pick
// their own, so the administrator does not keep knowing it. The same endpoint
// serves staff, who send a password instead; what counts as valid follows the
// kind of account, not what the caller claims to be.
export const changePassword = async (req, res) => {
  const { current, next } = req.body || {};
  if (!current || !next) {
    return res.status(400).json({ message: 'Send the current and the new PIN or password' });
  }

  let user = null;
  try {
    const result = await pool.query(
      'SELECT id, email, phone, password_hash AS "passwordHash" FROM users WHERE id = $1',
      [req.user.id]
    );
    user = result.rows[0] ?? null;
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not change it just now' });
    }
    user = inMemoryStore.users.find((entry) => entry.id === req.user.id) ?? null;
  }
  if (!user) return res.status(404).json({ message: 'That account no longer exists' });

  const usesPin = Boolean(user.phone) && !user.email;
  if (usesPin ? !PhoneNumber.isPin(next) : String(next).length < 8) {
    return res.status(400).json({
      message: usesPin ? 'A PIN is 4 to 6 digits' : 'The new password must be at least 8 characters'
    });
  }
  if (String(current) === String(next)) {
    return res.status(400).json({ message: 'The new one must be different from the current one' });
  }
  if (!verifyPassword(current, user.passwordHash)) {
    return res.status(401).json({ message: usesPin ? 'That is not your current PIN' : 'That is not your current password' });
  }

  const passwordHash = hashPassword(next);
  try {
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not change it just now' });
    }
    const stored = inMemoryStore.users.find((entry) => entry.id === user.id);
    if (stored) stored.passwordHash = passwordHash;
  }

  // Any reset link that is still in an inbox stops working.
  await clearResetTokens(user.id);
  return res.json({ message: usesPin ? 'Your PIN has been changed' : 'Your password has been changed' });
};

// A learner may add an email address so Baho can tell them a reply to their
// question has arrived. It is optional, it can be removed at any time, and the
// message it carries says only that a reply is waiting: the disease, the
// question and the answer never leave the app. This is a stand-in until SMS is
// available, which is the channel a rural learner actually reads.
export const updateMyEmail = async (req, res) => {
  const raw = req.body?.email;
  const clearing = raw === null || String(raw ?? '').trim() === '';
  const email = clearing ? null : normalizedEmail(raw);

  if (!clearing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address' });
  }

  const done = (user) => res.json({
    message: clearing ? 'Your email address has been removed' : 'Your email address has been saved',
    user: publicUser(user, 'learner')
  });

  try {
    const result = await pool.query(
      'UPDATE users SET email = $1 WHERE id = $2 RETURNING id, full_name, email, phone, preferred_language',
      [email, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Account not found' });
    return done(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'That email address is already used by another account' });
    }
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save the email address' });
    }
    const user = inMemoryStore.users.find((entry) => entry.id === req.user.id);
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (email && inMemoryStore.users.some((entry) => entry.id !== user.id && entry.email === email)) {
      return res.status(409).json({ message: 'That email address is already used by another account' });
    }
    user.email = email;
    return done(user);
  }
};
