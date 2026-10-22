import { loadQuizzes } from '../learning/learning.service.js';
import { recordReview, reviewQueue, setSpecialistTopics } from './review.service.js';

export const getReviewQueue = async (req, res) => {
  try {
    const lessons = await reviewQueue(req.user.id);
    // Reviewers check the quiz too, so each lesson comes with its questions and answers.
    const quizzes = await loadQuizzes(lessons.map((lesson) => lesson.id));
    return res.json({ lessons: lessons.map((lesson) => ({ ...lesson, quiz: quizzes[lesson.id] || [] })) });
  } catch {
    return res.status(503).json({ message: 'Could not load the review queue' });
  }
};

// Body: { decision: 'approve' | 'changes', note }. A note is required when asking for changes.
export const reviewLesson = async (req, res) => {
  const lessonId = Number(req.params.id);
  const decision = req.body?.decision;
  const note = String(req.body?.note || '').trim();
  if (!Number.isInteger(lessonId) || lessonId <= 0 || !['approve', 'changes'].includes(decision)) {
    return res.status(400).json({ message: 'A lesson id and a decision (approve or changes) are required' });
  }
  if (decision === 'changes' && !note) {
    return res.status(400).json({ message: 'Explain what needs to change' });
  }
  try {
    const result = await recordReview(lessonId, req.user.id, decision, note);
    if (result.error) return res.status(result.status).json({ message: result.error });
    return res.json({ message: decision === 'approve' ? 'Lesson approved' : 'Changes requested', lesson: result.lesson });
  } catch {
    return res.status(503).json({ message: 'Could not save the review' });
  }
};

export const putSpecialistTopics = async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || !Array.isArray(req.body?.categoryIds) || req.body.categoryIds.length === 0) {
    return res.status(400).json({ message: 'Choose at least one topic for the specialist' });
  }
  try {
    return res.json({ categoryIds: await setSpecialistTopics(userId, req.body.categoryIds) });
  } catch {
    return res.status(503).json({ message: 'Could not save the specialist topics' });
  }
};
