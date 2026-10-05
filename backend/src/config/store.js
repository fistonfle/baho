import { seedCategories, seedCurricula, seedFaqs, seedLessons } from './seedData.js';

// In-memory data used when PostgreSQL is unavailable (demo mode and tests).
const content = seedLessons.map(({ quiz, ...lesson }, index) => ({ id: index + 1, ...lesson, creatorId: null, status: 'published' }));
const lessonId = (title) => content.find((lesson) => lesson.title === title).id;

export const inMemoryStore = {
  users: [],
  staff: [],
  reminders: [],
  progress: [],
  categories: seedCategories.map((category) => ({ ...category })),
  content,
  curricula: seedCurricula.map(({ lessons, categorySlug, ...curriculum }, index) => ({
    id: index + 1,
    ...curriculum,
    categoryId: seedCategories.find((category) => category.slug === categorySlug)?.id ?? null
  })),
  curriculumLessons: seedCurricula.flatMap((curriculum, index) =>
    curriculum.lessons.map((title, position) => ({ curriculumId: index + 1, contentId: lessonId(title), position }))
  ),
  quizQuestions: seedLessons.flatMap((lesson) =>
    lesson.quiz.map((item, position) => ({ id: `${lessonId(lesson.title)}-${position}`, contentId: lessonId(lesson.title), position, ...item }))
  ),
  quizAttempts: [],
  faqs: seedFaqs.map((faq, index) => ({ id: index + 1, ...faq })),
  issues: [],
  questions: []
};
