// Lesson ranking for the 'for you' list. Runs only on the device.

import { riskQuestions } from '../data/healthContent';
import type { Category, Curriculum, Interest, Lesson } from '../types';

export type RiskAnswers = Record<string, boolean>;

// Everything the learner tells Baho about their health. Stored encrypted on the device.
export type HealthProfile = {
  conditions: string[];
  answers: RiskAnswers;
};

export const emptyHealthProfile: HealthProfile = { conditions: [], answers: {} };

// Paths that match the learner's diagnosed conditions, or the prevention path.
export const recommendedPaths = (curricula: Curriculum[], conditions: string[]) => {
  const matching = curricula.filter((curriculum) => curriculum.condition && conditions.includes(curriculum.condition));
  if (matching.length) return matching;
  return curricula.filter((curriculum) => curriculum.slug === 'prevention');
};

// Position in a path: the first lesson not yet completed is the next one.
export const pathProgress = (curriculum: Curriculum, completedIds: number[]) => {
  const done = curriculum.lessonIds.filter((id) => completedIds.includes(id)).length;
  const nextId = curriculum.lessonIds.find((id) => !completedIds.includes(id)) ?? null;
  return { done, total: curriculum.lessonIds.length, nextId };
};

export type RankedLesson = {
  lesson: Lesson;
  score: number;
  reasons: string[];
};

// Tags from diagnosed conditions and risk answers.
export const profileTags = (profile: HealthProfile, diseases: Curriculum[], categories: Category[]): Interest[] => {
  const fromConditions = profile.conditions
    .map((condition) => diseases.find((disease) => disease.condition === condition)?.categoryId)
    .map((categoryId) => categories.find((category) => category.id === categoryId)?.name)
    .filter((name): name is string => Boolean(name));
  return [...new Set([...fromConditions, ...riskTagsFromAnswers(profile.answers)])];
};

export const riskTagsFromAnswers = (answers: RiskAnswers): Interest[] => {
  const tags = new Set<Interest>();
  riskQuestions.forEach((question) => {
    const answer = answers[question.id];
    if (answer === undefined) return;
    const atRisk = question.riskOnNo ? !answer : answer;
    if (atRisk) question.tags.forEach((tag) => tags.add(tag));
  });
  return [...tags];
};

// score = 2 per topic + 3 per risk tag - 4 if done; newer first on ties.
export const rankLessons = (
  lessons: Lesson[],
  interests: Interest[],
  riskTags: Interest[],
  completedIds: number[]
): RankedLesson[] => {
  return lessons
    .map((lesson) => {
      const category = lesson.category;
      const reasons: string[] = [];
      let score = 0;
      if (interests.includes(category)) {
        score += 2;
        reasons.push('Wahisemo iyi ngingo');
      }
      if (riskTags.includes(category)) {
        score += 3;
        reasons.push('Bijyanye n\'isuzuma ryawe');
      }
      if (completedIds.includes(lesson.id)) {
        score -= 4;
        reasons.push('Warirangije');
      }
      return { lesson, score, reasons };
    })
    .sort((a, b) => b.score - a.score || b.lesson.id - a.lesson.id);
};

// The learner's own topics: those chosen at sign-up plus those from the health profile.
export const learnerTopics = (interests: Interest[], riskTags: Interest[]): Interest[] => [...new Set([...interests, ...riskTags])];

// Chosen diseases first.
export const orderDiseases = (diseases: Curriculum[], conditions: string[], topics: Interest[], categories: Category[]) => {
  const topicOf = (disease: Curriculum) => categories.find((category) => category.id === disease.categoryId)?.name;
  const isChosen = (disease: Curriculum) => conditions.includes(disease.condition ?? '') || topics.includes(topicOf(disease) ?? '');
  const chosen = diseases.filter(isChosen);
  return { ordered: [...chosen, ...diseases.filter((disease) => !isChosen(disease))], chosenIds: chosen.map((disease) => disease.id) };
};

// MINE = my topics (or all if none chosen), ALL = everything, else one topic.
export const MINE = 'Mine';
export const ALL = 'All';
export const filterLessons = (ranked: RankedLesson[], lessons: Lesson[], filter: string, topics: Interest[]) => {
  if (filter === MINE && topics.length) return ranked.filter((item) => topics.includes(item.lesson.category)).map((item) => item.lesson);
  if (filter === MINE || filter === ALL) return lessons;
  return lessons.filter((lesson) => lesson.category === filter);
};
