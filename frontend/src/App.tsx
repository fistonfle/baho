import { useEffect, useMemo, useRef, useState } from 'react';

import { SiteFooter, SiteHeader, StaffHeader, TabBar } from './components/AppNav';
import { AdminScreen } from './components/screens/AdminScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { CheckupScreen, loadKnowledgeResults } from './components/screens/CheckupScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { ExerciseScreen } from './components/screens/ExerciseScreen';
import { FaqScreen } from './components/screens/FaqScreen';
import { LandingScreen } from './components/screens/LandingScreen';
import { LibraryScreen, scrollToPlayer } from './components/screens/LibraryScreen';
import { NcdScreen } from './components/screens/NcdScreen';
import { PasswordResetScreen } from './components/screens/PasswordResetScreen';
import { OnboardingScreen } from './components/screens/OnboardingScreen';
import { RemindersScreen } from './components/screens/RemindersScreen';
import { HealthProfileScreen } from './components/screens/HealthProfileScreen';
import { PathsScreen } from './components/screens/PathsScreen';
import { PrivacyScreen } from './components/screens/PrivacyScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { defaultCategories, offlineDiseases, offlineLessons, tipOfTheDay } from './data/healthContent';
import { getStreak, recordActivity } from './lib/activity';
import { flushOutbox, getOutbox, loadCache, queueIssue, saveCache } from './lib/offline';
import { ALL, emptyHealthProfile, learnerTopics, MINE, orderDiseases, pathProgress, profileTags, rankLessons, recommendedPaths, type HealthProfile, type RiskAnswers } from './lib/personalization';
import { loadSecure, removeSecure, saveSecure } from './lib/secureStore';
import { api, setAuthToken } from './services/api';
import {
  type AuthUser,
  addIssueLocal,
  addQuestionLocal,
  addReminder as addReminderAction,
  clearAuthenticatedUser,
  clearLearnerData,
  clearSessionData,
  defaultFaqItems,
  defaultReminders,
  readGuestData,
  deleteReminder as deleteReminderAction,
  markLessonComplete as markLessonCompleteAction,
  setActiveCategory,
  setAdminContent,
  setAdminCreators,
  setAccountEmail,
  setAuthenticatedUser,
  setAuthMode,
  setCompletedLessons,
  setCurrentScreen,
  setFaqItems,
  setFeedbackMessage,
  setIsOnline,
  setIssues,
  setLessons,
  setQuestions,
  setCurricula,
  setCategories,
  setQuizScores,
  recordQuizScore,
  setReminders,
  setRiskTags,
  setSelectedInterests,
  setSelectedLesson,
  setSelectedNcdTopic,
  setUserName,
  toggleInterest,
  updateAuthForm,
  updateIssueForm,
  updateQuestionForm,
  updateReminderForm,
  type Screen
} from './store/appSlice';
import { useAppDispatch, useAppSelector } from './store/hooks';
import type { Category, Curriculum, Lesson, QuestionItem, QuestionStatus } from './types';

const PROFILE_KEY = 'baho-profile';
// Profile is stored per account on the device.
const profileKey = (userId?: number | null) => (userId ? `${PROFILE_KEY}-${userId}` : PROFILE_KEY);
const PATH_KEY = 'baho-active-path';
const learnerScreens: Screen[] = ['dashboard', 'paths', 'profile', 'library', 'ncd', 'checkup', 'exercise', 'reminders', 'faq', 'privacy', 'risk'];

const translateAuthError = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid phone number, email or pin')) return 'Nimero, imeyili cyangwa PIN si byo.';
  if (normalized.includes('too many wrong attempts')) return 'Wibeshye inshuro nyinshi. Ongera ugerageze nyuma y\'iminota 15.';
  if (normalized.includes('rwandan phone number')) return 'Andika amazina, nimero ya telefoni yo mu Rwanda na PIN y\'imibare 4 kugeza kuri 6.';
  if (normalized.includes('already exists') || normalized.includes('already belongs')) return 'Iyi nimero isanzwe ifite konti. Injira cyangwa ukoreshe indi nimero.';
  if (normalized.includes('at least 8 characters')) return 'Ijambo ry\'ibanga rigomba kuba nibura inyuguti 8.';
  if (normalized.includes('fetch') || normalized.includes('failed') || normalized.includes('could not')) return 'Ntibyashobotse. Reba internet wongere ugerageze.';
  return 'Habaye ikibazo. Ongera ugerageze.';
};

const questionStatuses: QuestionStatus[] = ['Pending', 'Drafted', 'Answered'];

const toQuestionItem = (item: any): QuestionItem => ({
  id: item.id,
  topic: item.topic,
  question: item.question,
  status: questionStatuses.includes(item.status) ? item.status : 'Pending',
  answer: item.answer ?? undefined,
  contentId: item.content_id ?? item.contentId ?? undefined
});

const toLesson = (item: any, categories: Category[]): Lesson => ({
  id: item.id,
  title: item.title,
  categoryId: item.categoryId,
  category: categories.find((category) => category.id === item.categoryId)?.name ?? 'Ibindi',
  summary: item.summary || '',
  body: item.body,
  // Rough listening time at about 130 words a minute.
  duration: `Iminota ${Math.max(1, Math.round(String(item.body).split(/\s+/).length / 130))}`,
  audioUrl: item.audioUrl || '',
  audioIsSynthetic: Boolean(item.audioIsSynthetic),
  imageUrl: item.imageUrl || '',
  quiz: item.quiz || []
});

function App() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((root) => root.app);
  const {
    currentScreen, userName, selectedInterests, lessons, selectedLesson, reminders, reminderForm, issueForm,
    questionForm, authForm, authMode, authUser, feedbackMessage, faqItems, questions, isOnline,
    activeCategory, completedLessons, selectedNcdTopic, riskTags, curricula, categories, quizScores
  } = state;
  const isStaff = ['admin', 'creator', 'specialist'].includes(authUser?.role ?? '');

  const [healthProfile, setHealthProfile] = useState<HealthProfile>(emptyHealthProfile);
  const [activePathSlug, setActivePathSlug] = useState<string | null>(() => localStorage.getItem(PATH_KEY));
  const [riskFromOnboarding, setRiskFromOnboarding] = useState(false);
  const [staffSignIn, setStaffSignIn] = useState(false);
  // Read the reset token before the session restore, otherwise we jump to the dashboard.
  const linkToken = useRef<string | null>(new URLSearchParams(window.location.search).get('reset'));
  const [resetToken, setResetToken] = useState<string | null>(linkToken.current);
  const [showPasswordReset, setShowPasswordReset] = useState(Boolean(linkToken.current));
  const [streak, setStreak] = useState(getStreak);
  const [knowledgeResults, setKnowledgeResults] = useState(loadKnowledgeResults);
  const [pendingIssues, setPendingIssues] = useState(() => getOutbox().length);
  const [notificationsAllowed, setNotificationsAllowed] = useState(() => 'Notification' in window && Notification.permission === 'granted');
  const notifiedReminders = useRef(new Set<string>());

  const navigate = (screen: Screen) => dispatch(setCurrentScreen(screen));

  useEffect(() => {
    if (!linkToken.current) return;
    setStaffSignIn(true);
    dispatch(setCurrentScreen('auth'));
    window.history.replaceState({}, '', window.location.pathname);
  }, [dispatch]);
  // Every screen opens at the top, including changes made by the store (sign-in, sign-out).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [currentScreen]);
  const notify = (message: string) => dispatch(setFeedbackMessage(message));

  // Restore the session, learner profile and private risk answers on start-up.
  useEffect(() => {
    const token = localStorage.getItem('baho-token');
    const savedUser = localStorage.getItem('baho-user');
    // Don't restore the session while resetting a password.
    let session: AuthUser | null = null;
    if (!linkToken.current && token && savedUser) {
      try {
        session = JSON.parse(savedUser) as AuthUser;
      } catch {
        localStorage.removeItem('baho-token');
        localStorage.removeItem('baho-user');
      }
    }
    // Staff have no learner profile.
    const staffSession = ['admin', 'creator', 'specialist'].includes(session?.role ?? '');
    const profile = staffSession
      ? null
      : loadCache<{ name: string; interests: typeof selectedInterests }>(profileKey(session?.id));
    if (profile) {
      dispatch(setUserName(profile.name));
      dispatch(setSelectedInterests(profile.interests));
    }
    if (session && token) {
      setAuthToken(token);
      dispatch(setAuthenticatedUser({ token, user: session }));
    } else if (profile && !linkToken.current) {
      dispatch(setCurrentScreen('dashboard'));
    }
    loadSecure<HealthProfile>('health-profile').then(async (profile) => {
      if (profile) return setHealthProfile(profile);
      // Profiles saved before conditions were added only had the six answers.
      const answers = await loadSecure<RiskAnswers>('risk-answers');
      if (answers) setHealthProfile({ conditions: [], answers });
    });
  }, [dispatch]);

  // Load categories first, then lessons (network, then cache, then built-in).
  useEffect(() => {
    const loadLessons = async () => {
      const loadedCategories = await api.getCategories()
        .then((response) => {
          saveCache('categories', response.categories);
          return response.categories;
        })
        .catch(() => loadCache<Category[]>('categories') || defaultCategories);
      dispatch(setCategories(loadedCategories));
      try {
        const response = await api.getContent();
        const fetched = response.content.map((item) => toLesson(item, loadedCategories));
        if (fetched.length) {
          dispatch(setLessons(fetched));
          saveCache('lessons', fetched);
        }
      } catch {
        dispatch(setLessons(loadCache<Lesson[]>('lessons') || offlineLessons));
      }
    };
    void loadLessons();
    api.getFaqs()
      .then((response) => {
        const fetched = response.faqs.map((item: any) => ({ id: item.id, question: item.question, answer: item.answer }));
        if (fetched.length) {
          dispatch(setFaqItems(fetched));
          saveCache('faqs', fetched);
        }
      })
      .catch(() => dispatch(setFaqItems(loadCache('faqs') || defaultFaqItems)));
    api.getCurricula()
      .then((response) => {
        dispatch(setCurricula(response.curricula));
        saveCache('curricula', response.curricula);
      })
      .catch(() => dispatch(setCurricula(loadCache<Curriculum[]>('curricula') || [])));
  }, [dispatch]);

  // Ranking tags follow the health profile; conditions are matched through the disease list.
  useEffect(() => {
    dispatch(setRiskTags(profileTags(healthProfile, curricula, categories)));
  }, [categories, curricula, dispatch, healthProfile]);

  // Account data for signed-in learners.
  useEffect(() => {
    if (!authUser) return;
    api.getReminders().then((response) => dispatch(setReminders(response.reminders))).catch(() => undefined);
    api.getProgress().then((response) => {
      dispatch(setCompletedLessons(response.completedLessonIds));
      dispatch(setQuizScores(response.quizScores));
    }).catch(() => undefined);
    api.getQuestions().then((response) => dispatch(setQuestions(response.questions.map(toQuestionItem)))).catch(() => undefined);
  }, [authUser, dispatch]);

  // Staff data is only loaded when the staff area is opened.
  useEffect(() => {
    if (currentScreen !== 'admin' || !isStaff) return;
    // The server decides which lessons each staff role gets.
    api.getAdminContent().then((response) => dispatch(setAdminContent(response.content))).catch(() => notify('Could not load the lessons.'));
    api.getQuestions().then((response) => dispatch(setQuestions(response.questions.map(toQuestionItem)))).catch(() => undefined);
    if (authUser?.role === 'admin') {
      api.getCreators().then((response) => dispatch(setAdminCreators(response.staff))).catch(() => undefined);
      api.getAdminIssues().then((response) => dispatch(setIssues(response.issues))).catch(() => undefined);
    }
  }, [authUser, currentScreen, dispatch, isStaff]);

  // Guests keep reminders and progress on the device.
  useEffect(() => {
    if (!authUser) localStorage.setItem('baho-reminders', JSON.stringify(reminders));
  }, [authUser, reminders]);

  useEffect(() => {
    if (!authUser) localStorage.setItem('baho-progress', JSON.stringify(completedLessons));
  }, [authUser, completedLessons]);

  useEffect(() => {
    if (!authUser) saveCache('quiz-scores', quizScores);
  }, [authUser, quizScores]);

  useEffect(() => {
    if (isStaff || !userName.trim()) return;
    saveCache(profileKey(authUser?.id), { name: userName.trim(), interests: selectedInterests });
  }, [authUser, isStaff, userName, selectedInterests]);

  // Track connectivity and send queued issue reports once the connection returns.
  useEffect(() => {
    const goOnline = async () => {
      dispatch(setIsOnline(true));
      const sent = await flushOutbox();
      setPendingIssues(getOutbox().length);
      if (sent > 0) notify(`Internet yagarutse. Raporo ${sent} zoherejwe.`);
    };
    const goOffline = () => {
      dispatch(setIsOnline(false));
      notify('Nta internet. Amasomo wabitse aracyakora.');
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    if (navigator.onLine && getOutbox().length) void goOnline();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [dispatch]);

  // In-app reminder notifications while Baho is open.
  useEffect(() => {
    if (!notificationsAllowed) return;
    const timer = window.setInterval(() => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      reminders.filter((reminder) => reminder.time === time).forEach((reminder) => {
        const key = `${now.toDateString()}-${reminder.id}`;
        if (notifiedReminders.current.has(key)) return;
        notifiedReminders.current.add(key);
        new Notification('Baho: igihe kirageze', { body: reminder.label, icon: '/icons/icon-192.png' });
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [notificationsAllowed, reminders]);

  // Feedback messages disappear on their own.
  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = window.setTimeout(() => dispatch(setFeedbackMessage('')), 4500);
    return () => window.clearTimeout(timer);
  }, [dispatch, feedbackMessage]);

  const rankedLessons = useMemo(
    () => rankLessons(lessons, selectedInterests, riskTags, completedLessons),
    [lessons, selectedInterests, riskTags, completedLessons]
  );
  const healthTip = useMemo(tipOfTheDay, []);
  const completedCount = completedLessons.filter((id) => lessons.some((lesson) => lesson.id === id)).length;
  const topicNames = categories.map((category) => category.name);
  // Diseases are the learning paths that have a condition; built-in ones are used offline.
  const apiDiseases = curricula.filter((curriculum) => curriculum.condition);
  const allDiseases = apiDiseases.length ? apiDiseases : offlineDiseases;
  // What the learner chose (sign-up topics and health profile) decides what comes first.
  const myTopics = useMemo(() => learnerTopics(selectedInterests, riskTags), [selectedInterests, riskTags]);
  const { ordered: diseases, chosenIds: chosenDiseaseIds } = useMemo(
    () => orderDiseases(allDiseases, healthProfile.conditions, myTopics, categories),
    [allDiseases, healthProfile.conditions, myTopics, categories]
  );
  const suggestedPaths = useMemo(() => recommendedPaths(curricula, healthProfile.conditions), [curricula, healthProfile.conditions]);
  const activePath = curricula.find((curriculum) => curriculum.slug === activePathSlug) ?? suggestedPaths[0] ?? null;
  const quizAverage = quizScores.length
    ? Math.round((quizScores.reduce((sum, item) => sum + item.score / item.total, 0) / quizScores.length) * 100)
    : null;
  // In the lesson view, offer the lesson that follows this one in the active path.
  const nextInPath = (() => {
    if (!activePath) return null;
    const position = activePath.lessonIds.indexOf(selectedLesson.id);
    const nextId = position >= 0 ? activePath.lessonIds[position + 1] : pathProgress(activePath, completedLessons).nextId;
    return lessons.find((lesson) => lesson.id === nextId && lesson.id !== selectedLesson.id) ?? null;
  })();
  const knowledgeScore = knowledgeResults.length
    ? { first: knowledgeResults[0].score, latest: knowledgeResults[knowledgeResults.length - 1].score, total: knowledgeResults[0].total }
    : null;

  const logActivity = () => {
    recordActivity();
    setStreak(getStreak());
  };

  const openLesson = (lesson: Lesson) => {
    dispatch(setSelectedLesson(lesson));
    dispatch(setActiveCategory(myTopics.includes(lesson.category) ? MINE : ALL));
    navigate('library');
    scrollToPlayer();
  };

  const markLessonComplete = async (lessonId: number, celebrate = true) => {
    if (completedLessons.includes(lessonId)) return;
    if (authUser) {
      try {
        await api.completeLesson(lessonId);
      } catch {
        notify('Ntibyashobotse kubika aho ugeze kuri konti.');
        return;
      }
    }
    dispatch(markLessonCompleteAction(lessonId));
    logActivity();
    if (celebrate) notify('Wakoze neza! Isomo ryarangiye.');
  };

  const saveHealthProfile = async (profile: HealthProfile) => {
    await saveSecure('health-profile', profile);
    await removeSecure('risk-answers');
    setHealthProfile(profile);
    // A new profile picks a new path, unless the learner chose one themselves.
    const [firstPath] = recommendedPaths(curricula, profile.conditions);
    if (firstPath) choosePath(firstPath.slug, false);
    notify('Umwirondoro wabitswe kuri iyi telefoni gusa.');
    navigate('dashboard');
  };

  // Privacy page: delete everything this app stored on the device.
  const clearDeviceData = async () => {
    // Encrypted health profile first.
    await removeSecure('health-profile');
    await removeSecure('risk-answers');
    // Keep the session, this doesn't sign out.
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('baho-') && key !== 'baho-token' && key !== 'baho-user')
        .forEach((key) => localStorage.removeItem(key));
    } catch { /* storage blocked: nothing was written in the first place */ }
    // Reset memory too, or the save effects write it back.
    setHealthProfile(emptyHealthProfile);
    setActivePathSlug(null);
    dispatch(setUserName(''));
    dispatch(setSelectedInterests([]));
    dispatch(setCompletedLessons([]));
    dispatch(setQuizScores([]));
    dispatch(setReminders(defaultReminders));
  };

  const clearHealthProfile = async () => {
    await removeSecure('health-profile');
    await removeSecure('risk-answers');
    setHealthProfile(emptyHealthProfile);
    choosePath(null, false);
    notify('Umwirondoro w\'ubuzima wasibwe.');
    navigate('dashboard');
  };

  const choosePath = (slug: string | null, goToDashboard = true) => {
    setActivePathSlug(slug);
    if (slug) localStorage.setItem(PATH_KEY, slug);
    else localStorage.removeItem(PATH_KEY);
    if (goToDashboard) navigate('dashboard');
  };

  // Signed-in learners are graded by the server; guests are graded on the device.
  const submitQuiz = async (lessonId: number, answers: number[]) => {
    const lesson = lessons.find((item) => item.id === lessonId);
    const gradeLocally = () => {
      const correct = (lesson?.quiz || []).map((question, index) => answers[index] === question.answerIndex);
      return { score: correct.filter(Boolean).length, total: correct.length, correct };
    };
    let result = gradeLocally();
    if (authUser) {
      try {
        result = await api.submitQuizAttempt(lessonId, answers);
      } catch {
        notify('Amanota ntiyabitswe kuri konti. Reba internet.');
      }
    }
    dispatch(recordQuizScore({ contentId: lessonId, score: result.score, total: result.total }));
    logActivity();
    if (result.score * 2 >= result.total) await markLessonComplete(lessonId, false);
    return result;
  };

  const addReminder = async () => {
    if (!reminderForm.time || !reminderForm.label.trim()) {
      notify('Hitamo isaha kandi wandike icyo kwibutswa.');
      return;
    }
    if (!authUser) {
      dispatch(addReminderAction());
      notify('Icyibutsa cyongeweho.');
      return;
    }
    try {
      const response = await api.createReminder({ time: reminderForm.time, label: reminderForm.label.trim() });
      dispatch(setReminders([...reminders, response.reminder]));
      dispatch(updateReminderForm({ time: '21:00', label: '' }));
      notify('Icyibutsa cyabitswe kuri konti yawe.');
    } catch {
      notify('Ntibyashobotse kubika icyibutsa.');
    }
  };

  const deleteReminder = async (id: number) => {
    if (!authUser) {
      dispatch(deleteReminderAction(id));
      return;
    }
    try {
      await api.deleteReminder(id);
      dispatch(setReminders(reminders.filter((reminder) => reminder.id !== id)));
    } catch {
      notify('Ntibyashobotse gusiba icyibutsa.');
    }
  };

  const enableNotifications = async () => {
    const permission = await Notification.requestPermission();
    setNotificationsAllowed(permission === 'granted');
    notify(permission === 'granted' ? 'Ubutumwa bwo kwibutsa bwemewe.' : 'Ntiwemeye ubutumwa bwo kwibutsa.');
  };

  const openAuth = (mode: 'login' | 'register' = 'login', staff = false) => {
    dispatch(setAuthMode(mode));
    setStaffSignIn(staff);
    navigate('auth');
  };

  const submitAuth = async () => {
    try {
      const response = authMode === 'register'
        ? await api.register({ name: authForm.name.trim(), phone: authForm.identifier, pin: authForm.password })
        : await api.login({ identifier: authForm.identifier.trim(), password: authForm.password });
      setAuthToken(response.token);
      localStorage.setItem('baho-token', response.token);
      localStorage.setItem('baho-user', JSON.stringify(response.user));
      // Start the account from its own data, not the guest's.
      dispatch(clearSessionData());
      dispatch(clearLearnerData());
      dispatch(setAuthenticatedUser({ token: response.token, user: response.user }));
      const mine = loadCache<{ name: string; interests: typeof selectedInterests }>(profileKey(response.user.id));
      if (mine && !['admin', 'creator', 'specialist'].includes(response.user.role)) {
        dispatch(setSelectedInterests(mine.interests));
      }
      notify(authMode === 'register' ? 'Konti yawe yafunguwe neza.' : ['admin', 'creator', 'specialist'].includes(response.user.role) ? `Welcome, ${response.user.name}.` : 'Murakaza neza!');
    } catch (error) {
      notify(translateAuthError(error instanceof Error ? error.message : ''));
    }
  };

  // Returns null on success, or an error message.
  const saveMyEmail = async (email: string): Promise<string | null> => {
    try {
      const response = await api.setMyEmail(email);
      dispatch(setAccountEmail(response.user.email));
      localStorage.setItem('baho-user', JSON.stringify(response.user));
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('already used')) return 'Iyi meyili isanzwe ikoreshwa na konti indi.';
      if (message.includes('valid email')) return 'Andika imeyili yuzuye, urugero izina@urugero.com.';
      return 'Ntibyakunze. Ongera ugerageze.';
    }
  };

  const signOut = () => {
    setAuthToken(null);
    localStorage.removeItem('baho-token');
    localStorage.removeItem('baho-user');
    dispatch(clearAuthenticatedUser());
    // Clear what the account could see.
    dispatch(clearSessionData());
    dispatch(clearLearnerData());
    // Bring back the guest's data.
    const guest = readGuestData<{ name: string; interests: typeof selectedInterests } | null>(`baho-cache-${profileKey()}`, null);
    dispatch(setUserName(guest?.name ?? ''));
    dispatch(setSelectedInterests(guest?.interests ?? []));
    dispatch(setCompletedLessons(readGuestData('baho-progress', [])));
    dispatch(setReminders(readGuestData('baho-reminders', defaultReminders)));
    dispatch(setQuizScores(readGuestData('baho-cache-quiz-scores', [])));
    notify('Wasohotse muri konti yawe.');
    navigate(guest?.name ? 'dashboard' : 'landing');
  };

  const reportIssue = async () => {
    const payload = { title: issueForm.title.trim(), description: issueForm.description.trim() };
    if (!payload.title || !payload.description) return;
    try {
      if (!navigator.onLine) throw new Error('offline');
      const response = await api.createIssue(payload);
      dispatch(addIssueLocal(response.issue));
      notify('Raporo yawe yoherejwe. Murakoze!');
    } catch {
      // Keep the report on the phone and send it when the connection returns.
      queueIssue({ id: Date.now(), ...payload });
      setPendingIssues(getOutbox().length);
      dispatch(updateIssueForm({ title: '', description: '' }));
      notify('Nta internet. Raporo izoherezwa internet nigaruka.');
    }
  };

  const askAboutLesson = async (lessonId: number, question: string) => {
    try {
      const data = await api.createQuestion({ question, contentId: lessonId });
      dispatch(addQuestionLocal(toQuestionItem(data.question)));
      return true;
    } catch {
      notify('Ntibyashobotse kohereza ikibazo.');
      return false;
    }
  };

  const askQuestion = async () => {
    const question = questionForm.question.trim();
    if (!question) return;
    try {
      const data = await api.createQuestion({ topic: questionForm.topic, question });
      dispatch(addQuestionLocal(toQuestionItem(data.question)));
      notify('Ikibazo cyawe cyoherejwe. Inzobere izagusubiza vuba.');
    } catch {
      notify('Ntibyashobotse kohereza ikibazo.');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return (
          <LandingScreen
            returning={Boolean(userName)}
            diseases={diseases}
            lessons={lessons}
            onStart={() => navigate(userName ? 'dashboard' : 'onboarding')}
            onRegister={() => openAuth('register')}
            onSignIn={() => openAuth('login')}
            onStaffSignIn={() => openAuth('login', true)}
            onOpenDisease={(index) => { dispatch(setSelectedNcdTopic(index)); navigate('ncd'); }}
            onOpenLesson={openLesson}
          />
        );
      case 'auth':
        if (showPasswordReset) {
          return (
            <PasswordResetScreen
              token={resetToken}
              onDone={() => { setShowPasswordReset(false); setResetToken(null); setStaffSignIn(true); dispatch(setAuthMode('login')); }}
              onBack={() => { setShowPasswordReset(false); setResetToken(null); }}
            />
          );
        }
        return (
          <AuthScreen
            mode={authMode}
            form={authForm}
            onFormChange={(changes) => dispatch(updateAuthForm(changes))}
            onModeChange={(mode) => dispatch(setAuthMode(mode))}
            onSubmit={() => void submitAuth()}
            onBack={() => navigate(userName ? 'dashboard' : 'landing')}
            onError={notify}
            onForgotPassword={() => { setResetToken(null); setShowPasswordReset(true); }}
            staffSignIn={staffSignIn}
          />
        );
      case 'onboarding':
        return (
          <OnboardingScreen
            userName={userName}
            topics={topicNames}
            selectedInterests={selectedInterests}
            onNameChange={(name) => dispatch(setUserName(name))}
            onToggleInterest={(interest) => dispatch(toggleInterest(interest))}
            onBack={() => navigate('landing')}
            onContinue={() => { setRiskFromOnboarding(true); navigate('risk'); }}
            onError={notify}
          />
        );
      case 'risk':
        return (
          <HealthProfileScreen
            initialProfile={healthProfile}
            curricula={curricula}
            categories={categories}
            fromOnboarding={riskFromOnboarding}
            onSave={(profile) => { setRiskFromOnboarding(false); void saveHealthProfile(profile); }}
            onSkip={() => { setRiskFromOnboarding(false); navigate('dashboard'); }}
            onClear={() => void clearHealthProfile()}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            userName={userName}
            account={authUser}
            completedCount={completedCount}
            totalLessons={lessons.length}
            streak={streak}
            quizAverage={quizAverage}
            knowledgeScore={knowledgeScore}
            activePath={activePath}
            completedLessons={completedLessons}
            interests={selectedInterests}
            healthProfile={healthProfile}
            onRename={(name) => { dispatch(setUserName(name)); notify('Izina ryahinduwe.'); }}
            onSaveEmail={saveMyEmail}
            onEditInterests={() => navigate('onboarding')}
            onEditHealthProfile={() => navigate('risk')}
            onClearHealthProfile={() => void clearHealthProfile()}
            onViewPaths={() => navigate('paths')}
            onOpenStaffArea={() => navigate('admin')}
            onSignIn={() => openAuth('login')}
            onRegister={() => openAuth('register')}
            onSignOut={signOut}
            onHome={() => navigate('dashboard')}
          />
        );
      case 'paths':
        return (
          <PathsScreen
            curricula={curricula}
            recommendedSlugs={suggestedPaths.map((curriculum) => curriculum.slug)}
            activeSlug={activePath?.slug ?? null}
            completedLessons={completedLessons}
            onChoose={(slug) => choosePath(slug)}
            onEditProfile={() => navigate('risk')}
            onHome={() => navigate('dashboard')}
          />
        );
      case 'dashboard':
        return (
          <DashboardScreen
            userName={userName}
            selectedInterests={selectedInterests}
            rankedLessons={rankedLessons}
            lessons={lessons}
            activePath={activePath}
            completedLessons={completedLessons}
            quizAverage={quizAverage}
            completedCount={completedCount}
            totalLessons={lessons.length}
            streak={streak}
            hasRiskCheck={healthProfile.conditions.length > 0 || Object.keys(healthProfile.answers).length > 0}
            riskTags={riskTags}
            knowledgeScore={knowledgeScore}
            healthTip={healthTip}
            onOpenLesson={openLesson}
            onViewPaths={() => navigate('paths')}
            onViewLibrary={() => navigate('library')}
            onViewRiskCheck={() => navigate('risk')}
            onViewCheckup={() => navigate('checkup')}
            onViewFaq={() => navigate('faq')}
            onEditInterests={() => navigate('onboarding')}
          />
        );
      case 'library':
        return (
          <LibraryScreen
            lessons={lessons}
            rankedLessons={rankedLessons}
            myTopics={myTopics}
            topics={topicNames}
            selectedLesson={selectedLesson}
            activeCategory={activeCategory}
            completedLessons={completedLessons}
            quizScores={quizScores}
            nextInPath={nextInPath}
            setActiveCategory={(category) => dispatch(setActiveCategory(category))}
            setSelectedLesson={(lesson) => dispatch(setSelectedLesson(lesson))}
            markLessonComplete={(id) => void markLessonComplete(id)}
            submitQuiz={submitQuiz}
            onAskAboutLesson={askAboutLesson}
            isSignedIn={Boolean(authUser)}
            onHome={() => navigate('dashboard')}
          />
        );
      case 'ncd':
        return (
          <NcdScreen
            diseases={diseases}
            chosenIds={chosenDiseaseIds}
            lessons={lessons}
            completedLessons={completedLessons}
            selectedTopic={selectedNcdTopic}
            onSelectTopic={(index) => dispatch(setSelectedNcdTopic(index))}
            onOpenLesson={openLesson}
            onStartCheckup={() => navigate('checkup')}
            onHome={() => navigate('dashboard')}
          />
        );
      case 'checkup':
        return <CheckupScreen onFinished={() => { setKnowledgeResults(loadKnowledgeResults()); logActivity(); }} onOpenNcd={() => navigate('ncd')} onHome={() => navigate('dashboard')} />;
      case 'exercise':
        return <ExerciseScreen onExerciseDone={(title) => { logActivity(); notify(`Wakoze neza! "${title}" yarangiye.`); }} onHome={() => navigate('dashboard')} />;
      case 'reminders':
        return (
          <RemindersScreen
            reminders={reminders}
            form={reminderForm}
            notificationsAllowed={notificationsAllowed}
            isSignedIn={Boolean(authUser)}
            onFormChange={(changes) => dispatch(updateReminderForm(changes))}
            onAdd={() => void addReminder()}
            onDelete={(id) => void deleteReminder(id)}
            onEnableNotifications={() => void enableNotifications()}
            onHome={() => navigate('dashboard')}
          />
        );
      case 'faq':
        return (
          <FaqScreen
            faqItems={faqItems}
            topics={topicNames}
            questions={questions}
            questionForm={questionForm}
            issueForm={issueForm}
            pendingIssues={pendingIssues}
            isSignedIn={Boolean(authUser)}
            onQuestionFormChange={(changes) => dispatch(updateQuestionForm(changes))}
            onIssueFormChange={(changes) => dispatch(updateIssueForm(changes))}
            onAskQuestion={() => void askQuestion()}
            onReportIssue={() => void reportIssue()}
            onSignIn={() => openAuth()}
            onHome={() => navigate('dashboard')}
            onViewPrivacy={() => navigate('privacy')}
          />
        );
      case 'privacy':
        return (
          <PrivacyScreen
            isSignedIn={Boolean(authUser)}
            onHome={() => navigate('dashboard')}
            onAskQuestion={() => navigate('faq')}
            onDeleteLocalData={clearDeviceData}
          />
        );
      case 'admin':
        return isStaff ? <AdminScreen /> : null;
      default:
        return null;
    }
  };

  const showNav = learnerScreens.includes(currentScreen) && !(currentScreen === 'risk' && riskFromOnboarding);

  const showFrame = currentScreen !== 'risk' || !riskFromOnboarding;
  // Staff work in a separate, English mode and switch to the learner view when they want to.
  const staffMode = isStaff && currentScreen === 'admin';

  return (
    <div className={`app-shell ${showNav ? 'with-tab-bar' : ''}`}>
      <a className="skip-link" href="#main">Jya ku bikubiye</a>
      {staffMode && (
        <StaffHeader
          userName={authUser?.name ?? ''}
          role={authUser?.role ?? null}
          isOnline={isOnline}
          onSwitchToLearner={() => navigate('dashboard')}
          onSignOut={signOut}
        />
      )}
      {showFrame && !staffMode && (
        <SiteHeader
          currentScreen={currentScreen}
          userName={authUser?.name || userName}
          role={authUser?.role ?? null}
          isOnline={isOnline}
          isSignedIn={Boolean(authUser)}
          isStaff={isStaff}
          showNav={showNav}
          onNavigate={navigate}
          onSignIn={() => openAuth()}
          onSignOut={signOut}
          onHome={() => navigate(userName || authUser ? 'dashboard' : 'landing')}
        />
      )}
      {!isOnline && (
        <div className="offline-notice" role="status">
          <div className="container">{staffMode
            ? 'You are offline. Changes cannot be saved until the connection returns.'
            : 'Nta internet ihari. Urakoresha amasomo wabitse kuri iyi telefoni; ibyo wohereje bizoherezwa internet nigaruka.'}</div>
        </div>
      )}
      <main id="main" className="site-main">{renderScreen()}</main>
      {showFrame && !staffMode && <SiteFooter onNavigate={navigate} />}
      {showNav && <TabBar currentScreen={currentScreen} onNavigate={navigate} />}
      {feedbackMessage && (
        <div className="toast" role="status" aria-live="polite">
          <p>{feedbackMessage}</p>
          <button onClick={() => dispatch(setFeedbackMessage(''))} aria-label="Funga">Funga</button>
        </div>
      )}
    </div>
  );
}

export default App;
