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

// In development the API is on another port.
export const mediaUrl = (path: string) =>
  path.startsWith('/api/v1/') ? `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}${path}` : path;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export type Learner = {
  id: number;
  fullName: string;
  phone: string;
  createdAt: string | null;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  // Files (recordings) are sent as they are; everything else is JSON.
  if (!(options.body instanceof Blob)) headers.set('Content-Type', 'application/json');
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
  createQuestion: (payload: { topic?: string; question: string; contentId?: number }) =>
    request<{ message: string; question: any }>('/questions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  // A writer drafts; the specialist for the disease approves, which sends it.
  draftAnswer: (id: number, answer: string) =>
    request<{ message: string; question: any }>(`/questions/${id}/draft`, {
      method: 'POST',
      body: JSON.stringify({ answer })
    }),
  answerQuestion: (id: number, answer?: string) =>
    request<{ message: string; question: any }>(`/questions/${id}/answer`, {
      method: 'POST',
      body: JSON.stringify(answer === undefined ? {} : { answer })
    }),
  createCreator: (payload: { fullName: string; email: string; role?: string; topicIds?: number[] }) =>
    request<{ message: string; user: any; invite?: { delivered: boolean; expiresInMinutes: number; link?: string } }>('/admin/creators', {
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
  updateSpecialistTopics: (id: number, categoryIds: number[]) =>
    request<{ message: string; categoryIds: number[] }>(`/admin/staff/${id}/topics`, { method: 'PUT', body: JSON.stringify({ categoryIds }) }),
  uploadAudio: (file: File) =>
    request<{ url: string }>('/admin/media/audio', { method: 'POST', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } }),
  getReviewQueue: () => request<{ lessons: any[] }>('/review/queue'),
  reviewLesson: (id: number, decision: 'approve' | 'changes', note: string) =>
    request<{ message: string; lesson: any }>(`/review/lessons/${id}`, { method: 'POST', body: JSON.stringify({ decision, note }) }),
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
  login: (payload: { identifier: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  register: (payload: { name: string; phone: string; pin: string }) =>
    request<{ message: string; token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  // resetLink is only returned in development.
  forgotPassword: (payload: { email: string }) =>
    request<{ message: string; resetLink?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  resetPassword: (payload: { token: string; password: string }) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  // Admin: learners and PIN reset.
  getLearners: (search = '') =>
    request<{ learners: Learner[] }>(`/admin/learners${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  resetLearnerPin: (id: number, pin?: string) =>
    request<{ message: string; pin: string; learner: Learner }>(`/admin/learners/${id}/pin`, {
      method: 'POST',
      body: JSON.stringify(pin ? { pin } : {})
    }),
  // Changing your own PIN (learners) or password (staff).
  changePassword: (payload: { current: string; next: string }) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  // Learner email ('' removes it) and push.
  getPushKey: () => request<{ key: string | null; enabled: boolean }>('/push/key'),
  getPushStatus: () => request<{ enabled: boolean; devices: boolean }>('/push/status'),
  subscribePush: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    request<{ message: string }>('/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) }),
  unsubscribePush: (endpoint: string) =>
    request<{ message: string }>('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
  setMyEmail: (email: string) =>
    request<{ message: string; user: { id: number; name: string; email: string | null; phone: string | null; role: string } }>('/profile/email', {
      method: 'PATCH',
      body: JSON.stringify({ email })
    })
};
