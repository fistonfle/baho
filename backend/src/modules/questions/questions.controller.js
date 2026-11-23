import { pool } from '../../config/db.js';
import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { inMemoryStore } from '../../config/store.js';
import { getSpecialistTopics } from '../review/review.service.js';
import { appBaseUrl, sendMail } from '../mail/mailer.js';
import { sendPush } from '../push/push.service.js';

// Question flow: Pending -> Drafted (writer) -> Answered (specialist approved).
export const QuestionStatus = Object.freeze({
  pending: 'Pending',
  drafted: 'Drafted',
  answered: 'Answered'
});

const categoryIdForTopic = async (topic) => {
  const name = String(topic || '').trim().toLowerCase();
  if (!name) return null;
  try {
    const result = await pool.query('SELECT id FROM categories WHERE LOWER(name) = $1', [name]);
    return result.rows[0]?.id ?? null;
  } catch {
    return inMemoryStore.categories.find((entry) => String(entry.name).toLowerCase() === name)?.id ?? null;
  }
};

const isMySpecialty = async (userId, topic) => {
  const categoryId = await categoryIdForTopic(topic);
  if (categoryId === null) return false;
  return (await getSpecialistTopics(userId)).includes(Number(categoryId));
};

// Nobody on the staff side gets the learner's id: the question is public, the asker is not.
const withoutTheAsker = (question) => {
  const { user_id: _dbOwner, userId: _owner, ...rest } = question;
  return rest;
};

// What a lesson page shows: the question, the approved answer, nothing about who asked.
const publicShape = (question) => ({
  id: question.id,
  contentId: question.content_id ?? question.contentId ?? null,
  question: question.question,
  answer: question.answer,
  answeredAt: question.updated_at ?? question.updatedAt ?? null
});

// Answered questions on one lesson, for anyone reading it, signed in or not.
export const getLessonQuestions = async (req, res) => {
  const lessonId = Number(req.params.id);
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return res.status(400).json({ message: 'A valid lesson id is required' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM questions WHERE content_id = $1 AND status = $2 ORDER BY updated_at DESC, id DESC',
      [lessonId, QuestionStatus.answered]
    );
    return res.json({ questions: rows.map(publicShape) });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) return res.status(503).json({ message: 'Could not load questions' });
    const answered = inMemoryStore.questions.filter((entry) =>
      Number(entry.contentId) === lessonId && entry.status === QuestionStatus.answered);
    return res.json({ questions: answered.map(publicShape) });
  }
};

const keepMyDiseases = async (userId, questions) => {
  const allowed = new Set((await getSpecialistTopics(userId)).map(Number));
  const kept = [];
  for (const question of questions) {
    const categoryId = await categoryIdForTopic(question.topic);
    if (categoryId !== null && allowed.has(Number(categoryId))) kept.push(question);
  }
  return kept;
};

// Learners see their own questions, specialists their diseases, writers the pending ones.
export const getQuestions = async (req, res) => {
  const role = req.user?.role;
  try {
    let rows;
    if (role === 'specialist') {
      rows = (await keepMyDiseases(req.user.id, (await pool.query('SELECT * FROM questions ORDER BY id DESC')).rows))
        .map(withoutTheAsker);
    } else if (role === 'creator') {
      rows = (await pool.query(
        'SELECT * FROM questions WHERE status <> $1 ORDER BY id DESC', [QuestionStatus.answered]
      )).rows.map(withoutTheAsker);
    } else {
      rows = (await pool.query('SELECT * FROM questions WHERE user_id = $1 ORDER BY id DESC', [req.user.id])).rows;
    }
    return res.json({ questions: rows });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not load questions' });
    }
    let questions;
    if (role === 'specialist') {
      questions = (await keepMyDiseases(req.user.id, inMemoryStore.questions)).map(withoutTheAsker);
    } else if (role === 'creator') {
      questions = inMemoryStore.questions
        .filter((question) => question.status !== QuestionStatus.answered)
        .map(withoutTheAsker);
    } else {
      questions = inMemoryStore.questions.filter((question) => question.userId === req.user.id);
    }
    return res.json({ questions });
  }
};

const lessonTopic = async (contentId) => {
  try {
    const result = await pool.query(
      'SELECT c.id, cat.name AS topic FROM content c LEFT JOIN categories cat ON cat.id = c.category_id WHERE c.id = $1',
      [contentId]
    );
    return result.rows[0] ?? null;
  } catch {
    const lesson = inMemoryStore.content.find((entry) => entry.id === Number(contentId));
    if (!lesson) return null;
    const category = inMemoryStore.categories.find((entry) => entry.id === Number(lesson.categoryId));
    return { id: lesson.id, topic: category?.name ?? null };
  }
};

const maxQuestion = 600;

export const createQuestion = async (req, res) => {
  const { topic, question, contentId = null } = req.body || {};
  const lessonId = contentId === null || contentId === '' ? null : Number(contentId);

  if (lessonId !== null && (!Number.isInteger(lessonId) || lessonId <= 0)) {
    return res.status(400).json({ message: 'A valid lesson id is required' });
  }

  // Asked from a lesson: use the lesson's disease as topic.
  let resolvedTopic = topic;
  if (lessonId !== null) {
    const lesson = await lessonTopic(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    resolvedTopic = lesson.topic || topic;
  }

  if (!resolvedTopic || !question?.trim()) {
    return res.status(400).json({ message: 'Topic and question are required' });
  }
  if (question.trim().length > maxQuestion) {
    return res.status(400).json({ message: `A question can be at most ${maxQuestion} characters` });
  }

  // A guest may ask too; the row simply has no owner to notify.
  const askerId = req.user?.id ?? null;
  const entry = {
    id: Date.now(),
    userId: askerId,
    contentId: lessonId,
    topic: resolvedTopic,
    question: question.trim(),
    status: QuestionStatus.pending
  };

  try {
    const result = await pool.query(
      'INSERT INTO questions (user_id, content_id, topic, question, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [askerId, lessonId, String(resolvedTopic).trim(), question.trim(), QuestionStatus.pending]
    );
    return res.status(201).json({ message: 'Question submitted successfully', question: withoutTheAsker(result.rows[0]) });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save question' });
    }
    inMemoryStore.questions.unshift(entry);
    return res.status(201).json({ message: 'Question submitted successfully', question: withoutTheAsker(entry) });
  }
};

// Tell the learner a reply is waiting (no health info in the message).
const answerReadyEmail = (name) => ({
  subject: 'Baho: hari igisubizo kugutegereje',
  text: [
    `Muraho ${name || ''}`.trim() + ',',
    '',
    'Ikibazo wabajije kuri Baho cyarasubijwe. Fungura Baho wisomere igisubizo:',
    '',
    appBaseUrl(),
    '',
    'Ubu butumwa ntibukubiyemo amakuru y\'ubuzima bwawe.',
    '',
    '--',
    'Your question on Baho has been answered. Open Baho to read the reply.',
    'This message carries nothing about your health.',
    '',
    'Baho \u2014 bahoapp.site'
  ].join('\n'),
  html: `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#14304d;line-height:1.6">
      <p>Muraho ${name || ''},</p>
      <p>Ikibazo wabajije kuri Baho cyarasubijwe. Fungura Baho wisomere igisubizo.</p>
      <p>
        <a href="${appBaseUrl()}" style="display:inline-block;background:#0b5845;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none">
          Fungura Baho
        </a>
      </p>
      <p style="color:#5b7083;font-size:13px">Ubu butumwa ntibukubiyemo amakuru y&rsquo;ubuzima bwawe.</p>
      <p style="color:#5b7083;font-size:13px">Your question on Baho has been answered. This message carries nothing about your health.</p>
      <p style="color:#5b7083;font-size:13px">Baho &mdash; bahoapp.site</p>
    </div>
  `
});

const notifyAsker = async (question) => {
  const ownerId = question.user_id ?? question.userId;
  if (!ownerId) return { delivered: false, reason: 'no-owner' };
  try {
    // Push first; it still doesn't include the answer.
    const pushed = await sendPush(ownerId, {
      title: 'Baho',
      body: 'Ikibazo wabajije cyarasubijwe. Fungura Baho wisome igisubizo.',
      tag: `question-${question.id}`
    });

    let learner = null;
    try {
      learner = (await pool.query('SELECT full_name, email FROM users WHERE id = $1', [ownerId])).rows[0] ?? null;
    } catch {
      const stored = inMemoryStore.users.find((entry) => entry.id === ownerId);
      learner = stored ? { full_name: stored.fullName, email: stored.email } : null;
    }
    if (!learner?.email) return { delivered: Boolean(pushed.sent), reason: 'no-email', pushed: pushed.sent };
    const mailed = await sendMail({ to: learner.email, ...answerReadyEmail(learner.full_name) });
    return { ...mailed, delivered: Boolean(mailed.delivered || pushed.sent), pushed: pushed.sent };
  } catch (error) {
    // Email failure shouldn't break the reply.
    console.error(`[mail] Could not tell the learner their answer is ready: ${error.message}`);
    return { delivered: false, reason: error.message };
  }
};

const readQuestion = async (id) => {
  try {
    return (await pool.query('SELECT * FROM questions WHERE id = $1', [id])).rows[0] ?? null;
  } catch {
    return inMemoryStore.questions.find((entry) => entry.id === id) ?? null;
  }
};

// Writer saves a draft, the specialist still has to approve it.
export const draftAnswer = async (req, res) => {
  const id = Number(req.params.id);
  const { answer } = req.body || {};
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'A valid question id is required' });
  if (!answer?.trim()) return res.status(400).json({ message: 'A draft answer is required' });
  const draft = answer.trim();

  const question = await readQuestion(id);
  if (!question) return res.status(404).json({ message: 'Question not found' });
  if (question.status === QuestionStatus.answered) {
    return res.status(409).json({ message: 'This question has already been answered' });
  }

  try {
    const result = await pool.query(
      `UPDATE questions SET status = $1, answer = $2, drafted_by = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [QuestionStatus.drafted, draft, req.user.id, id]
    );
    return res.json({ message: 'Draft saved and sent to the specialist', question: withoutTheAsker(result.rows[0]) });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save the draft' });
    }
    Object.assign(question, { status: QuestionStatus.drafted, answer: draft, draftedBy: req.user.id });
    return res.json({ message: 'Draft saved in demo mode', question: withoutTheAsker(question) });
  }
};

// Specialist approves (and can edit) the draft, which sends it to the learner.
export const answerQuestion = async (req, res) => {
  const id = Number(req.params.id);
  const { answer } = req.body || {};
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'A valid question id is required' });

  const question = await readQuestion(id);
  if (!question) return res.status(404).json({ message: 'Question not found' });
  if (!(await isMySpecialty(req.user.id, question.topic))) {
    return res.status(403).json({ message: 'This question is about a disease outside your specialty' });
  }

  // Approving without text publishes the writer's draft unchanged.
  const approved = (answer ?? question.answer ?? '').trim();
  if (!approved) return res.status(400).json({ message: 'There is no answer to approve yet' });

  try {
    const result = await pool.query(
      `UPDATE questions SET status = $1, answer = $2, reviewed_by = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [QuestionStatus.answered, approved, req.user.id, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Question not found' });
    const told = await notifyAsker(result.rows[0]);
    return res.json({ message: 'Answer approved and published under the lesson', question: withoutTheAsker(result.rows[0]), notified: Boolean(told.delivered) });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save the answer' });
    }
    Object.assign(question, { status: QuestionStatus.answered, answer: approved, reviewedBy: req.user.id });
    const told = await notifyAsker(question);
    return res.json({ message: 'Answer approved in demo mode', question: withoutTheAsker(question), notified: Boolean(told.delivered) });
  }
};
