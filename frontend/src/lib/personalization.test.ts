import { describe, expect, it } from 'vitest';

import type { Category, Curriculum, Lesson } from '../types';
import { ALL, filterLessons, learnerTopics, MINE, orderDiseases, pathProgress, profileTags, rankLessons, recommendedPaths, riskTagsFromAnswers } from './personalization';

const lesson = (id: number, category: string): Lesson => ({
  id, title: `Isomo ${id}`, categoryId: 0, category, summary: '', body: '', duration: '1 min', audioUrl: '', imageUrl: '', quiz: []
});
const path = (id: number, slug: string, condition: string | null, lessonIds: number[], categoryId: number | null = null): Curriculum => ({
  id, slug, title: slug, condition, description: '', imageUrl: '', lessonIds, categoryId, icon: '', about: '', riskFactors: [], warningSigns: [], prevention: []
});

describe('rankLessons', () => {
  const lessons = [lesson(1, 'Imirire'), lesson(2, 'Diyabete'), lesson(3, 'Kanseri'), lesson(4, 'Diyabete')];

  it('puts risk matches above interest matches, and both above unrelated lessons', () => {
    const ranked = rankLessons(lessons, ['Imirire'], ['Diyabete'], []);
    expect(ranked.map((item) => item.lesson.id)).toEqual([4, 2, 1, 3]);
    expect(ranked[0].score).toBe(3);
    expect(ranked[2].score).toBe(2);
    expect(ranked[3].score).toBe(0);
  });

  it('adds both scores when a lesson matches an interest and a risk', () => {
    const [top] = rankLessons(lessons, ['Diyabete'], ['Diyabete'], []);
    expect(top.score).toBe(5);
    expect(top.reasons).toHaveLength(2);
  });

  it('pushes completed lessons down and breaks ties with the newest lesson first', () => {
    const ranked = rankLessons(lessons, [], ['Diyabete'], [4]);
    expect(ranked[0].lesson.id).toBe(2);
    expect(ranked.at(-1)?.lesson.id).toBe(4);
    expect(ranked.at(-1)?.score).toBe(-1);
  });

  it('returns an empty list for no lessons', () => {
    expect(rankLessons([], ['Imirire'], [], [])).toEqual([]);
  });
});

describe('riskTagsFromAnswers', () => {
  it('turns "yes" answers into topic tags', () => {
    expect(riskTagsFromAnswers({ salt: true })).toEqual(['Umuvuduko w\'amaraso', 'Imirire']);
  });

  it('treats "no" as the risk for questions about healthy habits', () => {
    expect(riskTagsFromAnswers({ activity: false })).toEqual(['Imyitozo ngororamubiri', 'Ubuzima bw\'umutima']);
    expect(riskTagsFromAnswers({ activity: true })).toEqual([]);
  });

  it('ignores unanswered questions and removes duplicate tags', () => {
    const tags = riskTagsFromAnswers({ age: true, family: true, salt: false });
    expect(tags).toEqual(['Diyabete', 'Umuvuduko w\'amaraso']);
  });
});

describe('recommendedPaths and profileTags', () => {
  const categories: Category[] = [{ id: 3, name: 'Diyabete', slug: 'diabetes' }];
  const curricula = [path(1, 'prevention', null, [1, 2]), path(2, 'diabetes', 'Diyabete', [2, 4], 3), path(3, 'cancer', 'Kanseri', [3])];

  it('recommends the paths of the diagnosed conditions', () => {
    expect(recommendedPaths(curricula, ['Diyabete']).map((item) => item.slug)).toEqual(['diabetes']);
  });

  it('falls back to the prevention path when no condition matches', () => {
    expect(recommendedPaths(curricula, []).map((item) => item.slug)).toEqual(['prevention']);
  });

  it('maps a diagnosed condition to its lesson topic and merges risk tags', () => {
    const tags = profileTags({ conditions: ['Diyabete'], answers: { sugar: true } }, curricula, categories);
    expect(tags).toEqual(['Diyabete', 'Imirire']);
  });
});

describe('pathProgress', () => {
  it('counts completed lessons and finds the next one in order', () => {
    expect(pathProgress(path(2, 'diabetes', 'Diyabete', [2, 4, 7]), [4, 9])).toEqual({ done: 1, total: 3, nextId: 2 });
  });

  it('has no next lesson when the path is finished', () => {
    expect(pathProgress(path(2, 'diabetes', 'Diyabete', [2, 4]), [2, 4]).nextId).toBeNull();
  });
});

describe('learner choices', () => {
  const categories: Category[] = [{ id: 2, name: 'Umuvuduko w\'amaraso', slug: 'bp' }, { id: 3, name: 'Diyabete', slug: 'diabetes' }, { id: 5, name: 'Kanseri', slug: 'cancer' }];
  const diseases = [path(1, 'bp', 'Umuvuduko w\'amaraso ukabije', [1], 2), path(2, 'diabetes', 'Diyabete', [2], 3), path(3, 'cancer', 'Kanseri', [3], 5)];

  it('merges sign-up topics and health-profile topics without duplicates', () => {
    expect(learnerTopics(['Diyabete', 'Imirire'], ['Diyabete', 'Kanseri'])).toEqual(['Diyabete', 'Imirire', 'Kanseri']);
  });

  it('puts the diseases the learner chose first and keeps the rest', () => {
    const { ordered, chosenIds } = orderDiseases(diseases, ['Kanseri'], ['Diyabete'], categories);
    expect(ordered.map((item) => item.id)).toEqual([2, 3, 1]);
    expect(chosenIds).toEqual([2, 3]);
  });

  it('keeps the original order when nothing was chosen', () => {
    expect(orderDiseases(diseases, [], [], categories).ordered.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it('shows only the learner\'s topics under "Ibyo wahisemo", most relevant first', () => {
    const lessons = [lesson(1, 'Imirire'), lesson(2, 'Diyabete'), lesson(3, 'Kanseri'), lesson(4, 'Diyabete')];
    const ranked = rankLessons(lessons, ['Imirire'], ['Diyabete'], []);
    expect(filterLessons(ranked, lessons, MINE, ['Imirire', 'Diyabete']).map((item) => item.id)).toEqual([4, 2, 1]);
    expect(filterLessons(ranked, lessons, ALL, ['Imirire']).map((item) => item.id)).toEqual([1, 2, 3, 4]);
    expect(filterLessons(ranked, lessons, 'Kanseri', ['Imirire']).map((item) => item.id)).toEqual([3]);
    expect(filterLessons(ranked, lessons, MINE, []).map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });
});
