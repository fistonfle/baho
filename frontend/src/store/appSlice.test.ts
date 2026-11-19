import { describe, expect, it } from 'vitest';

import reducer, { clearAuthenticatedUser, clearLearnerData, clearSessionData, markLessonComplete, recordQuizScore, setAuthenticatedUser } from './appSlice';

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

  it('leaves nothing of the staff portal behind for the next person on the phone', () => {
    const loaded = {
      ...initial,
      adminContent: [{ id: 1, title: 'Umuvuduko', status: 'review' }],
      adminCreators: [{ id: 2, fullName: 'Dr Keza', email: 'keza@example.rw', role: 'specialist' }],
      issues: [{ id: 3, title: 'Audio', description: 'Ntiyumvikana', status: 'open' }],
      answerDrafts: { 4: 'Igisubizo' },
      editingContentId: 1,
      feedbackMessage: 'Saved'
    } as unknown as typeof initial;
    const cleared = reducer(loaded, clearSessionData());
    expect(cleared.adminContent).toHaveLength(0);
    expect(cleared.adminCreators).toHaveLength(0);
    expect(cleared.issues).toHaveLength(0);
    expect(cleared.answerDrafts).toEqual({});
    expect(cleared.editingContentId).toBeNull();
    expect(cleared.feedbackMessage).toBe('');
  });

  it('does not open an account on top of the guest learner data', () => {
    const guest = {
      ...initial,
      userName: 'Mukamana',
      selectedInterests: ['Umuvuduko w\'amaraso'],
      completedLessons: [1, 2],
      quizScores: [{ contentId: 1, score: 2, total: 2 }],
      riskTags: ['bp']
    } as unknown as typeof initial;
    const cleared = reducer(guest, clearLearnerData());
    expect(cleared.userName).toBe('');
    expect(cleared.selectedInterests).toHaveLength(0);
    expect(cleared.completedLessons).toHaveLength(0);
    expect(cleared.quizScores).toHaveLength(0);
    expect(cleared.riskTags).toHaveLength(0);
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
