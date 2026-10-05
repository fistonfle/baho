import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { defaultCategories, offlineLessons } from '../data/healthContent';
import type { Category, Curriculum, Interest, IssueReport, Lesson, QuestionItem, QuizQuestion, QuizScore, Reminder } from '../types';

export type Screen = 'landing' | 'auth' | 'onboarding' | 'risk' | 'paths' | 'dashboard' | 'library' | 'ncd' | 'checkup' | 'exercise' | 'reminders' | 'faq' | 'admin';

export const defaultLessons: Lesson[] = offlineLessons;

export const defaultReminders: Reminder[] = [
  { id: 1, time: '08:00', label: 'Kunywa amazi' },
  { id: 2, time: '17:00', label: 'Imyitozo ya 15 min' },
  { id: 3, time: '20:00', label: 'Soma isomo ryo mu mutima' }
];

export const defaultIssues: IssueReport[] = [];

export const defaultQuestions: QuestionItem[] = [];

export const defaultFaqItems = [
  { question: 'Baho ikora gute?', answer: 'Baho itanga amakuru, amajwi, imyitozo n\'ibibutsa kugira ngo abantu babashe kwibanda ku buzima bwabo.' },
  { question: 'Ese ibifasha mu Kinyarwanda?', answer: 'Yego, Baho ifite ibiri mu Kinyarwanda kugira ngo byoroshye kubasha abantu bazi ururimi rw\'ibanze.' },
  { question: 'Nshobora guhamagara ubufasha?', answer: 'Yego, ushobora gutanga ikibazo cyangwa uhabwe ubufasha mu gice cy\'ibibazo no gufasha.' }
];

export type ContentForm = {
  categoryId: number;
  title: string;
  summary: string;
  body: string;
  audioUrl: string;
  imageUrl: string;
  status: string;
  quiz: QuizQuestion[];
  curriculumIds: number[];
};

export type AdminContentItem = {
  id: number;
  title: string;
  status: string;
  categoryId?: number;
  summary?: string;
  body?: string;
  audioUrl?: string;
  imageUrl?: string;
  quiz?: QuizQuestion[];
  curriculumIds?: number[];
};

export const emptyContentForm: ContentForm = { categoryId: 1, title: '', summary: '', body: '', audioUrl: '', imageUrl: '', status: 'draft', quiz: [], curriculumIds: [] };

interface AppState {
  currentScreen: Screen;
  userName: string;
  selectedInterests: Interest[];
  lessons: Lesson[];
  selectedLesson: Lesson;
  reminders: Reminder[];
  reminderForm: { time: string; label: string };
  issues: IssueReport[];
  issueForm: { title: string; description: string };
  creatorForm: { fullName: string; email: string; password: string; role: string };
  authForm: { name: string; email: string; password: string };
  authMode: 'login' | 'register';
  authUser: { id: number; name: string; email: string; role: string } | null;
  authToken: string | null;
  feedbackMessage: string;
  contentForm: ContentForm;
  questionForm: { topic: string; question: string };
  answerDrafts: Record<number, string>;
  faqItems: { id?: number; question: string; answer: string }[];
  faqForm: { question: string; answer: string };
  questions: QuestionItem[];
  adminCreators: { id: number; fullName: string; email: string; role: string }[];
  adminContent: AdminContentItem[];
  curricula: Curriculum[];
  categories: Category[];
  quizScores: QuizScore[];
  editingContentId: number | null;
  isOnline: boolean;
  riskTags: Interest[];
  activeCategory: string;
  selectedNcdTopic: number;
  completedLessons: number[];
}

const initialState: AppState = {
  currentScreen: 'landing',
  userName: '',
  selectedInterests: ['Umuvuduko w\'amaraso', 'Imirire', 'Imyitozo ngororamubiri'],
  lessons: defaultLessons,
  selectedLesson: defaultLessons[0],
  reminders: defaultReminders,
  reminderForm: { time: '21:00', label: 'Soma isomo ryo mu buzima' },
  issues: defaultIssues,
  issueForm: { title: '', description: '' },
  creatorForm: { fullName: '', email: '', password: '', role: 'creator' },
  authForm: { name: '', email: '', password: '' },
  authMode: 'login',
  authUser: null,
  authToken: null,
  feedbackMessage: '',
  contentForm: emptyContentForm,
  questionForm: { topic: 'Umuvuduko w\'amaraso', question: '' },
  answerDrafts: {},
  faqItems: defaultFaqItems,
  faqForm: { question: '', answer: '' },
  questions: defaultQuestions,
  adminCreators: [],
  adminContent: [],
  curricula: [],
  categories: defaultCategories,
  quizScores: [],
  editingContentId: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  riskTags: [],
  activeCategory: 'All',
  selectedNcdTopic: 0,
  completedLessons: []
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setCurrentScreen: (state, action: PayloadAction<Screen>) => {
      state.currentScreen = action.payload;
    },
    setUserName: (state, action: PayloadAction<string>) => {
      state.userName = action.payload;
    },
    toggleInterest: (state, action: PayloadAction<Interest>) => {
      const interest = action.payload;
      if (state.selectedInterests.includes(interest)) {
        state.selectedInterests = state.selectedInterests.filter((item) => item !== interest);
      } else {
        state.selectedInterests = [...state.selectedInterests, interest];
      }
    },
    setLessons: (state, action: PayloadAction<Lesson[]>) => {
      state.lessons = action.payload;
      // Keep the open lesson, but use the freshly loaded copy of it.
      state.selectedLesson = state.lessons.find((lesson) => lesson.id === state.selectedLesson?.id) ?? state.lessons[0] ?? state.selectedLesson;
    },
    setSelectedLesson: (state, action: PayloadAction<Lesson>) => {
      state.selectedLesson = action.payload;
    },
    setReminders: (state, action: PayloadAction<Reminder[]>) => {
      state.reminders = action.payload;
    },
    updateReminderForm: (state, action: PayloadAction<Partial<{ time: string; label: string }>>) => {
      state.reminderForm = { ...state.reminderForm, ...action.payload };
    },
    addReminder: (state) => {
      const label = state.reminderForm.label.trim() || 'Soma isomo ryo mu buzima';
      state.reminders = [...state.reminders, { id: Date.now(), time: state.reminderForm.time, label }]
        .sort((a, b) => a.time.localeCompare(b.time));
      state.reminderForm = { time: '21:00', label: 'Soma isomo ryo mu buzima' };
    },
    deleteReminder: (state, action: PayloadAction<number>) => {
      state.reminders = state.reminders.filter((item) => item.id !== action.payload);
    },
    setIssues: (state, action: PayloadAction<IssueReport[]>) => {
      state.issues = action.payload;
    },
    updateIssueForm: (state, action: PayloadAction<Partial<{ title: string; description: string }>>) => {
      state.issueForm = { ...state.issueForm, ...action.payload };
    },
    updateCreatorForm: (state, action: PayloadAction<Partial<{ fullName: string; email: string; password: string; role: string }>>) => {
      state.creatorForm = { ...state.creatorForm, ...action.payload };
    },
    addCreatorLocal: (state, action: PayloadAction<{ id: number; fullName: string; email: string; role: string }>) => {
      state.adminCreators = [action.payload, ...state.adminCreators];
      state.creatorForm = { fullName: '', email: '', password: '', role: 'creator' };
    },
    updateContentForm: (state, action: PayloadAction<Partial<ContentForm>>) => {
      state.contentForm = { ...state.contentForm, ...action.payload };
    },
    addContentLocal: (state, action: PayloadAction<AdminContentItem>) => {
      state.adminContent = [action.payload, ...state.adminContent];
      state.contentForm = emptyContentForm;
      state.editingContentId = null;
    },
    setEditingContentId: (state, action: PayloadAction<number | null>) => {
      state.editingContentId = action.payload;
    },
    updateContentLocal: (state, action: PayloadAction<AdminContentItem>) => {
      state.adminContent = state.adminContent.map((item) => item.id === action.payload.id ? action.payload : item);
      state.contentForm = emptyContentForm;
      state.editingContentId = null;
    },
    addIssueLocal: (state, action: PayloadAction<IssueReport>) => {
      state.issues = [action.payload, ...state.issues];
      state.issueForm = { title: '', description: '' };
    },
    setFaqItems: (state, action: PayloadAction<{ id?: number; question: string; answer: string }[]>) => {
      state.faqItems = action.payload;
    },
    updateFaqForm: (state, action: PayloadAction<Partial<{ question: string; answer: string }>>) => {
      state.faqForm = { ...state.faqForm, ...action.payload };
    },
    addFaqLocal: (state, action: PayloadAction<{ id: number; question: string; answer: string }>) => {
      state.faqItems = [...state.faqItems, action.payload];
      state.faqForm = { question: '', answer: '' };
    },
    updateFaqLocal: (state, action: PayloadAction<{ id: number; question: string; answer: string }>) => {
      state.faqItems = state.faqItems.map((item) => item.id === action.payload.id ? action.payload : item);
    },
    removeFaqLocal: (state, action: PayloadAction<number>) => {
      state.faqItems = state.faqItems.filter((item) => item.id !== action.payload);
    },
    updateQuestionForm: (state, action: PayloadAction<Partial<{ topic: string; question: string }>>) => {
      state.questionForm = { ...state.questionForm, ...action.payload };
    },
    updateAnswerDraft: (state, action: PayloadAction<{ id: number; answer: string }>) => {
      state.answerDrafts[action.payload.id] = action.payload.answer;
    },
    setQuestions: (state, action: PayloadAction<QuestionItem[]>) => {
      state.questions = action.payload;
    },
    addQuestionLocal: (state, action: PayloadAction<QuestionItem>) => {
      state.questions = [action.payload, ...state.questions];
      state.questionForm = { topic: 'Umuvuduko w\'amaraso', question: '' };
    },
    answerQuestionSuccess: (state, action: PayloadAction<{ id: number; answer: string }>) => {
      state.questions = state.questions.map((item) =>
        item.id === action.payload.id ? { ...item, status: 'Answered', answer: action.payload.answer } : item
      );
      delete state.answerDrafts[action.payload.id];
    },
    setIsOnline: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setRiskTags: (state, action: PayloadAction<Interest[]>) => {
      state.riskTags = action.payload;
    },
    setSelectedInterests: (state, action: PayloadAction<Interest[]>) => {
      state.selectedInterests = action.payload;
    },
    setActiveCategory: (state, action: PayloadAction<string>) => {
      state.activeCategory = action.payload;
    },
    setSelectedNcdTopic: (state, action: PayloadAction<number>) => {
      state.selectedNcdTopic = action.payload;
    },
    setCompletedLessons: (state, action: PayloadAction<number[]>) => {
      state.completedLessons = action.payload;
    },
    markLessonComplete: (state, action: PayloadAction<number>) => {
      if (!state.completedLessons.includes(action.payload)) {
        state.completedLessons = [...state.completedLessons, action.payload];
      }
    },
    updateAuthForm: (state, action: PayloadAction<Partial<{ name: string; email: string; password: string }>>) => {
      state.authForm = { ...state.authForm, ...action.payload };
    },
    setAuthMode: (state, action: PayloadAction<'login' | 'register'>) => {
      state.authMode = action.payload;
    },
    setAuthenticatedUser: (state, action: PayloadAction<{ token: string; user: { id: number; name: string; email: string; role: string } }>) => {
      state.authToken = action.payload.token;
      state.authUser = action.payload.user;
      state.userName = action.payload.user.name;
      state.authForm = { name: '', email: '', password: '' };
      state.feedbackMessage = '';
      state.currentScreen = action.payload.user.role === 'admin' || action.payload.user.role === 'creator' ? 'admin' : 'dashboard';
    },
    clearAuthenticatedUser: (state) => {
      state.authToken = null;
      state.authUser = null;
      state.currentScreen = 'landing';
    },
    setFeedbackMessage: (state, action: PayloadAction<string>) => {
      state.feedbackMessage = action.payload;
    },
    setCurricula: (state, action: PayloadAction<Curriculum[]>) => {
      state.curricula = action.payload;
    },
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
    // Replaces one path or disease (or adds it) after a staff edit.
    upsertCurriculum: (state, action: PayloadAction<Curriculum>) => {
      const exists = state.curricula.some((item) => item.id === action.payload.id);
      state.curricula = exists
        ? state.curricula.map((item) => (item.id === action.payload.id ? action.payload : item))
        : [...state.curricula, action.payload];
    },
    setQuizScores: (state, action: PayloadAction<QuizScore[]>) => {
      state.quizScores = action.payload;
    },
    recordQuizScore: (state, action: PayloadAction<QuizScore>) => {
      const previous = state.quizScores.find((item) => item.contentId === action.payload.contentId);
      if (previous && previous.score / previous.total >= action.payload.score / action.payload.total) return;
      state.quizScores = [...state.quizScores.filter((item) => item.contentId !== action.payload.contentId), action.payload];
    },
    setAdminContent: (state, action: PayloadAction<AdminContentItem[]>) => {
      state.adminContent = action.payload;
    },
    setAdminCreators: (state, action: PayloadAction<{ id: number; fullName: string; email: string; role: string }[]>) => {
      state.adminCreators = action.payload;
    }
  }
});

export const {
  setCurrentScreen,
  setUserName,
  toggleInterest,
  setLessons,
  setSelectedLesson,
  setReminders,
  updateReminderForm,
  addReminder,
  deleteReminder,
  setIssues,
  updateIssueForm,
  updateCreatorForm,
  addCreatorLocal,
  updateContentForm,
  addContentLocal,
  setEditingContentId,
  updateContentLocal,
  addIssueLocal,
  setFaqItems,
  updateFaqForm,
  addFaqLocal,
  updateFaqLocal,
  removeFaqLocal,
  updateQuestionForm,
  updateAnswerDraft,
  setQuestions,
  addQuestionLocal,
  answerQuestionSuccess,
  setIsOnline,
  setRiskTags,
  setSelectedInterests,
  setActiveCategory,
  setSelectedNcdTopic,
  setCompletedLessons,
  markLessonComplete,
  updateAuthForm,
  setAuthMode,
  setAuthenticatedUser,
  clearAuthenticatedUser,
  setFeedbackMessage,
  setAdminContent,
  setCurricula,
  setCategories,
  upsertCurriculum,
  setQuizScores,
  recordQuizScore,
  setAdminCreators
} = appSlice.actions;

export default appSlice.reducer;
