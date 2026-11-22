// Gives every silent lesson a generated voice. A recording uploaded later replaces it.
// Run on the server: docker compose exec -T baho-backend node scripts/backfill-audio.js
import { pool } from '../src/config/db.js';
import { mediaStore } from '../src/modules/media/MediaStore.js';
import { speakable } from '../src/modules/media/media.controller.js';
import { ttsEngine } from '../src/modules/media/TtsEngine.js';

const dryRun = process.argv.includes('--dry-run');

const quizOf = async (lessonId) => {
  const { rows } = await pool.query(
    'SELECT question, options, answer_index FROM quiz_questions WHERE content_id = $1 ORDER BY position, id',
    [lessonId]
  );
  return rows.map((row) => ({
    question: row.question,
    options: Array.isArray(row.options) ? row.options : JSON.parse(row.options || '[]'),
    answerIndex: row.answer_index
  }));
};

const run = async () => {
  if (!ttsEngine.isConfigured()) {
    console.error('No voice is configured on this server, so there is nothing to back fill with.');
    process.exit(1);
  }

  const { rows: lessons } = await pool.query(
    "SELECT id, title, body FROM content WHERE audio_url IS NULL OR audio_url = '' ORDER BY id"
  );
  console.log(`${lessons.length} lesson(s) have no audio.`);

  let voiced = 0;
  const failed = [];

  for (const lesson of lessons) {
    const script = speakable(lesson.title, lesson.body, await quizOf(lesson.id));
    if (!script) {
      failed.push(`${lesson.id} (${lesson.title}): nothing to read`);
      continue;
    }
    if (dryRun) {
      console.log(`${lesson.id} ${lesson.title}: would voice ${script.length} characters`);
      continue;
    }
    const started = Date.now();
    try {
      const name = await mediaStore.saveAudio(await ttsEngine.speak(script));
      await pool.query(
        'UPDATE content SET audio_url = $1, audio_is_synthetic = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [`/api/v1/media/${name}`, lesson.id]
      );
      voiced += 1;
      console.log(`${lesson.id} ${lesson.title}: ${name} in ${Math.round((Date.now() - started) / 1000)}s`);
    } catch (error) {
      // One lesson the voice cannot manage must not stop the rest.
      failed.push(`${lesson.id} (${lesson.title}): ${error.message}`);
    }
  }

  console.log(`\nVoiced ${voiced} of ${lessons.length}.`);
  if (failed.length) console.log(`Left alone:\n  ${failed.join('\n  ')}`);
  await pool.end();
  process.exit(failed.length ? 1 : 0);
};

run().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});
