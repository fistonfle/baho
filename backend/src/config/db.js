import dotenv from 'dotenv';
import pg from 'pg';

import { isDatabaseUnavailable } from './dbErrors.js';
import { inMemoryStore } from './store.js';

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
`;

const seedTables = async () => {
  const categoriesQuery = await pool.query('SELECT COUNT(*)::int AS count FROM categories');
  if (categoriesQuery.rows[0].count === 0) {
    await pool.query(
      `INSERT INTO categories (name, slug) VALUES ($1, $2), ($3, $4), ($5, $6), ($7, $8)`,
      [
        'Imirire', 'nutrition',
        'Umuvuduko w\'amaraso', 'blood-pressure',
        'Diyabete', 'diabetes',
        'Umutima', 'heart-health'
      ]
    );
  }

  const contentQuery = await pool.query('SELECT COUNT(*)::int AS count FROM content');
  if (contentQuery.rows[0].count === 0) {
    await pool.query(
      `INSERT INTO content (category_id, title, summary, body, audio_url, status) VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12), ($13, $14, $15, $16, $17, $18)`,
      [
        2, 'Umuvuduko w\'amaraso ni iki?', 'Kumenya ibimenyetso n\'ukubungabunga umuvuduko w\'amaraso.', 'Umuvuduko w\'amaraso ni igipimo cy\'amaraso y\'ingome mu mitsi. Akenshi ni ingenzi kugaragaza uko umutima ukora.', '/audio/blood-pressure.mp3', 'published',
        3, 'Diyabete n\'ubuzima', 'Uburyo bwo kurinda diyabete no kumenya ibimenyetso.', 'Diyabete irashobora kugaragara mu buryo butandukanye. Kurya byiza, imyitozo kandi no kwipimisha ni ingirakamaro.', '/audio/diabetes.mp3', 'published',
        1, 'Imirire myiza', 'Gukoresha ibiryo bihaza umubiri byiza.', 'Kurya biryoshye ku mugabane, ibiryo bitarimo umunyu ukabije, n\'ubutare byiza bitanga ubuzima bwiza.', '/audio/nutrition.mp3', 'published'
      ]
    );
  }

  const faqQuery = await pool.query('SELECT COUNT(*)::int AS count FROM faqs');
  if (faqQuery.rows[0].count === 0) {
    await pool.query(
      `INSERT INTO faqs (question, answer) VALUES ($1, $2), ($3, $4), ($5, $6)`,
      [
        'Baho ikora gute?', 'Baho itanga amakuru, amajwi, imyitozo n\'ibibutsa kugira ngo abantu babashe kwibanda ku buzima bwabo.',
        'Ese ibifasha mu Kinyarwanda?', 'Yego, Baho ifite ibiri mu Kinyarwanda kugira ngo byoroshye kubasha abantu bazi ururimi rw\'ibanze.',
        'Nshobora guhamagara ubufasha?', 'Yego, ushobora gutanga ikibazo cyangwa uhabwe ubufasha mu gice cy\'ibibazo no gufasha.'
      ]
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
  inMemoryStore.content = content.rows.map((row) => ({ ...row, categoryId: row.category_id, audioUrl: row.audio_url }));
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
