import { pool } from '../../config/db.js';
import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { inMemoryStore } from '../../config/store.js';

const isConnectionFailure = isDatabaseUnavailable;
const mapReminder = (row) => ({
  id: row.id,
  time: String(row.reminder_time ?? row.time).slice(0, 5),
  label: row.title ?? row.label
});

export const getReminders = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, title, reminder_time FROM reminders WHERE user_id = $1 ORDER BY reminder_time, id', [req.user.id]);
    return res.json({ reminders: result.rows.map(mapReminder) });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not load reminders' });
    return res.json({ reminders: inMemoryStore.reminders.filter((item) => item.userId === req.user.id).map(mapReminder) });
  }
};

export const createReminder = async (req, res) => {
  const { time, label } = req.body || {};
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '') || !label?.trim()) {
    return res.status(400).json({ message: 'A valid time and reminder label are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO reminders (user_id, title, reminder_time) VALUES ($1, $2, $3) RETURNING id, title, reminder_time',
      [req.user.id, label.trim(), time]
    );
    return res.status(201).json({ message: 'Reminder saved', reminder: mapReminder(result.rows[0]) });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not save reminder' });
    const reminder = { id: Date.now(), userId: req.user.id, title: label.trim(), reminder_time: time };
    inMemoryStore.reminders.push(reminder);
    return res.status(201).json({ message: 'Reminder saved in demo mode', reminder: mapReminder(reminder) });
  }
};

export const deleteReminder = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await pool.query('DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Reminder not found' });
    return res.json({ message: 'Reminder deleted' });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not delete reminder' });
    const previousLength = inMemoryStore.reminders.length;
    inMemoryStore.reminders = inMemoryStore.reminders.filter((item) => item.id !== id || item.userId !== req.user.id);
    if (previousLength === inMemoryStore.reminders.length) return res.status(404).json({ message: 'Reminder not found' });
    return res.json({ message: 'Reminder deleted in demo mode' });
  }
};
