import dotenv from 'dotenv';
import pg from 'pg';

import { isDatabaseUnavailable } from './dbErrors.js';
import { inMemoryStore } from './store.js';
import { seedCategories, seedCurricula, seedFaqs, seedLessons } from './seedData.js';

dotenv.config();

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://fle@localhost:5432/baho';

export const pool = new Pool({ connectionString: DATABASE_URL });
if (process.env.BAHO_DEMO_MODE === 'true') {
  const unavailableError = Object.assign(new Error('PostgreSQL disabled by BAHO_DEMO_MODE'), { code: 'ECONNREFUSED' });
  pool.query = async () => { throw unavailableError; };
  pool.connect = async () => { throw unavailableError; };
}
let databaseReady = false;

const createSchemaSql = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(50) DEFAULT 'Kinyarwanda',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS content (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id),
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(180) NOT NULL,
    summary TEXT,
    body TEXT NOT NULL,
    audio_url VARCHAR(255),
    status VARCHAR(30) DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    topic VARCHAR(120) NOT NULL,
    question TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'Pending',
    answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    reminder_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, content_id)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS progress_user_content_unique ON progress (user_id, content_id);
  ALTER TABLE issues ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  ALTER TABLE questions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  ALTER TABLE content ADD COLUMN IF NOT EXISTS creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  ALTER TABLE content ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);

  CREATE TABLE IF NOT EXISTS curricula (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(60) UNIQUE NOT NULL,
    title VARCHAR(160) NOT NULL,
    condition_name VARCHAR(120),
    description TEXT,
    image_url VARCHAR(255)
  );

  ALTER TABLE curricula ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
  ALTER TABLE curricula ADD COLUMN IF NOT EXISTS icon VARCHAR(8);
  ALTER TABLE curricula ADD COLUMN IF NOT EXISTS about TEXT;
  ALTER TABLE curricula ADD COLUMN IF NOT EXISTS risk_factors JSONB NOT NULL DEFAULT '[]';
  ALTER TABLE curricula ADD COLUMN IF NOT EXISTS warning_signs JSONB NOT NULL DEFAULT '[]';
  ALTER TABLE curricula ADD COLUMN IF NOT EXISTS prevention JSONB NOT NULL DEFAULT '[]';

  CREATE TABLE IF NOT EXISTS curriculum_lessons (
    curriculum_id INTEGER REFERENCES curricula(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    PRIMARY KEY (curriculum_id, content_id)
  );

  CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    answer_index INTEGER NOT NULL,
    explanation TEXT,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const seedTables = async () => {
  // Categories, lessons and FAQs are added only when missing, so this is safe
  // to run on every start and never overwrites content written by staff.
  for (const category of seedCategories) {
    await pool.query(
      'INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name',
      [category.id, category.name, category.slug]
    );
  }
  await pool.query("SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT MAX(id) FROM categories))");

  const lessonIds = {};
  for (const lesson of seedLessons) {
    const existing = await pool.query('SELECT id, creator_id FROM content WHERE title = $1 ORDER BY id LIMIT 1', [lesson.title]);
    let lessonId = existing.rows[0]?.id;
    if (!lessonId) {
      const inserted = await pool.query(
        "INSERT INTO content (category_id, title, summary, body, audio_url, image_url, status) VALUES ($1, $2, $3, $4, $5, $6, 'published') RETURNING id",
        [lesson.categoryId, lesson.title, lesson.summary, lesson.body, lesson.audioUrl, lesson.imageUrl]
      );
      lessonId = inserted.rows[0].id;
    } else if (existing.rows[0].creator_id === null) {
      // Refresh the text of earlier demo lessons that no staff member has edited.
      await pool.query(
        'UPDATE content SET summary = $1, body = $2, image_url = COALESCE(image_url, $3) WHERE id = $4',
        [lesson.summary, lesson.body, lesson.imageUrl, lessonId]
      );
    }
    lessonIds[lesson.title] = lessonId;

    const quizCount = await pool.query('SELECT COUNT(*)::int AS count FROM quiz_questions WHERE content_id = $1', [lessonId]);
    if (quizCount.rows[0].count === 0) {
      for (const [position, item] of lesson.quiz.entries()) {
        await pool.query(
          'INSERT INTO quiz_questions (content_id, question, options, answer_index, explanation, position) VALUES ($1, $2, $3, $4, $5, $6)',
          [lessonId, item.question, JSON.stringify(item.options), item.answerIndex, item.explanation, position]
        );
      }
    }
  }

  for (const curriculum of seedCurricula) {
    const saved = await pool.query(
      `INSERT INTO curricula (slug, title, condition_name, description, image_url) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
      [curriculum.slug, curriculum.title, curriculum.condition, curriculum.description, curriculum.imageUrl]
    );
    const curriculumId = saved.rows[0].id;
    if (curriculum.condition) {
      // Fill in the disease information once; staff edits are kept afterwards.
      await pool.query(
        `UPDATE curricula SET category_id = COALESCE(category_id, (SELECT id FROM categories WHERE slug = $2)),
           icon = COALESCE(icon, $3), about = COALESCE(about, $4), risk_factors = $5, warning_signs = $6, prevention = $7
         WHERE id = $1 AND risk_factors = '[]'::jsonb`,
        [curriculumId, curriculum.categorySlug, curriculum.icon, curriculum.about,
          JSON.stringify(curriculum.riskFactors), JSON.stringify(curriculum.warningSigns), JSON.stringify(curriculum.prevention)]
      );
    }
    const lessonCount = await pool.query('SELECT COUNT(*)::int AS count FROM curriculum_lessons WHERE curriculum_id = $1', [curriculumId]);
    if (lessonCount.rows[0].count === 0) {
      for (const [position, title] of curriculum.lessons.entries()) {
        await pool.query(
          'INSERT INTO curriculum_lessons (curriculum_id, content_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [curriculumId, lessonIds[title], position]
        );
      }
    }
  }

  for (const faq of seedFaqs) {
    await pool.query(
      'INSERT INTO faqs (question, answer) SELECT $1::text, $2::text WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $1::text)',
      [faq.question, faq.answer]
    );
  }

  const questionQuery = await pool.query('SELECT COUNT(*)::int AS count FROM questions');
  if (questionQuery.rows[0].count === 0) {
    await pool.query(
      `INSERT INTO questions (topic, question, status, answer) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
      [
        'Umuvuduko w\'amaraso', 'Ni ibihe bimenyetso by\'umuvuduko w\'amaraso ukabije?', 'Answered', 'Umuvuduko w\'amaraso ukabije ushobora kutagira ibimenyetso bigaragara. Gupima umuvuduko w\'amaraso ni bwo buryo bwizewe bwo kumenya uko uhagaze.',
        'Diyabete', 'Ni gute ngaruka ubuzima bwange mu buryo bwiza?', 'Pending', null
      ]
    );
  }

  const [categories, content, faqs, issues, questions] = await Promise.all([
    pool.query('SELECT * FROM categories ORDER BY id ASC'),
    pool.query('SELECT * FROM content ORDER BY id ASC'),
    pool.query('SELECT * FROM faqs ORDER BY id ASC'),
    pool.query('SELECT * FROM issues ORDER BY id ASC'),
    pool.query('SELECT * FROM questions ORDER BY id ASC')
  ]);

  inMemoryStore.categories = categories.rows;
  inMemoryStore.content = content.rows.map((row) => ({ ...row, categoryId: row.category_id, audioUrl: row.audio_url, imageUrl: row.image_url }));
  inMemoryStore.faqs = faqs.rows;
  inMemoryStore.issues = issues.rows;
  inMemoryStore.questions = questions.rows.map((row) => ({ ...row, answer: row.answer ?? undefined }));
};

export const isDbConnected = () => databaseReady;

export const seedDatabase = async () => {
  await pool.query(createSchemaSql);
  await seedTables();
};

export default async function connectDatabase() {
  try {
    await pool.query('SELECT 1');
    console.log(`Connected to PostgreSQL at ${DATABASE_URL}`);
    await seedDatabase();
    databaseReady = true;
    return true;
  } catch (error) {
    databaseReady = false;
    if (isDatabaseUnavailable(error)) {
      console.warn('PostgreSQL connection failed; continuing in demo mode.', error.message);
    } else {
      console.error('PostgreSQL schema initialization failed.', error.message);
    }
    return false;
  }
}
