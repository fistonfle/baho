import { createDisease, listCurricula, loadQuizzes, saveAttempt, updateDisease, validateDisease } from './learning.service.js';

export const getCurricula = async (_req, res) => {
  try {
    return res.json({ curricula: await listCurricula() });
  } catch {
    return res.status(503).json({ message: 'Could not load learning paths' });
  }
};

// The server grades the attempt itself so stored scores cannot be faked.
export const submitQuizAttempt = async (req, res) => {
  const contentId = Number(req.body?.contentId);
  const answers = req.body?.answers;
  if (!Number.isInteger(contentId) || contentId <= 0 || !Array.isArray(answers)) {
    return res.status(400).json({ message: 'A lesson id and a list of answers are required' });
  }
  try {
    const questions = (await loadQuizzes([contentId]))[contentId] || [];
    if (questions.length === 0) return res.status(404).json({ message: 'This lesson has no quiz' });
    if (answers.length !== questions.length) return res.status(400).json({ message: 'Answer every question' });
    const correct = questions.map((question, index) => answers[index] === question.answerIndex);
    const score = correct.filter(Boolean).length;
    await saveAttempt(req.user.id, contentId, score, questions.length);
    return res.status(201).json({ score, total: questions.length, correct });
  } catch {
    return res.status(503).json({ message: 'Could not save the quiz result' });
  }
};

export const postDisease = async (req, res) => {
  const error = validateDisease(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const result = await createDisease(req.body);
    if (result.conflict) return res.status(409).json({ message: 'This disease already exists' });
    return res.status(201).json({ message: 'Disease created', disease: result.disease });
  } catch {
    return res.status(503).json({ message: 'Could not create the disease' });
  }
};

export const patchDisease = async (req, res) => {
  const id = Number(req.params.id);
  const error = Number.isInteger(id) && id > 0 ? validateDisease(req.body, { partial: true }) : 'A valid disease id is required';
  if (error) return res.status(400).json({ message: error });
  try {
    const disease = await updateDisease(id, req.body);
    if (!disease) return res.status(404).json({ message: 'Disease not found' });
    return res.json({ message: 'Disease updated', disease });
  } catch {
    return res.status(503).json({ message: 'Could not update the disease' });
  }
};
