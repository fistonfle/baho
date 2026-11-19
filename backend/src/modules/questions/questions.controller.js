import { pool } from '../../config/db.js';
import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { inMemoryStore } from '../../config/store.js';
import { getSpecialistTopics } from '../review/review.service.js';
import { appBaseUrl, sendMail } from '../mail/mailer.js';
import { sendPush } from '../push/push.service.js';

// A learner's question follows the same path as a lesson. A writer drafts the
// answer, and the specialist assigned to that disease approves it, which is what
// sends it to the learner. Nothing written by one person alone reaches anybody.
//
// Pending  -> a learner has asked, nobody has drafted an answer
// Drafted  -> a writer has written one; it is waiting for the specialist
// Answered -> the specialist approved it, and the learner can see it
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

// What a writer is shown. Drafting an answer needs the question, not the person
// who asked it, so the writer never receives the learner's id. The link between
// the learner and the answer exists only where it has to: in the database, and
// on the learner's own screen.
const withoutTheAsker = (question) => {
  const { user_id: _dbOwner, userId: _owner, ...rest } = question;
  return rest;
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

// A learner sees their own questions. A specialist sees the ones about their own
// diseases. A writer sees every question still waiting for an answer, with the
// asker removed. No other role sees learner questions at all, because what a
// learner asks about their health is as sensitive as the lesson it came from.
export const getQuestions = async (req, res) => {
  const role = req.user?.role;
  try {
    let rows;
    if (role === 'specialist') {
      rows = await keepMyDiseases(req.user.id, (await pool.query('SELECT * FROM questions ORDER BY id DESC')).rows);
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
      questions = await keepMyDiseases(req.user.id, inMemoryStore.questions);
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

// The disease a lesson belongs to, so a question asked from inside a lesson
// reaches the right specialist without the learner choosing from a list.
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

export const createQuestion = async (req, res) => {
  const { topic, question, contentId = null } = req.body || {};
  const lessonId = contentId === null || contentId === '' ? null : Number(contentId);

  if (lessonId !== null && (!Number.isInteger(lessonId) || lessonId <= 0)) {
    return res.status(400).json({ message: 'A valid lesson id is required' });
  }

  // A question asked from a lesson takes that lesson's disease as its topic, so
  // the learner is never asked to classify their own question.
  let resolvedTopic = topic;
  if (lessonId !== null) {
    const lesson = await lessonTopic(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    resolvedTopic = lesson.topic || topic;
  }

  if (!resolvedTopic || !question?.trim()) {
    return res.status(400).json({ message: 'Topic and question are required' });
  }

  const entry = {
    id: Date.now(),
    userId: req.user.id,
    contentId: lessonId,
    topic: resolvedTopic,
    question: question.trim(),
    status: QuestionStatus.pending
  };

  try {
    const result = await pool.query(
      'INSERT INTO questions (user_id, content_id, topic, question, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, lessonId, String(resolvedTopic).trim(), question.trim(), QuestionStatus.pending]
    );
    return res.status(201).json({ message: 'Question submitted successfully', question: result.rows[0] });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save question' });
    }
    inMemoryStore.questions.unshift(entry);
    return res.status(201).json({ message: 'Question submitted successfully', question: entry });
  }
};

// Telling a learner that a reply is waiting.
//
// Until SMS is available, a learner who has chosen to give an email address is
// told by email. The message carries no health information at all: not the
// disease, not the question, not the answer. It says a reply is waiting and
// points at the app, where the learner reads it behind their own PIN. An email
// passes through servers nobody here controls, so nothing that would say
// something about this person's health is put into one.
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
    'Baho \u2014 baho.filito.rw'
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
      <p style="color:#5b7083;font-size:13px">Baho &mdash; baho.filito.rw</p>
    </div>
  `
});

// The learner is found by the id stored on the question, which is the one place
// the link between a person and what they asked is kept.
const notifyAsker = async (question) => {
  const ownerId = question.user_id ?? question.userId;
  if (!ownerId) return { delivered: false, reason: 'no-owner' };
  try {
    // The phone first, where a learner will actually see it. The push payload
    // is encrypted to that device, so it may name what it is about; it still
    // carries no answer, because the answer is read in the app behind the PIN.
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
    // A reply that reached the learner's screen must not fail because a mail
    // server was unreachable.
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

// A writer drafts the answer. It goes nowhere until a specialist approves it,
// and the writer is not told who asked.
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

// The specialist for that disease approves the draft, which sends it to the
// learner. They may edit it first by sending their own text.
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
    return res.json({ message: 'Answer approved and sent to the learner', question: result.rows[0], notified: Boolean(told.delivered) });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      return res.status(503).json({ message: 'Could not save the answer' });
    }
    Object.assign(question, { status: QuestionStatus.answered, answer: approved, reviewedBy: req.user.id });
    const told = await notifyAsker(question);
    return res.json({ message: 'Answer approved in demo mode', question, notified: Boolean(told.delivered) });
  }
};
