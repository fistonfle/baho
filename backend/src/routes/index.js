import express from 'express';

import { getHealth } from '../modules/health/health.controller.js';
import { getCategories, getContent, getContentById, getFaqs, createFaq, updateFaq, deleteFaq, getAdminContent, createContent, updateContent, deleteContent, updateContentStatus } from '../modules/content/content.controller.js';
import { getQuestions, createQuestion, answerQuestion, draftAnswer } from '../modules/questions/questions.controller.js';
import { createIssue, getIssues, updateIssueStatus } from '../modules/issues/issues.controller.js';
import { changePassword, createCreator, getCreators, getLearners, login, register, requestPasswordReset, resetLearnerPin, resetPassword, updateMyEmail } from '../modules/auth/auth.controller.js';
import { authenticate, requireRole } from '../modules/auth/security.js';
import { createReminder, deleteReminder, getReminders } from '../modules/reminders/reminders.controller.js';
import { completeLesson, getProgress } from '../modules/progress/progress.controller.js';
import { getCurricula, patchDisease, postDisease, submitQuizAttempt } from '../modules/learning/learning.controller.js';
import { getReviewQueue, putSpecialistTopics, reviewLesson } from '../modules/review/review.controller.js';
import { readAudioBody, serveMedia, uploadAudio } from '../modules/media/media.controller.js';
import { getPushKey, getPushStatus, subscribeToPush, unsubscribeFromPush } from '../modules/push/push.controller.js';

const router = express.Router();

router.get('/health', getHealth);
router.get('/categories', getCategories);
router.get('/content', getContent);
router.get('/content/:id', getContentById);
router.get('/faq', getFaqs);
router.get('/curricula', getCurricula);
router.use('/media', serveMedia);
router.post('/admin/media/audio', authenticate, requireRole('admin', 'creator', 'specialist'), readAudioBody, uploadAudio);
router.post('/quiz-attempts', authenticate, submitQuizAttempt);
router.post('/admin/diseases', authenticate, requireRole('admin'), postDisease);
router.patch('/admin/diseases/:id', authenticate, requireRole('admin'), patchDisease);
router.post('/admin/faqs', authenticate, requireRole('admin'), createFaq);
router.patch('/admin/faqs/:id', authenticate, requireRole('admin'), updateFaq);
router.delete('/admin/faqs/:id', authenticate, requireRole('admin'), deleteFaq);
router.get('/questions', authenticate, getQuestions);
router.post('/questions', authenticate, createQuestion);
// A learner's health question takes the same path as a lesson: a writer drafts
// the answer, and the specialist for that disease approves it, which is what
// sends it to the learner.
router.post('/questions/:id/draft', authenticate, requireRole('creator'), draftAnswer);
router.post('/questions/:id/answer', authenticate, requireRole('specialist'), answerQuestion);
router.post('/issues', createIssue);
router.get('/reminders', authenticate, getReminders);
router.post('/reminders', authenticate, createReminder);
router.delete('/reminders/:id', authenticate, deleteReminder);
router.get('/progress', authenticate, getProgress);
router.post('/progress/:contentId/complete', authenticate, completeLesson);
router.post('/auth/login', login);
router.post('/auth/register', register);
router.post('/auth/forgot-password', requestPasswordReset);
router.post('/auth/reset-password', resetPassword);
router.post('/auth/change-password', authenticate, changePassword);
// Optional, and the learner's own to remove. Baho uses it only to say that a
// reply to their question is waiting, never to send anything about their health.
router.patch('/profile/email', authenticate, requireRole('learner'), updateMyEmail);

// Notifications on the phone itself. The key is public; everything else needs
// the learner to be signed in, and a device can be unsubscribed at any time.
router.get('/push/key', getPushKey);
router.get('/push/status', authenticate, getPushStatus);
router.post('/push/subscribe', authenticate, subscribeToPush);
router.post('/push/unsubscribe', authenticate, unsubscribeFromPush);
router.post('/admin/creators', authenticate, requireRole('admin'), createCreator);
router.get('/admin/creators', authenticate, requireRole('admin'), getCreators);
router.get('/admin/learners', authenticate, requireRole('admin'), getLearners);
router.post('/admin/learners/:id/pin', authenticate, requireRole('admin'), resetLearnerPin);
router.put('/admin/staff/:id/topics', authenticate, requireRole('admin'), putSpecialistTopics);
router.get('/review/queue', authenticate, requireRole('specialist'), getReviewQueue);
router.post('/review/lessons/:id', authenticate, requireRole('specialist'), reviewLesson);
// Lessons belong to writers and specialists. Writers draft them and send them
// for review; the specialist for the disease approves, which publishes, or sends
// the lesson back. That specialist may also edit a lesson on their own diseases
// and replace its recording, published or not, and may publish one directly,
// with the one exception that nobody publishes a lesson they wrote themselves.
// An administrator can see every lesson, because they answer for the platform,
// and can delete one as housekeeping, but takes no part in deciding what
// learners are taught.
router.post('/admin/content', authenticate, requireRole('creator'), createContent);
router.patch('/admin/content/:id', authenticate, requireRole('creator', 'specialist'), updateContent);
router.patch('/admin/content/:id/status', authenticate, requireRole('specialist'), updateContentStatus);
router.delete('/admin/content/:id', authenticate, requireRole('admin'), deleteContent);
router.get('/admin/content', authenticate, requireRole('admin', 'creator', 'specialist'), getAdminContent);
router.get('/admin/issues', authenticate, requireRole('admin'), getIssues);
router.patch('/admin/issues/:id', authenticate, requireRole('admin'), updateIssueStatus);

export default router;
