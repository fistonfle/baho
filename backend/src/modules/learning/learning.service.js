// Data access for learning paths (curricula) and lesson quizzes.
// Each function uses PostgreSQL and falls back to the in-memory demo store
// when the database is unavailable, like the rest of the API.

import { pool } from '../../config/db.js';
import { isDatabaseUnavailable } from '../../config/dbErrors.js';
import { inMemoryStore } from '../../config/store.js';

const withFallback = async (databaseWork, memoryWork) => {
  try {
    return await databaseWork();
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    return memoryWork();
  }
};

const mapQuestion = (row) => ({
  id: row.id,
  question: row.question,
  options: row.options,
  answerIndex: row.answer_index ?? row.answerIndex,
  explanation: row.explanation || ''
});

// Returns { [contentId]: [question, ...] } for the given lessons.
export const loadQuizzes = (contentIds) => withFallback(
  async () => {
    const result = await pool.query(
      'SELECT * FROM quiz_questions WHERE content_id = ANY($1::int[]) ORDER BY content_id, position, id',
      [contentIds]
    );
    return result.rows.reduce((byLesson, row) => {
      (byLesson[row.content_id] ||= []).push(mapQuestion(row));
      return byLesson;
    }, {});
  },
  () => inMemoryStore.quizQuestions
    .filter((item) => contentIds.includes(item.contentId))
    .sort((a, b) => a.position - b.position)
    .reduce((byLesson, item) => {
      (byLesson[item.contentId] ||= []).push(mapQuestion(item));
      return byLesson;
    }, {})
);

// Returns { [contentId]: [curriculumId, ...] } so the staff form can show the links.
export const loadCurriculumLinks = (contentIds) => withFallback(
  async () => {
    const result = await pool.query('SELECT content_id, curriculum_id FROM curriculum_lessons WHERE content_id = ANY($1::int[])', [contentIds]);
    return result.rows.reduce((byLesson, row) => {
      (byLesson[row.content_id] ||= []).push(row.curriculum_id);
      return byLesson;
    }, {});
  },
  () => inMemoryStore.curriculumLessons
    .filter((link) => contentIds.includes(link.contentId))
    .reduce((byLesson, link) => {
      (byLesson[link.contentId] ||= []).push(link.curriculumId);
      return byLesson;
    }, {})
);

// Adds `quiz` and `curriculumIds` to each lesson object.
export const attachLearningData = async (lessons, { includeLinks = false } = {}) => {
  const ids = lessons.map((lesson) => Number(lesson.id));
  const [quizzes, links] = await Promise.all([loadQuizzes(ids), includeLinks ? loadCurriculumLinks(ids) : {}]);
  return lessons.map((lesson) => ({
    ...lesson,
    quiz: quizzes[lesson.id] || [],
    ...(includeLinks ? { curriculumIds: links[lesson.id] || [] } : {})
  }));
};

// Checks staff input: up to 10 questions, each with 2-4 options and a valid answer.
export const validateQuiz = (quiz) => {
  if (quiz === undefined) return null;
  if (!Array.isArray(quiz) || quiz.length > 10) return 'Quiz must be a list of at most 10 questions';
  const valid = quiz.every((item) =>
    typeof item?.question === 'string' && item.question.trim()
    && Array.isArray(item.options) && item.options.length >= 2 && item.options.length <= 4
    && item.options.every((option) => typeof option === 'string' && option.trim())
    && Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex < item.options.length
  );
  return valid ? null : 'Each quiz question needs text, 2 to 4 options and a correct answer';
};

export const saveQuiz = (contentId, quiz) => withFallback(
  async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM quiz_questions WHERE content_id = $1', [contentId]);
      for (const [position, item] of quiz.entries()) {
        await client.query(
          'INSERT INTO quiz_questions (content_id, question, options, answer_index, explanation, position) VALUES ($1, $2, $3, $4, $5, $6)',
          [contentId, item.question.trim(), JSON.stringify(item.options.map((option) => option.trim())), item.answerIndex, (item.explanation || '').trim(), position]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  () => {
    inMemoryStore.quizQuestions = inMemoryStore.quizQuestions.filter((item) => item.contentId !== contentId);
    quiz.forEach((item, position) => inMemoryStore.quizQuestions.push({
      id: `${contentId}-${position}`,
      contentId,
      position,
      question: item.question.trim(),
      options: item.options.map((option) => option.trim()),
      answerIndex: item.answerIndex,
      explanation: (item.explanation || '').trim()
    }));
  }
);

// New links are added at the end of the path; removed links are deleted.
export const saveCurriculumLinks = (contentId, curriculumIds) => withFallback(
  async () => {
    await pool.query('DELETE FROM curriculum_lessons WHERE content_id = $1 AND NOT (curriculum_id = ANY($2::int[]))', [contentId, curriculumIds]);
    for (const curriculumId of curriculumIds) {
      await pool.query(
        `INSERT INTO curriculum_lessons (curriculum_id, content_id, position)
         SELECT $1, $2, COALESCE(MAX(position) + 1, 0) FROM curriculum_lessons WHERE curriculum_id = $1
         ON CONFLICT DO NOTHING`,
        [curriculumId, contentId]
      );
    }
  },
  () => {
    inMemoryStore.curriculumLessons = inMemoryStore.curriculumLessons
      .filter((link) => link.contentId !== contentId || curriculumIds.includes(link.curriculumId));
    curriculumIds.forEach((curriculumId) => {
      if (inMemoryStore.curriculumLessons.some((link) => link.contentId === contentId && link.curriculumId === curriculumId)) return;
      const last = Math.max(-1, ...inMemoryStore.curriculumLessons.filter((link) => link.curriculumId === curriculumId).map((link) => link.position));
      inMemoryStore.curriculumLessons.push({ curriculumId, contentId, position: last + 1 });
    });
  }
);

const mapCurriculum = (row, lessonIds) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  condition: row.condition_name ?? row.condition ?? null,
  description: row.description || '',
  imageUrl: row.image_url ?? row.imageUrl ?? '',
  categoryId: row.category_id ?? row.categoryId ?? null,
  icon: row.icon || '',
  about: row.about || '',
  riskFactors: row.risk_factors ?? row.riskFactors ?? [],
  warningSigns: row.warning_signs ?? row.warningSigns ?? [],
  prevention: row.prevention ?? [],
  lessonIds
});

// Every path (and disease) with the ids of its published lessons, in order.
export const listCurricula = () => withFallback(
  async () => {
    const result = await pool.query(`
      SELECT c.*,
             COALESCE(array_agg(cl.content_id ORDER BY cl.position) FILTER (WHERE ct.status = 'published'), '{}') AS lesson_ids
      FROM curricula c
      LEFT JOIN curriculum_lessons cl ON cl.curriculum_id = c.id
      LEFT JOIN content ct ON ct.id = cl.content_id
      GROUP BY c.id
      ORDER BY c.id`);
    return result.rows.map((row) => mapCurriculum(row, row.lesson_ids.map(Number)));
  },
  () => inMemoryStore.curricula.map((curriculum) => mapCurriculum(
    curriculum,
    inMemoryStore.curriculumLessons
      .filter((link) => link.curriculumId === curriculum.id)
      .filter((link) => inMemoryStore.content.some((lesson) => lesson.id === link.contentId && lesson.status === 'published'))
      .sort((a, b) => a.position - b.position)
      .map((link) => link.contentId)
  ))
);

const cleanList = (items) => (Array.isArray(items) ? items.map((item) => String(item).trim()).filter(Boolean).slice(0, 10) : []);

const slugify = (text) => String(text).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'indwara';

// Checks the staff form for a disease. Returns an error message or null.
export const validateDisease = (body, { partial = false } = {}) => {
  if (!partial || body?.name !== undefined) {
    if (typeof body?.name !== 'string' || !body.name.trim() || body.name.trim().length > 120) return 'A disease name of up to 120 characters is required';
  }
  if (typeof body?.about !== 'string' || !body.about.trim()) return 'Describe the disease in a few sentences';
  for (const field of ['riskFactors', 'warningSigns', 'prevention']) {
    if (cleanList(body?.[field]).length === 0) return 'Add at least one risk factor, warning sign and prevention tip';
  }
  return null;
};

const diseaseFields = (body) => ({
  icon: String(body.icon || '✚').slice(0, 8),
  about: body.about.trim(),
  description: String(body.description || '').trim() || `Wige byinshi kuri ${body.name?.trim() || 'iyi ndwara'}.`,
  imageUrl: String(body.imageUrl || '').trim(),
  riskFactors: cleanList(body.riskFactors),
  warningSigns: cleanList(body.warningSigns),
  prevention: cleanList(body.prevention)
});

// A new disease gets its own lesson category and an (empty) learning path.
export const createDisease = (body) => withFallback(
  async () => {
    const name = body.name.trim();
    const fields = diseaseFields(body);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const taken = await client.query('SELECT 1 FROM curricula WHERE LOWER(condition_name) = LOWER($1)', [name]);
      if (taken.rows[0]) {
        await client.query('ROLLBACK');
        return { conflict: true };
      }
      // The slug must be free in both tables, e.g. "Diyabete" already exists as a category.
      const baseSlug = slugify(name);
      let slug = baseSlug;
      for (let suffix = 2; ; suffix += 1) {
        const used = await client.query('SELECT 1 FROM curricula WHERE slug = $1 UNION SELECT 1 FROM categories WHERE slug = $1', [slug]);
        if (!used.rows[0]) break;
        slug = `${baseSlug}-${suffix}`;
      }
      // Reuse a topic with the same name (e.g. "Imirire") instead of creating a duplicate.
      const existingCategory = await client.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [name]);
      const category = existingCategory.rows[0]
        ? existingCategory
        : await client.query('INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id', [name, slug]);
      const created = await client.query(
        `INSERT INTO curricula (slug, title, condition_name, description, image_url, category_id, icon, about, risk_factors, warning_signs, prevention)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [slug, `Inzira ya ${name}`, name, fields.description, fields.imageUrl || null, category.rows[0].id, fields.icon, fields.about,
          JSON.stringify(fields.riskFactors), JSON.stringify(fields.warningSigns), JSON.stringify(fields.prevention)]
      );
      await client.query('COMMIT');
      return { disease: mapCurriculum(created.rows[0], []) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  () => {
    const name = body.name.trim();
    if (inMemoryStore.curricula.some((item) => item.condition?.toLowerCase() === name.toLowerCase())) return { conflict: true };
    const fields = diseaseFields(body);
    const slug = `${slugify(name)}-${Date.now()}`;
    let category = inMemoryStore.categories.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (!category) {
      category = { id: Math.max(...inMemoryStore.categories.map((item) => item.id)) + 1, name, slug };
      inMemoryStore.categories.push(category);
    }
    const disease = { id: Math.max(...inMemoryStore.curricula.map((item) => item.id)) + 1, slug, title: `Inzira ya ${name}`, condition: name, categoryId: category.id, ...fields };
    inMemoryStore.curricula.push(disease);
    return { disease: mapCurriculum(disease, []) };
  }
);

// Updates the information shown in the NCD module (the name stays the same).
export const updateDisease = (id, body) => withFallback(
  async () => {
    const fields = diseaseFields(body);
    const result = await pool.query(
      `UPDATE curricula SET icon = $2, about = $3, description = $4, image_url = COALESCE(NULLIF($5, ''), image_url),
         risk_factors = $6, warning_signs = $7, prevention = $8
       WHERE id = $1 AND condition_name IS NOT NULL RETURNING *`,
      [id, fields.icon, fields.about, fields.description, fields.imageUrl,
        JSON.stringify(fields.riskFactors), JSON.stringify(fields.warningSigns), JSON.stringify(fields.prevention)]
    );
    return result.rows[0] ? (await listCurricula()).find((item) => item.id === id) : null;
  },
  () => {
    const disease = inMemoryStore.curricula.find((item) => item.id === id && item.condition);
    if (!disease) return null;
    const { imageUrl, ...fields } = diseaseFields(body);
    Object.assign(disease, fields, imageUrl ? { imageUrl } : {});
    return listCurricula().then((items) => items.find((item) => item.id === id));
  }
);

export const saveAttempt = (userId, contentId, score, total) => withFallback(
  async () => {
    await pool.query('INSERT INTO quiz_attempts (user_id, content_id, score, total) VALUES ($1, $2, $3, $4)', [userId, contentId, score, total]);
  },
  () => {
    inMemoryStore.quizAttempts.push({ userId, contentId, score, total, createdAt: new Date().toISOString() });
  }
);

// Best score per lesson plus the average across those best scores.
export const quizSummary = (userId) => withFallback(
  async () => {
    const result = await pool.query(
      `SELECT DISTINCT ON (content_id) content_id, score, total FROM quiz_attempts
       WHERE user_id = $1 ORDER BY content_id, score::float / total DESC`,
      [userId]
    );
    return result.rows.map((row) => ({ contentId: row.content_id, score: row.score, total: row.total }));
  },
  () => {
    const best = {};
    inMemoryStore.quizAttempts.filter((attempt) => attempt.userId === userId).forEach((attempt) => {
      const current = best[attempt.contentId];
      if (!current || attempt.score / attempt.total > current.score / current.total) best[attempt.contentId] = attempt;
    });
    return Object.values(best).map(({ contentId, score, total }) => ({ contentId, score, total }));
  }
);
