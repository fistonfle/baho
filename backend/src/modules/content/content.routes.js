import express from 'express';

import { getCategories, getContent, getContentById } from './content.controller.js';

const router = express.Router();

router.get('/categories', getCategories);
router.get('/', getContent);
router.get('/:id', getContentById);

export default router;
