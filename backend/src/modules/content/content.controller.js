import { pool } from '../../config/db.js';
import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { inMemoryStore } from '../../config/store.js';
import { attachLearningData, saveCurriculumLinks, saveQuiz, validateQuiz } from '../learning/learning.service.js';

const statusValues = new Set(['draft', 'review', 'published', 'rejected']);
const isConnectionFailure = isDatabaseUnavailable;
const mapContent = (row) => ({
  id: row.id,
  categoryId: row.category_id ?? row.categoryId,
  creatorId: row.creator_id ?? row.creatorId,
  title: row.title,
  summary: row.summary,
  body: row.body,
  audioUrl: row.audio_url ?? row.audioUrl ?? '',
  imageUrl: row.image_url ?? row.imageUrl ?? '',
  status: row.status
});

// Saves the optional quiz and learning-path links sent with a lesson.
const saveLearningInput = async (contentId, body) => {
  if (Array.isArray(body?.quiz)) await saveQuiz(contentId, body.quiz);
  if (Array.isArray(body?.curriculumIds)) {
    await saveCurriculumLinks(contentId, body.curriculumIds.map(Number).filter((id) => Number.isInteger(id) && id > 0));
  }
};

const learningInputError = (body) => {
  const quizError = validateQuiz(body?.quiz);
  if (quizError) return quizError;
  if (body?.curriculumIds !== undefined && !Array.isArray(body.curriculumIds)) return 'curriculumIds must be a list';
  return null;
};

export const getCategories = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    return res.json({ categories: result.rows.length ? result.rows : inMemoryStore.categories });
  } catch (error) {
    return res.json({ categories: inMemoryStore.categories });
  }
};

export const getContent = async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM content WHERE status = 'published' ORDER BY id ASC");
    return res.json({ content: await attachLearningData(result.rows.map(mapContent)) });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not load published content' });
    const published = inMemoryStore.content.filter((entry) => entry.status === 'published').map(mapContent);
    return res.json({ content: await attachLearningData(published) });
  }
};

export const getContentById = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM content WHERE id = $1 AND status = 'published'", [Number(req.params.id)]);
    if (!result.rows[0]) {
      const fallback = inMemoryStore.content.find((entry) => entry.id === Number(req.params.id) && entry.status === 'published');
      if (!fallback) {
        return res.status(404).json({ message: 'Content not found' });
      }
      return res.json({ content: fallback });
    }
    return res.json({ content: result.rows[0] });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not load content' });
    const fallback = inMemoryStore.content.find((entry) => entry.id === Number(req.params.id) && entry.status === 'published');
    if (!fallback) {
      return res.status(404).json({ message: 'Content not found' });
    }
    return res.json({ content: fallback });
  }
};

export const getFaqs = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM faqs ORDER BY id ASC');
    return res.json({ faqs: result.rows.length ? result.rows : inMemoryStore.faqs });
  } catch (error) {
    return res.json({ faqs: inMemoryStore.faqs });
  }
};

export const createFaq = async (req, res) => {
  const { question, answer } = req.body || {};
  if (!question?.trim() || !answer?.trim()) return res.status(400).json({ message: 'Question and answer are required' });
  try {
    const result = await pool.query('INSERT INTO faqs (question, answer) VALUES ($1, $2) RETURNING *', [question.trim(), answer.trim()]);
    inMemoryStore.faqs.push(result.rows[0]);
    return res.status(201).json({ message: 'FAQ created successfully', faq: result.rows[0] });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not save FAQ' });
    const faq = { id: Date.now(), question: question.trim(), answer: answer.trim() };
    inMemoryStore.faqs.push(faq);
    return res.status(201).json({ message: 'FAQ created in demo mode', faq });
  }
};

export const updateFaq = async (req, res) => {
  const id = Number(req.params.id);
  const { question, answer } = req.body || {};
  if (!Number.isInteger(id) || id <= 0 || !question?.trim() || !answer?.trim()) {
    return res.status(400).json({ message: 'A valid FAQ id, question and answer are required' });
  }
  try {
    const result = await pool.query('UPDATE faqs SET question = $1, answer = $2 WHERE id = $3 RETURNING *', [question.trim(), answer.trim(), id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'FAQ not found' });
    return res.json({ message: 'FAQ updated successfully', faq: result.rows[0] });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not update FAQ' });
    const faq = inMemoryStore.faqs.find((item) => item.id === id);
    if (!faq) return res.status(404).json({ message: 'FAQ not found' });
    faq.question = question.trim();
    faq.answer = answer.trim();
    return res.json({ message: 'FAQ updated in demo mode', faq });
  }
};

export const deleteFaq = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await pool.query('DELETE FROM faqs WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'FAQ not found' });
    inMemoryStore.faqs = inMemoryStore.faqs.filter((item) => item.id !== id);
    return res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not delete FAQ' });
    const before = inMemoryStore.faqs.length;
    inMemoryStore.faqs = inMemoryStore.faqs.filter((item) => item.id !== id);
    if (before === inMemoryStore.faqs.length) return res.status(404).json({ message: 'FAQ not found' });
    return res.json({ message: 'FAQ deleted in demo mode' });
  }
};

export const getAdminContent = async (req, res) => {
  try {
    const result = req.user?.role === 'creator'
      ? await pool.query('SELECT * FROM content WHERE creator_id = $1 ORDER BY created_at DESC, id DESC', [req.user.id])
      : await pool.query('SELECT * FROM content ORDER BY created_at DESC, id DESC');
    return res.json({ content: await attachLearningData(result.rows.map(mapContent), { includeLinks: true }) });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not load admin content' });
    const content = req.user?.role === 'creator'
      ? inMemoryStore.content.filter((entry) => entry.creatorId === req.user.id)
      : [...inMemoryStore.content];
    return res.json({ content: await attachLearningData(content.map(mapContent), { includeLinks: true }) });
  }
};

export const createContent = async (req, res) => {
  const { categoryId, title, summary = '', body, audioUrl = '', imageUrl = '' } = req.body || {};
  const inputError = learningInputError(req.body);
  if (inputError) return res.status(400).json({ message: inputError });
  const status = req.user?.role === 'admin'
    ? (req.body?.status || 'draft')
    : (req.body?.status === 'draft' ? 'draft' : 'review');

  if (!Number.isInteger(Number(categoryId)) || !title?.trim() || !body?.trim()) {
    return res.status(400).json({ message: 'Category, title and body are required' });
  }
  if (!statusValues.has(status)) return res.status(400).json({ message: 'Status must be draft, review, published or rejected' });

  const entry = {
    id: null,
    creatorId: req.user?.id ?? null,
    categoryId: Number(categoryId),
    title: String(title).trim(),
    summary: String(summary).trim(),
    body: String(body).trim(),
    audioUrl: String(audioUrl || '').trim(),
    imageUrl: String(imageUrl || '').trim(),
    status: String(status).trim() || 'draft'
  };

  try {
    const result = await pool.query(
      'INSERT INTO content (category_id, creator_id, title, summary, body, audio_url, image_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [entry.categoryId, req.user?.id || null, entry.title, entry.summary, entry.body, entry.audioUrl || null, entry.imageUrl || null, entry.status]
    );

    const content = mapContent(result.rows[0]);
    await saveLearningInput(content.id, req.body);
    const [withLearning] = await attachLearningData([content], { includeLinks: true });
    return res.status(201).json({ message: 'Content created successfully', content: withLearning });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not save content' });
    entry.id = Date.now();
    inMemoryStore.content.unshift(entry);
    await saveLearningInput(entry.id, req.body);
    const [withLearning] = await attachLearningData([entry], { includeLinks: true });
    return res.status(201).json({ message: 'Content created successfully', content: withLearning });
  }
};

export const updateContent = async (req, res) => {
  const id = Number(req.params.id);
  const { title, summary = '', body, audioUrl = '', imageUrl = '', categoryId, status } = req.body || {};
  if (!Number.isInteger(id) || id <= 0 || !title?.trim() || !body?.trim()) {
    return res.status(400).json({ message: 'A valid content id, title and body are required' });
  }
  const inputError = learningInputError(req.body);
  if (inputError) return res.status(400).json({ message: inputError });
  if (status && !statusValues.has(status)) return res.status(400).json({ message: 'Invalid content status' });
  if (req.user?.role === 'creator' && status && !['draft', 'review'].includes(status)) {
    return res.status(403).json({ message: 'Creators may only save drafts or submit content for review' });
  }
  try {
    const existingResult = req.user?.role === 'creator'
      ? await pool.query('SELECT id, creator_id, status FROM content WHERE id = $1', [id])
      : await pool.query('SELECT id, creator_id, status FROM content WHERE id = $1', [id]);
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ message: 'Content not found' });
    if (req.user?.role === 'creator' && Number(existing.creator_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'You may only edit your own content' });
    }
    if (req.user?.role === 'creator' && !['draft', 'review', 'rejected'].includes(existing.status)) {
      return res.status(403).json({ message: 'Published content cannot be edited by creators' });
    }
    const result = await pool.query(
      `UPDATE content SET category_id = $1, title = $2, summary = $3, body = $4, audio_url = $5, image_url = $6, status = COALESCE($7, status), updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *`,
      [Number(categoryId), title.trim(), summary.trim(), body.trim(), audioUrl.trim() || null, imageUrl.trim() || null, status || null, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Content not found' });
    await saveLearningInput(id, req.body);
    const [content] = await attachLearningData([mapContent(result.rows[0])], { includeLinks: true });
    return res.json({ message: 'Content updated successfully', content });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not update content' });
    const index = inMemoryStore.content.findIndex((entry) => entry.id === id);
    if (index < 0) return res.status(404).json({ message: 'Content not found' });
    if (req.user?.role === 'creator' && Number(inMemoryStore.content[index].creatorId) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'You may only edit your own content' });
    }
    if (req.user?.role === 'creator' && !['draft', 'review', 'rejected'].includes(inMemoryStore.content[index].status)) {
      return res.status(403).json({ message: 'Published content cannot be edited by creators' });
    }
    const existing = inMemoryStore.content[index];
    const nextStatus = status && ['draft', 'review'].includes(status) ? status : existing.status;
    inMemoryStore.content[index] = {
      ...existing,
      ...mapContent({
        ...req.body,
        id: existing.id,
        creatorId: existing.creatorId,
        categoryId: Number(categoryId),
        audioUrl: audioUrl.trim(),
        imageUrl: imageUrl.trim(),
        status: nextStatus
      }),
      id: existing.id,
      creatorId: existing.creatorId,
      status: nextStatus
    };
    await saveLearningInput(id, req.body);
    const [content] = await attachLearningData([inMemoryStore.content[index]], { includeLinks: true });
    return res.json({ message: 'Content updated in demo mode', content });
  }
};

export const deleteContent = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await pool.query('DELETE FROM content WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Content not found' });
    inMemoryStore.content = inMemoryStore.content.filter((entry) => entry.id !== id);
    return res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not delete content' });
    const before = inMemoryStore.content.length;
    inMemoryStore.content = inMemoryStore.content.filter((entry) => entry.id !== id);
    if (before === inMemoryStore.content.length) return res.status(404).json({ message: 'Content not found' });
    return res.json({ message: 'Content deleted in demo mode' });
  }
};

export const updateContentStatus = async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!Number.isInteger(id) || id <= 0 || !statusValues.has(status)) {
    return res.status(400).json({ message: 'A valid content id and status are required' });
  }
  try {
    const result = await pool.query(
      'UPDATE content SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Content not found' });
    return res.json({ message: 'Content status updated successfully', content: mapContent(result.rows[0]) });
  } catch (error) {
    if (!isConnectionFailure(error)) return res.status(503).json({ message: 'Could not update content status' });
    const content = inMemoryStore.content.find((entry) => entry.id === id);
    if (!content) return res.status(404).json({ message: 'Content not found' });
    content.status = status;
    return res.json({ message: 'Content status updated in demo mode', content });
  }
};
