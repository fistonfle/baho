import express from 'express';

import { createIssue } from './issues.controller.js';

const router = express.Router();

router.post('/', createIssue);

export default router;
