// Medical review by specialists. Each specialist is assigned one or more
// topics (lesson categories, e.g. a disease). A lesson in a topic that has a
// specialist must be approved by one of them before an admin can publish it.

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

const toIds = (values) => [...new Set((Array.isArray(values) ? values : []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];

export const getSpecialistTopics = (userId) => withFallback(
  async () => {
    const result = await pool.query('SELECT category_id FROM specialist_topics WHERE user_id = $1 ORDER BY category_id', [userId]);
    return result.rows.map((row) => row.category_id);
  },
  () => inMemoryStore.specialistTopics.filter((entry) => entry.userId === userId).map((entry) => entry.categoryId)
);

// Replaces a specialist's topics. `client` lets the caller run it inside a transaction.
export const setSpecialistTopics = (userId, categoryIds, client = pool) => withFallback(
  async () => {
    const ids = toIds(categoryIds);
    await client.query('DELETE FROM specialist_topics WHERE user_id = $1', [userId]);
    for (const categoryId of ids) {
      await client.query('INSERT INTO specialist_topics (user_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, categoryId]);
    }
    return ids;
  },
  () => {
    const ids = toIds(categoryIds);
    inMemoryStore.specialistTopics = inMemoryStore.specialistTopics.filter((entry) => entry.userId !== userId);
    ids.forEach((categoryId) => inMemoryStore.specialistTopics.push({ userId, categoryId }));
    return ids;
  }
);

// { [userId]: [categoryId, ...] } for the staff list.
export const topicsByUser = () => withFallback(
  async () => {
    const result = await pool.query('SELECT user_id, category_id FROM specialist_topics');
    return result.rows.reduce((map, row) => {
      (map[row.user_id] ||= []).push(row.category_id);
      return map;
    }, {});
  },
  () => inMemoryStore.specialistTopics.reduce((map, entry) => {
    (map[entry.userId] ||= []).push(entry.categoryId);
    return map;
  }, {})
);

export const topicHasSpecialist = (categoryId) => withFallback(
  async () => {
    const result = await pool.query('SELECT 1 FROM specialist_topics WHERE category_id = $1 LIMIT 1', [categoryId]);
    return Boolean(result.rows[0]);
  },
  () => inMemoryStore.specialistTopics.some((entry) => entry.categoryId === Number(categoryId))
);

const mapLesson = (row) => ({
  id: row.id,
  categoryId: row.category_id ?? row.categoryId,
  creatorId: row.creator_id ?? row.creatorId ?? null,
  creatorName: row.creator_name ?? row.creatorName ?? '',
  title: row.title,
  summary: row.summary || '',
  body: row.body,
  imageUrl: row.image_url ?? row.imageUrl ?? '',
  status: row.status,
  reviewNote: row.review_note ?? row.reviewNote ?? '',
  reviewedAt: row.reviewed_at ?? row.reviewedAt ?? null
});

// Lessons waiting for this specialist, plus the ones they already decided on.
export const reviewQueue = (userId) => withFallback(
  async () => {
    const result = await pool.query(`
      SELECT c.*, u.full_name AS creator_name
      FROM content c
      JOIN specialist_topics t ON t.category_id = c.category_id AND t.user_id = $1
      LEFT JOIN users u ON u.id = c.creator_id
      WHERE (c.status = 'review' AND (c.creator_id IS NULL OR c.creator_id <> $1))
         OR c.reviewed_by = $1
      ORDER BY c.status = 'review' DESC, c.updated_at DESC`, [userId]);
    return result.rows.map(mapLesson);
  },
  () => {
    const topics = inMemoryStore.specialistTopics.filter((entry) => entry.userId === userId).map((entry) => entry.categoryId);
    return inMemoryStore.content
      .filter((lesson) => topics.includes(lesson.categoryId))
      .filter((lesson) => (lesson.status === 'review' && lesson.creatorId !== userId) || lesson.reviewedBy === userId)
      .map((lesson) => mapLesson({ ...lesson, creatorName: inMemoryStore.users.find((user) => user.id === lesson.creatorId)?.fullName }))
      .sort((a, b) => Number(b.status === 'review') - Number(a.status === 'review'));
  }
);

// Approve, or send back with a note. Returns { error, status } or { lesson }.
export const recordReview = (lessonId, reviewerId, decision, note) => withFallback(
  async () => {
    const found = await pool.query('SELECT * FROM content WHERE id = $1', [lessonId]);
    const lesson = found.rows[0];
    const check = await canReview(lesson && { categoryId: lesson.category_id, creatorId: lesson.creator_id, status: lesson.status }, reviewerId);
    if (check) return check;
    const result = await pool.query(
      `UPDATE content SET status = $1, review_note = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [decision === 'approve' ? 'approved' : 'rejected', note, reviewerId, lessonId]
    );
    return { lesson: mapLesson(result.rows[0]) };
  },
  async () => {
    const lesson = inMemoryStore.content.find((entry) => entry.id === lessonId);
    const check = await canReview(lesson, reviewerId);
    if (check) return check;
    Object.assign(lesson, {
      status: decision === 'approve' ? 'approved' : 'rejected',
      reviewNote: note,
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString()
    });
    return { lesson: mapLesson(lesson) };
  }
);

async function canReview(lesson, reviewerId) {
  if (!lesson) return { status: 404, error: 'Lesson not found' };
  if (lesson.status !== 'review') return { status: 409, error: 'Only lessons waiting for review can be reviewed' };
  if (Number(lesson.creatorId) === Number(reviewerId)) return { status: 403, error: 'You cannot review your own lesson' };
  const topics = await getSpecialistTopics(reviewerId);
  if (!topics.includes(Number(lesson.categoryId))) return { status: 403, error: 'This lesson is outside your specialty' };
  return null;
}
