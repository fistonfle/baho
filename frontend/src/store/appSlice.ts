import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Interest, IssueReport, Lesson, QuestionItem, Reminder } from '../types';

export type Screen = 'landing' | 'auth' | 'onboarding' | 'dashboard' | 'library' | 'ncd' | 'exercise' | 'reminders' | 'faq' | 'admin';

export const defaultLessons: Lesson[] = [
  {
    id: 1,
    title: 'Umuvuduko w\'amaraso ni iki?',
    category: 'Umuvuduko w\'amaraso',
    summary: 'Kumenya ibimenyetso n\'ukubungabunga umuvuduko w\'amaraso.',
    body: 'Umuvuduko w\'amaraso ni igipimo cy\'amaraso y\'ingome mu mitsi. Akenshi ni ingenzi kumenya uko umutima ukora, kandi kuringaniza ibiryo by\'umunyu no gukora imyitozo birafasha.',
    duration: '03:42',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: 2,
    title: 'Diyabete n\'ubuzima',
    category: 'Diyabete',
    summary: 'Kurinda ubuzima bwawe no kumenya ibimenyetso bya diyabete.',
    body: 'Diyabete irashobora kugaragara nk\'ibimenyetso byo kugira isoni, inyota nyinshi, no gucika intege. Gukoresha ibiryo bifite isukari nkeya no gukora imyitozo biba byiza.',
    duration: '04:06',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  },
  {
    id: 3,
    title: 'Imirire myiza',
    category: 'Imirire',
    summary: 'Ibyiza by\'imirire ifite ubuzima bwiza.',
    body: 'Kurya ibiryo byuzuye, ibiryo by\'imbuto, ibinyampeke, ibijyanye n\'imibiri, no kugabanya umunyu ni intambwe nziza mu kubungabunga ubuzima.',
    duration: '02:58',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  }
];

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

export const topicCategories = ['All', 'Umuvuduko w\'amaraso', 'Diyabete', 'Imirire'];

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
  authMode: 'login' | 'register' | 'setup';
  setupNeeded: boolean;
  authUser: { id: number; name: string; email: string; role: string } | null;
  authToken: string | null;
  feedbackMessage: string;
  contentForm: { categoryId: number; title: string; summary: string; body: string; audioUrl: string; status: string };
  questionForm: { topic: string; question: string };
  answerDrafts: Record<number, string>;
  faqItems: { id?: number; question: string; answer: string }[];
  faqForm: { question: string; answer: string };
  questions: QuestionItem[];
  adminCreators: { id: number; fullName: string; email: string; role: string }[];
  adminContent: { id: number; title: string; status: string; categoryId?: number; summary?: string; body?: string; audioUrl?: string }[];
  editingContentId: number | null;
  isOnline: boolean;
  audioProgress: number;
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
  setupNeeded: false,
  authUser: null,
  authToken: null,
  feedbackMessage: '',
  contentForm: { categoryId: 1, title: '', summary: '', body: '', audioUrl: '', status: 'draft' },
  questionForm: { topic: 'Umuvuduko w\'amaraso', question: '' },
  answerDrafts: {},
  faqItems: defaultFaqItems,
  faqForm: { question: '', answer: '' },
  questions: defaultQuestions,
  adminCreators: [],
  adminContent: [],
  editingContentId: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  audioProgress: 0,
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
      if (!state.selectedLesson || !state.lessons.some((lesson) => lesson.id === state.selectedLesson.id)) {
        state.selectedLesson = state.lessons[0] ?? state.selectedLesson;
      }
    },
    setSelectedLesson: (state, action: PayloadAction<Lesson>) => {
      state.selectedLesson = action.payload;
      state.audioProgress = 0;
    },
    setReminders: (state, action: PayloadAction<Reminder[]>) => {
      state.reminders = action.payload;
    },
    updateReminderForm: (state, action: PayloadAction<Partial<{ time: string; label: string }>>) => {
      state.reminderForm = { ...state.reminderForm, ...action.payload };
    },
    addReminder: (state) => {
      const label = state.reminderForm.label.trim() || 'Soma isomo ryo mu buzima';
      const nextId = state.reminders.length + 1;
      state.reminders = [...state.reminders, { id: nextId, time: state.reminderForm.time, label }];
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
    updateContentForm: (state, action: PayloadAction<Partial<{ categoryId: number; title: string; summary: string; body: string; audioUrl: string; status: string }>>) => {
      state.contentForm = { ...state.contentForm, ...action.payload };
    },
    addContentLocal: (state, action: PayloadAction<{ id: number; title: string; status: string }>) => {
      state.adminContent = [action.payload, ...state.adminContent];
      state.contentForm = { categoryId: 1, title: '', summary: '', body: '', audioUrl: '', status: 'draft' };
      state.editingContentId = null;
    },
    setEditingContentId: (state, action: PayloadAction<number | null>) => {
      state.editingContentId = action.payload;
    },
    updateContentLocal: (state, action: PayloadAction<{ id: number; title: string; status: string; categoryId: number; summary: string; body: string; audioUrl: string }>) => {
      state.adminContent = state.adminContent.map((item) => item.id === action.payload.id ? action.payload : item);
      state.contentForm = { categoryId: 1, title: '', summary: '', body: '', audioUrl: '', status: 'draft' };
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
    setAudioProgress: (state, action: PayloadAction<number>) => {
      state.audioProgress = action.payload;
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
    setAuthMode: (state, action: PayloadAction<'login' | 'register' | 'setup'>) => {
      state.authMode = action.payload;
    },
    setSetupNeeded: (state, action: PayloadAction<boolean>) => {
      state.setupNeeded = action.payload;
      if (state.authMode === 'setup') state.authMode = 'login';
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
    setAdminContent: (state, action: PayloadAction<{ id: number; title: string; status: string; categoryId?: number; summary?: string; body?: string; audioUrl?: string }[]>) => {
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
  setAudioProgress,
  setActiveCategory,
  setSelectedNcdTopic,
  setCompletedLessons,
  markLessonComplete,
  updateAuthForm,
  setAuthMode,
  setSetupNeeded,
  setAuthenticatedUser,
  clearAuthenticatedUser,
  setFeedbackMessage,
  setAdminContent,
  setAdminCreators
} = appSlice.actions;

export default appSlice.reducer;
