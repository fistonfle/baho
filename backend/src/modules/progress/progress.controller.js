import { pool } from '../../config/db.js';
import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { inMemoryStore } from '../../config/store.js';
import { quizSummary } from '../learning/learning.service.js';

const isConnectionFailure = isDatabaseUnavailable;

const loadCompletedIds = async (userId) => {
  try {
    const result = await pool.query('SELECT content_id FROM progress WHERE user_id = $1 ORDER BY completed_at DESC', [userId]);
    return result.rows.map((row) => Number(row.content_id));
  } catch (error) {
    if (!isConnectionFailure(error)) throw error;
    return inMemoryStore.progress.filter((item) => item.userId === userId).map((item) => item.contentId);
  }
};

// Completed lessons plus the learner's best quiz score per lesson and their average.
export const getProgress = async (req, res) => {
  try {
    const [completedLessonIds, quizScores] = await Promise.all([loadCompletedIds(req.user.id), quizSummary(req.user.id)]);
    const quizAverage = quizScores.length
      ? Math.round((quizScores.reduce((sum, item) => sum + item.score / item.total, 0) / quizScores.length) * 100)
      : null;
    return res.json({ completedLessonIds, quizScores, quizAverage });
  } catch {
    return res.status(503).json({ message: 'Could not load lesson progress' });
  }
};

export const completeLesson = async (req, res) => {
  const contentId = Number(req.params.contentId);
  if (!Number.isInteger(contentId) || contentId <= 0) return res.status(400).json({ message: 'A valid lesson id is required' });
  try {
    const result = await pool.query(
      'INSERT INTO progress (user_id, content_id) SELECT $1, id FROM content WHERE id = $2 AND status = $3 ON CONFLICT (user_id, content_id) DO NOTHING RETURNING content_id',
      [req.user.id, contentId, 'published']
    );
    const check = await pool.query('SELECT content_id FROM progress WHERE user_id = $1 AND content_id = $2', [req.user.id, contentId]);
    if (!check.rows[0]) return res.status(404).json({ message: 'Published lesson not found' });
    return res.json({ message: 'Lesson progress saved', contentId });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not save lesson progress' });
    const published = inMemoryStore.content.some((item) => item.id === contentId && item.status === 'published');
    if (!published) return res.status(404).json({ message: 'Published lesson not found' });
    if (!inMemoryStore.progress.some((item) => item.userId === req.user.id && item.contentId === contentId)) {
      inMemoryStore.progress.push({ userId: req.user.id, contentId });
    }
    return res.json({ message: 'Lesson progress saved in demo mode', contentId });
  }
};
