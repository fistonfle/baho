-- Baho PostgreSQL schema (13 tables). See designs/erd.svg for the diagram.
-- The backend creates and migrates these tables automatically on start-up
-- (backend/src/config/db.js); this file is the readable reference.

-- People ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,              -- scrypt with a random salt
    preferred_language VARCHAR(50) DEFAULT 'Kinyarwanda',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A user with a staff row is an admin or a creator (health professional).
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,                        -- 'admin' | 'creator'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content -----------------------------------------------------------------

-- Lesson topics. Adding a disease also adds a category.
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
    image_url VARCHAR(255),
    status VARCHAR(30) DEFAULT 'published',          -- draft | review | published | rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,                           -- ["option A", "option B", ...]
    answer_index INTEGER NOT NULL,
    explanation TEXT,
    position INTEGER NOT NULL DEFAULT 0
);

-- Learning paths. A path with a condition_name is also a disease in the NCD
-- module, with its own risk factors, warning signs and prevention advice.
CREATE TABLE IF NOT EXISTS curricula (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(60) UNIQUE NOT NULL,
    title VARCHAR(160) NOT NULL,
    condition_name VARCHAR(120),
    description TEXT,
    image_url VARCHAR(255),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    icon VARCHAR(8),
    about TEXT,
    risk_factors JSONB NOT NULL DEFAULT '[]',
    warning_signs JSONB NOT NULL DEFAULT '[]',
    prevention JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS curriculum_lessons (
    curriculum_id INTEGER REFERENCES curricula(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    PRIMARY KEY (curriculum_id, content_id)
);

CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learner activity (no health details are stored on the server) ----------

CREATE TABLE IF NOT EXISTS progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, content_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    reminder_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    topic VARCHAR(120) NOT NULL,
    question TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'Pending',             -- Pending | Answered
    answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'Open',                -- Open | In review | Resolved
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories and demo content are seeded by the backend (see seed.sql).
