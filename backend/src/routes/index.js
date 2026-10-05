import express from 'express';

import { getHealth } from '../modules/health/health.controller.js';
import { getCategories, getContent, getContentById, getFaqs, createFaq, updateFaq, deleteFaq, getAdminContent, createContent, updateContent, deleteContent, updateContentStatus } from '../modules/content/content.controller.js';
import { getQuestions, createQuestion, answerQuestion } from '../modules/questions/questions.controller.js';
import { createIssue, getIssues, updateIssueStatus } from '../modules/issues/issues.controller.js';
import { createCreator, getCreators, login, register } from '../modules/auth/auth.controller.js';
import { authenticate, requireRole } from '../modules/auth/security.js';
import { createReminder, deleteReminder, getReminders } from '../modules/reminders/reminders.controller.js';
import { completeLesson, getProgress } from '../modules/progress/progress.controller.js';
import { getCurricula, patchDisease, postDisease, submitQuizAttempt } from '../modules/learning/learning.controller.js';

const router = express.Router();

router.get('/health', getHealth);
router.get('/categories', getCategories);
router.get('/content', getContent);
router.get('/content/:id', getContentById);
router.get('/faq', getFaqs);
router.get('/curricula', getCurricula);
router.post('/quiz-attempts', authenticate, submitQuizAttempt);
router.post('/admin/diseases', authenticate, requireRole('admin'), postDisease);
router.patch('/admin/diseases/:id', authenticate, requireRole('admin'), patchDisease);
router.post('/admin/faqs', authenticate, requireRole('admin'), createFaq);
router.patch('/admin/faqs/:id', authenticate, requireRole('admin'), updateFaq);
router.delete('/admin/faqs/:id', authenticate, requireRole('admin'), deleteFaq);
router.get('/questions', authenticate, getQuestions);
router.post('/questions', authenticate, createQuestion);
router.post('/questions/:id/answer', authenticate, requireRole('admin', 'creator'), answerQuestion);
router.post('/issues', createIssue);
router.get('/reminders', authenticate, getReminders);
router.post('/reminders', authenticate, createReminder);
router.delete('/reminders/:id', authenticate, deleteReminder);
router.get('/progress', authenticate, getProgress);
router.post('/progress/:contentId/complete', authenticate, completeLesson);
router.post('/auth/login', login);
router.post('/auth/register', register);
router.post('/admin/creators', authenticate, requireRole('admin'), createCreator);
router.get('/admin/creators', authenticate, requireRole('admin'), getCreators);
router.post('/admin/content', authenticate, requireRole('admin', 'creator'), createContent);
router.patch('/admin/content/:id', authenticate, requireRole('admin', 'creator'), updateContent);
router.patch('/admin/content/:id/status', authenticate, requireRole('admin'), updateContentStatus);
router.delete('/admin/content/:id', authenticate, requireRole('admin'), deleteContent);
router.get('/admin/content', authenticate, requireRole('admin', 'creator'), getAdminContent);
router.get('/admin/issues', authenticate, requireRole('admin'), getIssues);
router.patch('/admin/issues/:id', authenticate, requireRole('admin'), updateIssueStatus);

export default router;
