import express from 'express';

import { getQuestions, createQuestion, answerQuestion } from './questions.controller.js';

const router = express.Router();

router.get('/', getQuestions);
router.post('/', createQuestion);
router.post('/:id/answer', answerQuestion);

export default router;
