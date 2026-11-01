// Labels and helpers shared by the staff portal components.
import type { QuizQuestion } from '../../types';

export const roleNames: Record<string, string> = { admin: 'Admin', creator: 'Writer', specialist: 'Specialist' };
export const issueStatus: Record<string, string> = { Open: 'New', 'In review': 'In review', Resolved: 'Resolved' };

// Illustrations shipped in frontend/public/images that staff can pick from.
export const imageChoices = ['bp-heart', 'bp-check', 'plate', 'salt', 'water', 'glucose', 'heart', 'stroke', 'screening', 'walking', 'medicine', 'foot-care', 'no-smoking']
  .map((name) => `/images/${name}.svg`);

export const emptyQuestion: QuizQuestion = { question: '', options: ['', ''], answerIndex: 0, explanation: '' };

export const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
