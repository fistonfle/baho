import { pool } from '../../config/db.js';
import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { inMemoryStore } from '../../config/store.js';

export const getQuestions = async (req, res) => {
  const isStaff = ['admin', 'creator'].includes(req.user?.role);
  try {
    const result = isStaff
      ? await pool.query('SELECT * FROM questions ORDER BY id DESC')
      : await pool.query('SELECT * FROM questions WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
    return res.json({ questions: result.rows });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not load questions' });
    }
    const questions = isStaff
      ? inMemoryStore.questions
      : inMemoryStore.questions.filter((question) => question.userId === req.user.id);
    return res.json({ questions });
  }
};

export const createQuestion = async (req, res) => {
  const { topic, question } = req.body || {};

  if (!topic || !question) {
    return res.status(400).json({ message: 'Topic and question are required' });
  }

  const entry = {
    id: Date.now(),
    userId: req.user.id,
    topic,
    question,
    status: 'Pending'
  };

  try {
    const result = await pool.query(
      'INSERT INTO questions (user_id, topic, question, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, topic.trim(), question.trim(), 'Pending']
    );
    inMemoryStore.questions.unshift(result.rows[0]);
    return res.status(201).json({ message: 'Question submitted successfully', question: result.rows[0] });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save question' });
    }
    inMemoryStore.questions.unshift(entry);
    return res.status(201).json({ message: 'Question submitted successfully', question: entry });
  }
};

export const answerQuestion = async (req, res) => {
  const { answer } = req.body || {};
  const id = Number(req.params.id);
  if (!answer?.trim()) return res.status(400).json({ message: 'Answer is required' });
  const resolvedAnswer = answer.trim();
  try {
    const result = await pool.query(
      'UPDATE questions SET status = $1, answer = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      ['Answered', resolvedAnswer, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Question not found' });
    const index = inMemoryStore.questions.findIndex((entry) => entry.id === id);
    if (index >= 0) inMemoryStore.questions[index] = result.rows[0];
    return res.json({ message: 'Question answered successfully', question: result.rows[0] });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save the answer' });
    }
    const question = inMemoryStore.questions.find((entry) => entry.id === id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    question.status = 'Answered';
    question.answer = resolvedAnswer;
    return res.json({ message: 'Question answered in demo mode', question });
  }
};
