import { pool } from '../../config/db.js';
import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { inMemoryStore } from '../../config/store.js';

export const createIssue = async (req, res) => {
  const { title, description } = req.body || {};

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO issues (user_id, title, description, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user?.id || null, title.trim(), description.trim(), 'Open']
    );
    const issue = result.rows[0];
    inMemoryStore.issues.unshift(issue);
    return res.status(201).json({ message: 'Issue submitted successfully', issue });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save issue report' });
    }
    const issue = { id: Date.now(), title: title.trim(), description: description.trim(), status: 'Open', createdAt: new Date().toISOString() };
    inMemoryStore.issues.unshift(issue);
    return res.status(201).json({ message: 'Issue submitted successfully', issue });
  }
};

export const getIssues = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM issues ORDER BY created_at DESC, id DESC');
    return res.json({ issues: result.rows });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not load issue reports' });
    }
    return res.json({ issues: inMemoryStore.issues });
  }
};

export const updateIssueStatus = async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!['Open', 'In review', 'Resolved'].includes(status)) {
    return res.status(400).json({ message: 'Status must be Open, In review or Resolved' });
  }
  try {
    const result = await pool.query('UPDATE issues SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Issue not found' });
    return res.json({ message: 'Issue updated successfully', issue: result.rows[0] });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not update issue report' });
    }
    const issue = inMemoryStore.issues.find((entry) => entry.id === id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    issue.status = status;
    return res.json({ message: 'Issue updated in demo mode', issue });
  }
};
