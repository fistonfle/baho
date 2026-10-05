import type { Category, Curriculum, QuizQuestion, QuizScore } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
let authToken: string | null = null;

export type DiseasePayload = {
  name: string;
  icon: string;
  about: string;
  description?: string;
  imageUrl?: string;
  riskFactors: string[];
  warningSigns: string[];
  prevention: string[];
};

export type ContentPayload = {
  categoryId: number;
  title: string;
  summary?: string;
  body: string;
  audioUrl?: string;
  imageUrl?: string;
  status?: string;
  quiz?: QuizQuestion[];
  curriculumIds?: number[];
};

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const errorBody = await response.json();
      message = errorBody.message || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  setAuthToken,
  getContent: () => request<{ content: any[] }>('/content'),
  getCategories: () => request<{ categories: Category[] }>('/categories'),
  createDisease: (payload: DiseasePayload) =>
    request<{ message: string; disease: Curriculum }>('/admin/diseases', { method: 'POST', body: JSON.stringify(payload) }),
  updateDisease: (id: number, payload: DiseasePayload) =>
    request<{ message: string; disease: Curriculum }>(`/admin/diseases/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getReminders: () => request<{ reminders: { id: number; time: string; label: string }[] }>('/reminders'),
  createReminder: (payload: { time: string; label: string }) =>
    request<{ message: string; reminder: { id: number; time: string; label: string } }>('/reminders', { method: 'POST', body: JSON.stringify(payload) }),
  deleteReminder: (id: number) => request<{ message: string }>(`/reminders/${id}`, { method: 'DELETE' }),
  getProgress: () => request<{ completedLessonIds: number[]; quizScores: QuizScore[]; quizAverage: number | null }>('/progress'),
  getCurricula: () => request<{ curricula: Curriculum[] }>('/curricula'),
  submitQuizAttempt: (contentId: number, answers: number[]) =>
    request<{ score: number; total: number; correct: boolean[] }>('/quiz-attempts', { method: 'POST', body: JSON.stringify({ contentId, answers }) }),
  completeLesson: (id: number) => request<{ message: string; contentId: number }>(`/progress/${id}/complete`, { method: 'POST' }),
  getFaqs: () => request<{ faqs: any[] }>('/faq'),
  createFaq: (payload: { question: string; answer: string }) =>
    request<{ message: string; faq: any }>('/admin/faqs', { method: 'POST', body: JSON.stringify(payload) }),
  updateFaq: (id: number, payload: { question: string; answer: string }) =>
    request<{ message: string; faq: any }>(`/admin/faqs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteFaq: (id: number) => request<{ message: string }>(`/admin/faqs/${id}`, { method: 'DELETE' }),
  getQuestions: () => request<{ questions: any[] }>('/questions'),
  createQuestion: (payload: { topic: string; question: string }) =>
    request<{ message: string; question: any }>('/questions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  answerQuestion: (id: number, answer: string) =>
    request<{ message: string; question: any }>(`/questions/${id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answer })
    }),
  createCreator: (payload: { fullName: string; email: string; password: string; role?: string }) =>
    request<{ message: string; user: any }>('/admin/creators', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  createContent: (payload: ContentPayload) =>
    request<{ message: string; content: any }>('/admin/content', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  createIssue: (payload: { title: string; description: string }) =>
    request<{ message: string; issue: any }>('/issues', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getAdminContent: () => request<{ content: any[] }>('/admin/content'),
  getCreators: () => request<{ staff: any[] }>('/admin/creators'),
  getAdminIssues: () => request<{ issues: any[] }>('/admin/issues'),
  updateContent: (id: number, payload: ContentPayload) =>
    request<{ message: string; content: any }>(`/admin/content/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  updateContentStatus: (id: number, status: string) =>
    request<{ message: string; content: any }>(`/admin/content/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteContent: (id: number) => request<{ message: string }>(`/admin/content/${id}`, { method: 'DELETE' }),
  updateIssueStatus: (id: number, status: string) =>
    request<{ message: string; issue: any }>(`/admin/issues/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  register: (payload: { name: string; email: string; password: string }) =>
    request<{ message: string; token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};
