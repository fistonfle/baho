import { describe, expect, it } from 'vitest';

import reducer, { clearAuthenticatedUser, markLessonComplete, recordQuizScore, setAuthenticatedUser } from './appSlice';

const initial = reducer(undefined, { type: 'init' });
const user = (role: string) => ({ token: 't', user: { id: 1, name: 'Uwase', email: null, phone: '+250781234567', role } });

describe('appSlice', () => {
  it('sends learners to the dashboard and staff to the staff portal after sign-in', () => {
    expect(reducer(initial, setAuthenticatedUser(user('learner'))).currentScreen).toBe('dashboard');
    for (const role of ['admin', 'creator', 'specialist']) {
      expect(reducer(initial, setAuthenticatedUser(user(role))).currentScreen).toBe('admin');
    }
  });

  it('keeps the learner name on the device when a staff member signs in', () => {
    const named = { ...initial, userName: 'Mukamana' };
    expect(reducer(named, setAuthenticatedUser(user('admin'))).userName).toBe('Mukamana');
    expect(reducer(named, setAuthenticatedUser(user('learner'))).userName).toBe('Uwase');
  });

  it('clears the account on sign-out', () => {
    const signedIn = reducer(initial, setAuthenticatedUser(user('learner')));
    const signedOut = reducer(signedIn, clearAuthenticatedUser());
    expect(signedOut.authUser).toBeNull();
    expect(signedOut.authToken).toBeNull();
  });

  it('records a completed lesson only once', () => {
    const once = reducer(initial, markLessonComplete(7));
    expect(reducer(once, markLessonComplete(7)).completedLessons.filter((id) => id === 7)).toHaveLength(1);
  });

  it('keeps the best quiz score for each lesson', () => {
    const first = reducer(initial, recordQuizScore({ contentId: 3, score: 2, total: 2 }));
    const worse = reducer(first, recordQuizScore({ contentId: 3, score: 1, total: 2 }));
    expect(worse.quizScores.find((item) => item.contentId === 3)?.score).toBe(2);
  });
});
