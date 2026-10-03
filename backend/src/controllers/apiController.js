import { inMemoryStore } from '../config/store.js';
import { pool, isDbConnected } from '../config/db.js';

const getCategories = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    return res.json({ categories: result.rows.length ? result.rows : inMemoryStore.categories });
  } catch (error) {
    return res.json({ categories: inMemoryStore.categories });
  }
};

const getContent = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM content ORDER BY id ASC');
    return res.json({ content: result.rows.length ? result.rows : inMemoryStore.content });
  } catch (error) {
    return res.json({ content: inMemoryStore.content });
  }
};

const getContentById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM content WHERE id = $1', [Number(req.params.id)]);
    if (!result.rows[0]) {
      const fallback = inMemoryStore.content.find((entry) => entry.id === Number(req.params.id));
      if (!fallback) {
        return res.status(404).json({ message: 'Content not found' });
      }
      return res.json({ content: fallback });
    }
    return res.json({ content: result.rows[0] });
  } catch (error) {
    const fallback = inMemoryStore.content.find((entry) => entry.id === Number(req.params.id));
    if (!fallback) {
      return res.status(404).json({ message: 'Content not found' });
    }
    return res.json({ content: fallback });
  }
};

const getFaqs = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM faqs ORDER BY id ASC');
    return res.json({ faqs: result.rows.length ? result.rows : inMemoryStore.faqs });
  } catch (error) {
    return res.json({ faqs: inMemoryStore.faqs });
  }
};

const getQuestions = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM questions ORDER BY id DESC');
    return res.json({ questions: result.rows.length ? result.rows : inMemoryStore.questions });
  } catch (error) {
    return res.json({ questions: inMemoryStore.questions });
  }
};

const createQuestion = async (req, res) => {
  const { topic, question } = req.body || {};

  if (!topic || !question) {
    return res.status(400).json({ message: 'Topic and question are required' });
  }

  const entry = {
    id: Date.now(),
    topic,
    question,
    status: 'Pending'
  };

  inMemoryStore.questions.unshift(entry);

  try {
    const result = await pool.query(
      'INSERT INTO questions (topic, question, status) VALUES ($1, $2, $3) RETURNING *',
      [topic, question, 'Pending']
    );
    return res.status(201).json({ message: 'Question submitted successfully', question: result.rows[0] });
  } catch (error) {
    return res.status(201).json({ message: 'Question submitted successfully', question: entry });
  }
};

const answerQuestion = async (req, res) => {
  const { answer } = req.body || {};
  const id = Number(req.params.id);
  const question = inMemoryStore.questions.find((entry) => entry.id === id);

  if (!question) {
    return res.status(404).json({ message: 'Question not found' });
  }

  const resolvedAnswer = answer || 'Icyo wibaza cyatanzweho ibisubizo by\'ubuzima. Ibi ntibikwiye gufatwa nk\'ubuvuzi bukorwa n\'umushami w\'ubuzima, ariko ni ibitekerezo by\'imfashanyo.';

  question.status = 'Answered';
  question.answer = resolvedAnswer;

  try {
    const result = await pool.query(
      'UPDATE questions SET status = $1, answer = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      ['Answered', resolvedAnswer, id]
    );
    return res.json({ message: 'Question answered successfully', question: result.rows[0] || question });
  } catch (error) {
    return res.json({ message: 'Question answered successfully', question });
  }
};

const createIssue = async (req, res) => {
  const { title, description } = req.body || {};

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  const issue = {
    id: Date.now(),
    title,
    description,
    status: 'Open',
    createdAt: new Date().toISOString()
  };

  inMemoryStore.issues.unshift(issue);

  try {
    const result = await pool.query(
      'INSERT INTO issues (title, description, status) VALUES ($1, $2, $3) RETURNING *',
      [title, description, 'Open']
    );
    return res.status(201).json({ message: 'Issue submitted successfully', issue: result.rows[0] || issue });
  } catch (error) {
    return res.status(201).json({ message: 'Issue submitted successfully', issue });
  }
};

const login = (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  return res.json({
    token: 'demo-token',
    user: {
      id: 1,
      name: 'Fiston',
      email,
      language: 'Kinyarwanda'
    }
  });
};

const register = (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  return res.status(201).json({
    message: 'Registration successful',
    user: { id: Date.now(), name, email }
  });
};

const getAdminContent = async (_req, res) => {
  const drafts = [
    { id: 101, title: 'Ibikorwa byiza byo kugabanya umunyu', status: 'draft' },
    { id: 102, title: 'Uko wamenya ibimenyetso bya Diyabete', status: 'review' }
  ];

  try {
    const result = await pool.query('SELECT * FROM content ORDER BY id ASC');
    return res.json({ drafts, published: result.rows.length ? result.rows : inMemoryStore.content });
  } catch (error) {
    return res.json({ drafts, published: inMemoryStore.content });
  }
};

const getHealth = (_req, res) => {
  res.json({
    status: 'ok',
    service: 'baho-backend',
    database: isDbConnected() ? 'postgres-connected' : 'demo-mode'
  });
};

export {
  getHealth,
  getCategories,
  getContent,
  getContentById,
  getFaqs,
  getQuestions,
  createQuestion,
  answerQuestion,
  createIssue,
  login,
  register,
  getAdminContent
};
