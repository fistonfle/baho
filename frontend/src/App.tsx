import { useEffect, useMemo, useRef } from 'react';

import { DashboardScreen } from './components/screens/DashboardScreen';
import { LandingScreen } from './components/screens/LandingScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
import { SectionCard, StatusBadge } from './components/ui';
import { api, setAuthToken } from './services/api';
import {
  addContentLocal,
  addCreatorLocal,
  addFaqLocal,
  addIssueLocal,
  addQuestionLocal,
  addReminder as addReminderAction,
  answerQuestionSuccess,
  clearAuthenticatedUser,
  defaultFaqItems,
  defaultLessons,
  deleteReminder as deleteReminderAction,
  markLessonComplete as markLessonCompleteAction,
  setActiveCategory,
  setAudioProgress,
  setAdminContent,
  setAdminCreators,
  setAuthenticatedUser,
  setAuthMode,
  setCompletedLessons,
  setCurrentScreen as setCurrentScreenAction,
  setEditingContentId,
  setFeedbackMessage,
  setFaqItems,
  setIsOnline,
  setIssues,
  setLessons,
  setQuestions,
  setReminders,
  setSelectedLesson,
  setSelectedNcdTopic,
  setSetupNeeded,
  setUserName as setUserNameAction,
  toggleInterest as toggleInterestAction,
  updateContentForm,
  updateContentLocal,
  updateCreatorForm,
  updateFaqForm,
  updateFaqLocal,
  removeFaqLocal,
  updateAuthForm,
  updateAnswerDraft,
  updateIssueForm,
  updateQuestionForm,
  updateReminderForm
} from './store/appSlice';
import { useAppDispatch, useAppSelector } from './store/hooks';
import type { Interest } from './types';

const ncdTopics = [
  {
    id: 1,
    title: 'Umuvuduko w\'amaraso',
    description: 'Dukurikije uko umuvuduko w\'amaraso ukora, ibimenyetso n\'uburyo bwo kuwurinda.',
    symptoms: ['Umutima wihuta', 'Umutwe uvunika', 'Guhora uhumeka nabi'],
    prevention: ['Kugabanya umunyu', 'Kwiyigisha ku mirire', 'Gukoresha ibiryo byiza']
  },
  {
    id: 2,
    title: 'Diyabete',
    description: 'Diyabete ishobora gutera ibibazo mu mubiri ukomeye. Kwipimisha bikomeje ni ingenzi.',
    symptoms: ['Inyota nyinshi', 'Gucika intege', 'Kugira isoni zidasanzwe'],
    prevention: ['Kurya ibyiza', 'Kugenda', 'Kugenzura isukari']
  },
  {
    id: 3,
    title: 'Indwara z\'umutima',
    description: 'Imyitwarire myiza, imirire n\'ubuzima bwiza birinda ubuzima bw\'umutima.',
    symptoms: ['Umutwe uvunika', 'Umutima uhagaze', 'Kubura ubuzima'],
    prevention: ['Kugabanya umunyu', 'Kugenda', 'Kurekura ibiyobyabwenge']
  }
];

const translateAuthError = (message: string) => {
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes('invalid email or password')) return 'Imeyili cyangwa ijambo ry\'ibanga si byo.';
  if (normalizedMessage.includes('already exists') || normalizedMessage.includes('already belongs')) return 'Iyi konti isanzwe ihari. Koresha indi imeyili.';
  if (normalizedMessage.includes('setup has already been completed')) return 'Konti ya mbere y\'ubuyobozi yamaze gufungurwa. Injira ukoresheje konti yawe.';
  if (normalizedMessage.includes('at least 8 characters')) return 'Uzuza amazina, imeyili n\'ijambo ry\'ibanga rigizwe n\'inyuguti nibura 8.';
  if (normalizedMessage.includes('could not') || normalizedMessage.includes('failed') || normalizedMessage.includes('fetch')) {
    return 'Ntibyashobotse. Reba internet wongere ugerageze.';
  }
  return 'Habaye ikibazo. Ongera ugerageze.';
};

const statusLabels: Record<string, string> = {
  draft: 'Inyandiko itarangiye',
  review: 'Itegereje igenzurwa',
  published: 'Yasohotse',
  rejected: 'Yanzwe',
  open: 'Nshya',
  'in review': 'Iri gusuzumwa',
  resolved: 'Yakemuwe',
  answered: 'Yasubijwe',
  pending: 'Itegereje'
};

const statusInKinyarwanda = (status: string) => statusLabels[status.toLowerCase()] || status;

function App() {
  const dispatch = useAppDispatch();

  const currentScreen = useAppSelector((state) => state.app.currentScreen);
  const userName = useAppSelector((state) => state.app.userName);
  const selectedInterests = useAppSelector((state) => state.app.selectedInterests);
  const lessons = useAppSelector((state) => state.app.lessons);
  const selectedLesson = useAppSelector((state) => state.app.selectedLesson);
  const reminders = useAppSelector((state) => state.app.reminders);
  const reminderForm = useAppSelector((state) => state.app.reminderForm);
  const issues = useAppSelector((state) => state.app.issues);
  const issueForm = useAppSelector((state) => state.app.issueForm);
  const questionForm = useAppSelector((state) => state.app.questionForm);
  const answerDrafts = useAppSelector((state) => state.app.answerDrafts);
  const creatorForm = useAppSelector((state) => state.app.creatorForm);
  const contentForm = useAppSelector((state) => state.app.contentForm);
  const adminCreators = useAppSelector((state) => state.app.adminCreators);
  const adminContent = useAppSelector((state) => state.app.adminContent);
  const editingContentId = useAppSelector((state) => state.app.editingContentId);
  const authForm = useAppSelector((state) => state.app.authForm);
  const authMode = useAppSelector((state) => state.app.authMode);
  const setupNeeded = useAppSelector((state) => state.app.setupNeeded);
  const authUser = useAppSelector((state) => state.app.authUser);
  const feedbackMessage = useAppSelector((state) => state.app.feedbackMessage);
  const isStaff = authUser?.role === 'admin' || authUser?.role === 'creator';
  const faqItems = useAppSelector((state) => state.app.faqItems);
  const faqForm = useAppSelector((state) => state.app.faqForm);
  const questions = useAppSelector((state) => state.app.questions);
  const isOnline = useAppSelector((state) => state.app.isOnline);
  const audioProgress = useAppSelector((state) => state.app.audioProgress);
  const activeCategory = useAppSelector((state) => state.app.activeCategory);
  const completedLessons = useAppSelector((state) => state.app.completedLessons);
  const selectedNcdTopic = useAppSelector((state) => state.app.selectedNcdTopic);

  const audioRef = useRef<HTMLAudioElement>(null);
  const notifiedReminders = useRef(new Set<string>());

  useEffect(() => {
    const token = localStorage.getItem('baho-token');
    const savedUser = localStorage.getItem('baho-user');
    if (!token || !savedUser) return;
    try {
      const user = JSON.parse(savedUser);
      setAuthToken(token);
      dispatch(setAuthenticatedUser({ token, user }));
    } catch {
      localStorage.removeItem('baho-token');
      localStorage.removeItem('baho-user');
    }
  }, [dispatch]);

  useEffect(() => {
    const savedReminders = localStorage.getItem('baho-token') ? null : localStorage.getItem('baho-reminders');
    const hasAccountSession = Boolean(localStorage.getItem('baho-token'));
    const savedIssues = hasAccountSession ? null : localStorage.getItem('baho-issues');
    const savedQuestions = hasAccountSession ? null : localStorage.getItem('baho-questions');
    if (savedReminders) {
      dispatch(setReminders(JSON.parse(savedReminders)));
    }

    if (savedIssues) {
      dispatch(setIssues(JSON.parse(savedIssues)));
    }

    if (savedQuestions) {
      dispatch(setQuestions(JSON.parse(savedQuestions)));
    }
  }, [dispatch]);

  useEffect(() => {
    if (currentScreen !== 'admin' || !authUser) return;
    const loadAdminData = async () => {
      try {
        const [contentResponse, questionResponse] = await Promise.all([
          api.getAdminContent(),
          api.getQuestions()
        ]);
        dispatch(setAdminContent(contentResponse.content));
        dispatch(setQuestions(questionResponse.questions.map((item) => ({
          id: item.id,
          topic: item.topic,
          question: item.question,
          status: item.status === 'Answered' ? 'Answered' : 'Pending',
          answer: item.answer ?? undefined
        }))));

        if (authUser.role === 'admin') {
          const [creatorResponse, issueResponse] = await Promise.all([api.getCreators(), api.getAdminIssues()]);
          dispatch(setAdminCreators(creatorResponse.creators));
          dispatch(setIssues(issueResponse.issues));
        }
      } catch (error) {
        dispatch(setFeedbackMessage('Ntibyashobotse kuzana amakuru y\'ubuyobozi.'));
      }
    };
    loadAdminData();
  }, [authUser, currentScreen, dispatch]);

  useEffect(() => {
    if (!authUser) localStorage.setItem('baho-reminders', JSON.stringify(reminders));
  }, [authUser, reminders]);

  useEffect(() => {
    if (!authUser) localStorage.setItem('baho-issues', JSON.stringify(issues));
  }, [authUser, issues]);

  useEffect(() => {
    if (!authUser) localStorage.setItem('baho-questions', JSON.stringify(questions));
  }, [authUser, questions]);

  useEffect(() => {
    const updateConnection = () => dispatch(setIsOnline(navigator.onLine));
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);

    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const timer = window.setInterval(() => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      reminders.filter((reminder) => reminder.time === time).forEach((reminder) => {
        const key = `${now.toDateString()}-${reminder.id}-${time}`;
        if (notifiedReminders.current.has(key)) return;
        notifiedReminders.current.add(key);
        new Notification('Icyibutsa cya Baho', { body: reminder.label });
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [reminders]);

  useEffect(() => {
    const loadAppData = async () => {
      try {
        const [contentResponse, faqResponse] = await Promise.all([
          api.getContent(),
          api.getFaqs()
        ]);

        if (contentResponse?.content?.length) {
          const fetchedLessons = contentResponse.content.map((item: any) => ({
            id: item.id,
            title: item.title,
            category: item.categoryId === 2 ? 'Umuvuduko w\'amaraso' : item.categoryId === 3 ? 'Diyabete' : item.categoryId === 4 ? 'Ubuzima bw\'umutima' : 'Imirire',
            summary: item.summary,
            body: item.body,
            duration: '03:00',
            audioUrl: item.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
          }));
          dispatch(setLessons(fetchedLessons));
        }

        if (faqResponse?.faqs?.length) {
          dispatch(setFaqItems(faqResponse.faqs.map((item: any) => ({ id: item.id, question: item.question, answer: item.answer }))));
        }

      } catch (error) {
        dispatch(setLessons(defaultLessons));
        dispatch(setFaqItems(defaultFaqItems));
      }
    };

    loadAppData();
  }, [dispatch]);

  useEffect(() => {
    if (!authUser) return;
    api.getReminders().then((response) => dispatch(setReminders(response.reminders))).catch((error) => {
      dispatch(setFeedbackMessage('Ntibyashobotse kuzana ibyibutsa byawe.'));
    });
    api.getProgress().then((response) => dispatch(setCompletedLessons(response.completedLessonIds))).catch((error) => {
      dispatch(setFeedbackMessage('Ntibyashobotse kuzana aho ugeze mu masomo.'));
    });
    api.getQuestions().then((response) => {
      dispatch(setQuestions(response.questions.map((item) => ({
        id: item.id,
        topic: item.topic,
        question: item.question,
        status: item.status === 'Answered' ? 'Answered' : 'Pending',
        answer: item.answer ?? undefined
      }))));
    }).catch((error) => {
      dispatch(setFeedbackMessage('Ntibyashobotse kuzana ibibazo byawe.'));
    });
  }, [authUser, dispatch]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const onTimeUpdate = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        dispatch(setAudioProgress((audio.currentTime / audio.duration) * 100));
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);

    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [dispatch, selectedLesson.id]);

  const filteredLessons = activeCategory === 'All' ? lessons : lessons.filter((lesson) => lesson.category === activeCategory);
  const progressPercent = Math.round((completedLessons.length / Math.max(lessons.length, 1)) * 100);

  const healthTip = useMemo(() => {
    return 'Gabanya umunyu mu mafunguro yawe, kandi ugende iminota 20 ku munsi kugira ngo ubuzima bw\'umutima bube bwiza.';
  }, []);

  const toggleInterest = (interest: Interest) => {
    dispatch(toggleInterestAction(interest));
  };

  const addReminder = async () => {
        if (!reminderForm.time || !reminderForm.label.trim()) {
          dispatch(setFeedbackMessage('Hitamo isaha kandi wandike ikibutsa.'));
          return;
        }
    if (authUser) {
      try {
        const response = await api.createReminder({ time: reminderForm.time, label: reminderForm.label.trim() });
        dispatch(setReminders([...reminders, response.reminder]));
        dispatch(updateReminderForm({ time: '21:00', label: 'Soma isomo ryo mu buzima' }));
        dispatch(setFeedbackMessage('Ikibutsa cyabitswe kuri konti yawe.'));
      } catch (error) {
        dispatch(setFeedbackMessage('Ntibyashobotse kubika ikibutsa. Ongera ugerageze.'));
      }
      return;
    }
    dispatch(addReminderAction());
  };

  const deleteReminder = async (id: number) => {
    if (authUser) {
      try {
        await api.deleteReminder(id);
        dispatch(setReminders(reminders.filter((reminder) => reminder.id !== id)));
      } catch (error) {
        dispatch(setFeedbackMessage('Ntibyashobotse gusiba ikibutsa. Ongera ugerageze.'));
      }
      return;
    }
    dispatch(deleteReminderAction(id));
  };

  const openAuth = async () => {
    dispatch(setFeedbackMessage(''));
    dispatch(setCurrentScreenAction('auth'));
    try {
      const status = await api.getSetupStatus();
      dispatch(setSetupNeeded(status.setupNeeded));
    } catch (error) {
      dispatch(setFeedbackMessage(translateAuthError(error instanceof Error ? error.message : '')));
    }
  };

  const submitAuth = async () => {
    if (!authForm.email.trim() || !authForm.password || (authMode !== 'login' && !authForm.name.trim())) {
      dispatch(setFeedbackMessage('Uzuza ahantu hose hasabwa mbere yo gukomeza.'));
      return;
    }
    try {
      const response = authMode === 'setup'
        ? await api.setupAdmin(authForm)
        : authMode === 'register'
          ? await api.register(authForm)
          : await api.login(authForm);
      setAuthToken(response.token);
      localStorage.setItem('baho-token', response.token);
      localStorage.setItem('baho-user', JSON.stringify(response.user));
      dispatch(setAuthenticatedUser({ token: response.token, user: response.user }));
      const successMessage = authMode === 'login'
        ? 'Winjiye neza.'
        : authMode === 'setup'
          ? 'Konti ya mbere y\'ubuyobozi yafunguwe neza.'
          : 'Konti yawe yafunguwe neza.';
      dispatch(setFeedbackMessage(successMessage));
    } catch (error) {
      dispatch(setFeedbackMessage(translateAuthError(error instanceof Error ? error.message : '')));
    }
  };

  const signOut = () => {
    setAuthToken(null);
    localStorage.removeItem('baho-token');
    localStorage.removeItem('baho-user');
    dispatch(clearAuthenticatedUser());
    dispatch(setFeedbackMessage('Wasohotse muri konti yawe.'));
  };

  const addIssue = async () => {
    if (!issueForm.title.trim() || !issueForm.description.trim()) {
      return;
    }

    const payload = {
      title: issueForm.title.trim(),
      description: issueForm.description.trim()
    };

    const nextIssue = {
      id: Date.now(),
      title: payload.title,
      description: payload.description,
      status: 'Open'
    };

    try {
      const response = await api.createIssue(payload);
      dispatch(addIssueLocal(response.issue || nextIssue));
      dispatch(setFeedbackMessage('Raporo yawe yoherejwe.'));
    } catch (error) {
      dispatch(setFeedbackMessage('Ntibyashobotse kohereza raporo. Ongera ugerageze.'));
    }
  };

  const createCreator = async () => {
    if (!creatorForm.fullName.trim() || !creatorForm.email.trim() || !creatorForm.password.trim()) {
      return;
    }

    try {
      const response = await api.createCreator({
        fullName: creatorForm.fullName.trim(),
        email: creatorForm.email.trim(),
        password: creatorForm.password,
        role: creatorForm.role
      });

      dispatch(addCreatorLocal(response.user));
      dispatch(setFeedbackMessage('Konti y\'umwanditsi yafunguwe.'));
    } catch (error) {
      dispatch(setFeedbackMessage('Ntibyashobotse gufungura konti y\'umwanditsi. Reba amakuru wongere ugerageze.'));
    }
  };

  const createContent = async () => {
    if (!contentForm.title.trim() || !contentForm.body.trim()) {
      return;
    }

    try {
      const payload = {
        categoryId: Number(contentForm.categoryId),
        title: contentForm.title.trim(),
        summary: contentForm.summary.trim(),
        body: contentForm.body.trim(),
        audioUrl: contentForm.audioUrl.trim(),
        status: contentForm.status
      };
      const response = editingContentId
        ? await api.updateContent(editingContentId, payload)
        : await api.createContent(payload);

      if (editingContentId) {
        dispatch(updateContentLocal({
          id: response.content.id,
          title: response.content.title,
          status: response.content.status,
          categoryId: response.content.categoryId,
          summary: response.content.summary || '',
          body: response.content.body,
          audioUrl: response.content.audioUrl || ''
        }));
      } else {
        dispatch(addContentLocal({ id: response.content.id, title: response.content.title, status: response.content.status }));
      }
      dispatch(setFeedbackMessage('Isomo ryabitswe kugira ngo risuzumwe.'));
    } catch (error) {
      dispatch(setFeedbackMessage('Ntibyashobotse kubika isomo. Reba amakuru wongere ugerageze.'));
    }
  };

  const createFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      dispatch(setFeedbackMessage('Andika ikibazo n\'igisubizo mbere yo kubika.'));
      return;
    }
    try {
      const response = await api.createFaq({ question: faqForm.question.trim(), answer: faqForm.answer.trim() });
      dispatch(addFaqLocal(response.faq));
      dispatch(setFeedbackMessage('Ikibazo n\'igisubizo byongeweho.'));
    } catch (error) {
      dispatch(setFeedbackMessage('Ntibyashobotse kongeraho ikibazo n\'igisubizo.'));
    }
  };

  const saveFaq = async (faq: { id?: number; question: string; answer: string }) => {
    if (!faq.id) return;
    try {
      const response = await api.updateFaq(faq.id, { question: faq.question, answer: faq.answer });
      dispatch(updateFaqLocal(response.faq));
      dispatch(setFeedbackMessage('Ikibazo n\'igisubizo byahinduwe.'));
    } catch (error) {
      dispatch(setFeedbackMessage('Ntibyashobotse guhindura ikibazo n\'igisubizo.'));
    }
  };

  const removeFaq = async (id?: number) => {
    if (!id) return;
    try {
      await api.deleteFaq(id);
      dispatch(removeFaqLocal(id));
      dispatch(setFeedbackMessage('Ikibazo n\'igisubizo byasibwe.'));
    } catch (error) {
      dispatch(setFeedbackMessage('Ntibyashobotse gusiba ikibazo n\'igisubizo.'));
    }
  };

  const addQuestion = async () => {
    const trimmedQuestion = questionForm.question.trim();

    if (!trimmedQuestion) {
      dispatch(setFeedbackMessage('Andika ikibazo mbere yo kukohereza.'));
      return;
    }

    const payload = {
      topic: questionForm.topic,
      question: trimmedQuestion
    };

    const fallbackQuestion = {
      id: Date.now(),
      topic: questionForm.topic,
      question: trimmedQuestion,
      status: 'Pending' as const
    };

    try {
      const data = await api.createQuestion(payload);
      dispatch(addQuestionLocal(data.question || fallbackQuestion));
      dispatch(setFeedbackMessage('Ikibazo cyawe cyoherejwe.'));
    } catch (error) {
      dispatch(setFeedbackMessage('Ntibyashobotse kohereza ikibazo. Ongera ugerageze.'));
    }
  };

  const answerQuestion = async (id: number) => {
    const answerText = (answerDrafts[id] || '').trim();
    if (!answerText) {
      dispatch(setFeedbackMessage('Andika igisubizo mbere yo kukohereza.'));
      return;
    }

    try {
      const data = await api.answerQuestion(id, answerText);
      dispatch(answerQuestionSuccess({ id, answer: data.question.answer }));
      dispatch(setFeedbackMessage('Igisubizo cyoherejwe.'));
      return;
    } catch (error) {
      dispatch(setFeedbackMessage('Ntibyashobotse kohereza igisubizo. Ongera ugerageze.'));
    }
  };

  const changeContentStatus = async (id: number, status: string) => {
    try {
      const response = await api.updateContentStatus(id, status);
      dispatch(setAdminContent(adminContent.map((item) => item.id === id ? { ...item, status: response.content.status } : item)));
      dispatch(setFeedbackMessage('Uko isomo rihagaze byahinduwe.'));
    } catch (error) {
      dispatch(setFeedbackMessage('Ntibyashobotse guhindura uko isomo rihagaze.'));
    }
  };

  const removeContent = async (id: number) => {
    try {
      await api.deleteContent(id);
      dispatch(setAdminContent(adminContent.filter((item) => item.id !== id)));
      dispatch(setFeedbackMessage('Isomo ryasibwe.'));
    } catch (error) {
      dispatch(setFeedbackMessage('Ntibyashobotse gusiba isomo.'));
    }
  };

  const editContent = (item: typeof adminContent[number]) => {
    dispatch(setEditingContentId(item.id));
    dispatch(updateContentForm({
      categoryId: item.categoryId ?? 1,
      title: item.title,
      summary: item.summary || '',
      body: item.body || '',
      audioUrl: item.audioUrl || '',
      status: item.status
    }));
  };

  const changeIssueStatus = async (id: number, status: string) => {
    try {
      const response = await api.updateIssueStatus(id, status);
      dispatch(setIssues(issues.map((issue) => issue.id === id ? response.issue : issue)));
      dispatch(setFeedbackMessage('Imiterere ya raporo yahinduwe.'));
    } catch (error) {
      dispatch(setFeedbackMessage('Ntibyashobotse guhindura imiterere ya raporo.'));
    }
  };

  const markLessonComplete = async (lessonId: number) => {
    if (authUser) {
      try {
        await api.completeLesson(lessonId);
        dispatch(markLessonCompleteAction(lessonId));
      } catch (error) {
        dispatch(setFeedbackMessage('Ntibyashobotse kubika aho ugeze mu isomo.'));
      }
      return;
    }
    dispatch(markLessonCompleteAction(lessonId));
  };

  const enableReminderNotifications = async () => {
    if (!('Notification' in window)) {
      dispatch(setFeedbackMessage('Uru rubuga ntirwemera ibimenyesha.'));
      return;
    }
    const permission = await Notification.requestPermission();
    dispatch(setFeedbackMessage(permission === 'granted'
      ? 'Ibimenyesha byemewe igihe Baho ifunguye.'
      : 'Ntiwemereye kohereza ibimenyesha.'));
  };

  const speakExerciseInstructions = () => {
    if (!('speechSynthesis' in window)) {
      dispatch(setFeedbackMessage('Uru rubuga ntirwemera gusoma amabwiriza mu ijwi.'));
      return;
    }
    window.speechSynthesis.cancel();
    const instruction = new SpeechSynthesisUtterance('Tangira ugende buhoro. Komeza ugende ku muvuduko ukoroheye, kandi uhagarare niba wumva utameze neza.');
    instruction.lang = 'rw-RW';
    window.speechSynthesis.speak(instruction);
  };

  const handleSeek = (value: number) => {
    if (!audioRef.current || !Number.isFinite(audioRef.current.duration)) {
      return;
    }

    const nextTime = (value / 100) * audioRef.current.duration;
    audioRef.current.currentTime = nextTime;
    dispatch(setAudioProgress(value));
  };

  const renderLanding = () => (
    <LandingScreen
      onStart={() => dispatch(setCurrentScreenAction('onboarding'))}
      onAdmin={openAuth}
    />
  );

  const renderAuth = () => (
    <div className="screen auth-screen">
      <div className="auth-layout">
        <div className="auth-brand-row">
          <span className="brand-mark">
            <span className="brand-symbol" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M16 27s-10-6.1-10-13.1A5.9 5.9 0 0 1 16 10a5.9 5.9 0 0 1 10 3.9C26 20.9 16 27 16 27Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
                <path d="M8.5 16h4l2-4 3.1 8 2.1-4h3.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>BAHO<span className="brand-period">.</span></span>
          </span>
          <span className="auth-brand-caption">Amakuru meza. Ubuzima bwiza.</span>
        </div>
        <form className="auth-card panel" onSubmit={(event) => { event.preventDefault(); void submitAuth(); }}>
        <div className="auth-heading">
          <p className="eyebrow">Konti ya Baho</p>
          <h2>{authMode === 'setup' ? 'Fungura konti ya mbere y\'ubuyobozi' : authMode === 'register' ? 'Fungura konti y\'umunyeshuri' : 'Injira muri konti yawe'}</h2>
          <p>{authMode === 'setup'
            ? 'Ubuyobozi bwa Baho bushobora kongeramo abakozi no kugenzura amasomo.'
            : authMode === 'register'
              ? 'Fungura konti kugira ngo ubike ibibazo, ibyibutsa n\'iterambere ryawe.'
              : 'Injira kugira ngo ukomeze amasomo yawe n\'ibyo wabitse.'}</p>
        </div>
        {authMode !== 'login' && (
          <label className="field">
            <span>Amazina yose</span>
            <input autoComplete="name" value={authForm.name} onChange={(event) => dispatch(updateAuthForm({ name: event.target.value }))} required />
          </label>
        )}
        <label className="field">
          <span>Imeyili</span>
          <input type="email" autoComplete="email" value={authForm.email} onChange={(event) => dispatch(updateAuthForm({ email: event.target.value }))} required />
        </label>
        <label className="field">
          <span>Ijambo ry'ibanga (inyuguti nibura 8)</span>
          <input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authForm.password} onChange={(event) => dispatch(updateAuthForm({ password: event.target.value }))} minLength={8} required />
        </label>
        <button className="primary full" type="submit">{authMode === 'setup' ? 'Fungura konti y\'ubuyobozi' : authMode === 'register' ? 'Fungura konti' : 'Injira'}</button>
        <div className="auth-divider"><span>UBUNDI BURYO</span></div>
        <div className="auth-alternatives">
          {authMode !== 'login' && (
            <button className="auth-option" type="button" onClick={() => dispatch(setAuthMode('login'))}>
              Usanzwe ufite konti y'umunyeshuri? <strong>Injira</strong>
            </button>
          )}
          {authMode !== 'register' && (
            <button className="auth-option" type="button" onClick={() => dispatch(setAuthMode('register'))}>
              Nta konti ufite? <strong>Fungura konti y'umunyeshuri</strong>
            </button>
          )}
          {setupNeeded && authMode !== 'setup' && (
            <button className="auth-option" type="button" onClick={() => dispatch(setAuthMode('setup'))}>
              <strong>Fungura konti ya mbere y'ubuyobozi</strong>
            </button>
          )}
        </div>
        <button className="auth-back" type="button" onClick={() => dispatch(setCurrentScreenAction('landing'))}>← Subira ku ntangiriro</button>
        </form>
      </div>
    </div>
  );

  const renderOnboarding = () => (
    <div className="screen onboarding-screen">
      <div className="onboarding-content">
        <div className="onboarding-brand-row">
          <span className="brand-mark">
            <span className="brand-symbol" aria-hidden="true">B</span>
            <span>BAHO<span className="brand-period">.</span></span>
          </span>
          <span className="onboarding-progress-label">Intambwe imwe isigaye</span>
        </div>
        <div className="onboarding-card panel">
          <div className="onboarding-step-heading">
            <span className="onboarding-step-number">01</span>
            <div>
              <p className="eyebrow">KUGUTEGURIRA BAHO</p>
              <h2>Ni izihe ngingo zigushishikaje?</h2>
            </div>
          </div>
          <p className="onboarding-intro">Hitamo ingingo wifuza kwigaho. Ibi bidufasha kukwereka amasomo akubereye.</p>
        <div className="interest-grid">
          {[
            'Diyabete',
            'Umuvuduko w\'amaraso',
            'Imirire',
            'Imyitozo ngororamubiri',
            'Ubuzima bw\'umutima'
          ].map((interest) => (
            <button
              key={interest}
              className={`chip ${selectedInterests.includes(interest as Interest) ? 'active' : ''}`}
              onClick={() => toggleInterest(interest as Interest)}
            >
              {interest}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Amazina yawe</span>
          <input value={userName} onChange={(e) => dispatch(setUserNameAction(e.target.value))} placeholder="Andika amazina" />
        </label>
          <div className="onboarding-actions">
            <button className="onboarding-back" onClick={() => dispatch(setCurrentScreenAction('landing'))}>Subira inyuma</button>
            <button className="primary" onClick={() => {
              if (!userName.trim()) {
                dispatch(setFeedbackMessage('Andika amazina yawe kugira ngo ukomeze.'));
                return;
              }
              dispatch(setCurrentScreenAction('dashboard'));
            }}>Komeza <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <DashboardScreen
      userName={userName}
      selectedInterests={selectedInterests}
      lessons={lessons}
      progressPercent={progressPercent}
      isOnline={isOnline}
      isStaff={isStaff}
      healthTip={healthTip}
      onViewLibrary={() => dispatch(setCurrentScreenAction('library'))}
      onViewNcd={() => dispatch(setCurrentScreenAction('ncd'))}
      onViewReminders={() => dispatch(setCurrentScreenAction('reminders'))}
      onViewExercise={() => dispatch(setCurrentScreenAction('exercise'))}
      onViewFaq={() => dispatch(setCurrentScreenAction('faq'))}
      onViewAdmin={() => dispatch(setCurrentScreenAction('admin'))}
      onSelectLesson={(lesson) => {
        dispatch(setSelectedLesson(lesson));
        dispatch(setCurrentScreenAction('library'));
      }}
      onViewDashboard={() => dispatch(setCurrentScreenAction('dashboard'))}
    />
  );

  const renderLibrary = () => (
    <LibraryScreen
      lessons={lessons}
      selectedLesson={selectedLesson}
      activeCategory={activeCategory}
      setActiveCategory={(category) => dispatch(setActiveCategory(category))}
      setSelectedLesson={(lesson) => dispatch(setSelectedLesson(lesson))}
      audioProgress={audioProgress}
      handleSeek={handleSeek}
      markLessonComplete={markLessonComplete}
      audioRef={audioRef}
    />
  );

  const renderNcd = () => (
    <div className="screen dynamic-screen ncd-screen">
      <div className="panel-section">
        <div className="row-between">
          <h2>Amakuru y'ubuzima</h2>
        </div>
        <p className="eyebrow">Indwara zidakira</p>
        <h2>Indwara zifitanye isano n'ubuzima</h2>
        <div className="module-grid">
          {ncdTopics.map((topic, index) => (
            <button key={topic.id} className={`module-card ${selectedNcdTopic === index ? 'active' : ''}`} onClick={() => dispatch(setSelectedNcdTopic(index))}>
              <span>{topic.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3>{ncdTopics[selectedNcdTopic].title}</h3>
        <p className="text-muted">Ni iki?</p>
        <p>{ncdTopics[selectedNcdTopic].description}</p>
        <ul>
          {ncdTopics[selectedNcdTopic].symptoms.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="text-muted">Uko wawurinda</p>
        <ul>
            {ncdTopics[selectedNcdTopic].prevention.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </div>
  );

  const renderExercise = () => (
    <div className="screen dynamic-screen exercise-screen">
      <div className="panel-section">
        <p className="eyebrow">Imyitozo ngororamubiri</p>
        <h2>Hitamo urwego rwawe</h2>
        <div className="tag-row">
          <span className="tag">Nshya</span>
          <span className="tag">Hagati</span>
          <span className="tag">Umwuga</span>
        </div>
        <div className="exercise-box">
          <h3>Kugenda iminota 30</h3>
          <p>Hagende neza mu rugendo rw\'iminota 30 kugira ngo ubuzima bw\'umutima bube bwiza.</p>
            <button className="primary" onClick={speakExerciseInstructions}>Umva amabwiriza</button>
        </div>
      </div>
    </div>
  );

  const renderReminders = () => (
    <div className="screen dynamic-screen reminders-screen">
      <div className="panel-section">
        <div className="row-between">
          <div>
            <p className="eyebrow">Ibyibutsa</p>
            <h2>Ibyibutsa byawe</h2>
          </div>
        </div>

        <div className="reminder-form">
          <input
            type="time"
            value={reminderForm.time}
            onChange={(event) => dispatch(updateReminderForm({ time: event.target.value }))}
          />
          <input
            type="text"
            placeholder="Andika ikibutsa"
            value={reminderForm.label}
            onChange={(event) => dispatch(updateReminderForm({ label: event.target.value }))}
          />
          <button className="primary" onClick={addReminder}>+ Ongeraho</button>
          {'Notification' in window && <button className="secondary" onClick={() => void enableReminderNotifications()}>Fungura ibimenyesha</button>}
        </div>
        <p className="reminder-note">Ibimenyesha bikora igihe Baho ifunguye muri uru rubuga.</p>

        <div className="reminder-list">
          {reminders.map((item) => (
            <div key={item.id} className="reminder-row">
              <div>
                <span>{item.time}</span>
                <strong>{item.label}</strong>
              </div>
              <button className="small-button" onClick={() => deleteReminder(item.id)}>Siba</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFaq = () => (
    <div className="screen dynamic-screen faq-screen">
      <SectionCard eyebrow="Ibibazo bikunze kubazwa" title="Ubufasha">
        {faqItems.map((item) => (
          <div key={item.question} className="faq-item">
            <strong>{item.question}</strong>
            <p>{item.answer}</p>
          </div>
        ))}

        {authUser ? <div className="question-card">
          <h3>Ibibazo by\'umunyeshuri</h3>
          <select
            value={questionForm.topic}
            onChange={(event) => dispatch(updateQuestionForm({ topic: event.target.value }))}
          >
            <option value="Umuvuduko w\'amaraso">Umuvuduko w\'amaraso</option>
            <option value="Diyabete">Diyabete</option>
            <option value="Imirire">Imirire</option>
            <option value="Ubuzima bw\'umutima">Ubuzima bw\'umutima</option>
          </select>
          <textarea
            placeholder="Andika ikibazo cyawe mu Kinyarwanda cyangwa English"
            value={questionForm.question}
            onChange={(event) => dispatch(updateQuestionForm({ question: event.target.value }))}
          />
          <button className="primary" onClick={addQuestion}>Ohereza ikibazo</button>
        </div> : <div className="question-card">
          <p>Injira cyangwa ufungure konti kugira ngo wohereze ibibazo kandi urebe ibisubizo byawe.</p>
          <button className="primary" onClick={openAuth}>Injira muri konti</button>
        </div>}

        {authUser && <div className="question-list">
          <h3>Ibibazo byawe</h3>
          {questions.map((item) => (
            <div key={item.id} className="question-row">
              <div>
                <strong>{item.topic}</strong>
                <p>{item.question}</p>
                {item.answer && <span className="answer-box">Igisubizo: {item.answer}</span>}
              </div>
              <span className={`status-pill ${item.status === 'Answered' ? 'success' : ''}`}>{statusInKinyarwanda(item.status)}</span>
            </div>
          ))}
        </div>}

        <div className="issue-card">
          <h3>Rapora ikibazo</h3>
          <input
            type="text"
            placeholder="Umutwe w\'ikibazo"
            value={issueForm.title}
            onChange={(event) => dispatch(updateIssueForm({ title: event.target.value }))}
          />
          <textarea
            placeholder="Andika ikibazo cyawe"
            value={issueForm.description}
            onChange={(event) => dispatch(updateIssueForm({ description: event.target.value }))}
          />
          <button className="primary" onClick={addIssue}>Ohereza ikibazo</button>
        </div>
      </SectionCard>
    </div>
  );

  const renderAdmin = () => (
    <div className="screen dynamic-screen admin-screen">
      <SectionCard eyebrow="Ubuyobozi bwa Baho" title="Gucunga amasomo n'ubufasha">

        {authUser?.role === 'admin' && <div className="question-card">
          <h3>Ongeraho umwanditsi</h3>
          <input
            type="text"
            placeholder="Amazina yose"
            required
            value={creatorForm.fullName}
            onChange={(event) => dispatch(updateCreatorForm({ fullName: event.target.value }))}
          />
          <input
            type="email"
            placeholder="Imeyili"
            required
            value={creatorForm.email}
            onChange={(event) => dispatch(updateCreatorForm({ email: event.target.value }))}
          />
          <input
            type="password"
            placeholder="Ijambo ry'ibanga"
            minLength={8}
            required
            value={creatorForm.password}
            onChange={(event) => dispatch(updateCreatorForm({ password: event.target.value }))}
          />
          <button className="primary" onClick={createCreator}>Fungura konti y'umwanditsi</button>
        </div>}

        <div className="question-card">
          <h3>Ongeraho isomo</h3>
          <select
            value={contentForm.categoryId}
            onChange={(event) => dispatch(updateContentForm({ categoryId: Number(event.target.value) }))}
          >
            <option value={1}>Imirire</option>
            <option value={2}>Umuvuduko w&apos;amaraso</option>
            <option value={3}>Diyabete</option>
            <option value={4}>Ubuzima bw'umutima</option>
          </select>
          <input
            type="text"
            placeholder="Umutwe w'isomo"
            value={contentForm.title}
            onChange={(event) => dispatch(updateContentForm({ title: event.target.value }))}
          />
          <input
            type="text"
            placeholder="Incamake y'isomo"
            value={contentForm.summary}
            onChange={(event) => dispatch(updateContentForm({ summary: event.target.value }))}
          />
          <textarea
            placeholder="Ibisobanuro birambuye by'isomo"
            value={contentForm.body}
            onChange={(event) => dispatch(updateContentForm({ body: event.target.value }))}
          />
          <input
            type="text"
            placeholder="Aho amajwi abitse (URL)"
            value={contentForm.audioUrl}
            onChange={(event) => dispatch(updateContentForm({ audioUrl: event.target.value }))}
          />
          <select
            value={contentForm.status}
            onChange={(event) => dispatch(updateContentForm({ status: event.target.value }))}
          >
            <option value="draft">Inyandiko itarangiye</option>
            <option value="review">Itegereje igenzurwa</option>
            <option value="published">Yasohotse</option>
          </select>
          <div className="action-row">
            <button className="primary" onClick={createContent}>{editingContentId ? 'Hindura isomo' : authUser?.role === 'admin' ? 'Bika isomo' : 'Ohereza kugira ngo risuzumwe'}</button>
            {editingContentId && <button className="secondary" onClick={() => { dispatch(setEditingContentId(null)); dispatch(updateContentForm({ categoryId: 1, title: '', summary: '', body: '', audioUrl: '', status: 'draft' })); }}>Reka guhindura</button>}
          </div>
        </div>

        {authUser?.role === 'admin' && <div className="report-section">
          <h3>Abanditsi bari muri Baho</h3>
          {adminCreators.length === 0 ? <p className="text-muted">Nta banditsi barashyirwaho.</p> : adminCreators.map((creator) => (
            <div key={creator.id} className="report-row">
              <div>
                <strong>{creator.fullName}</strong>
                <p>{creator.email}</p>
              </div>
              <span className="status-pill">Umwanditsi</span>
            </div>
          ))}
        </div>}

        {authUser?.role === 'admin' && <div className="question-card">
          <h3>Gucunga ibibazo bikunze kubazwa</h3>
          <input
            type="text"
            placeholder="Ikibazo"
            value={faqForm.question}
            onChange={(event) => dispatch(updateFaqForm({ question: event.target.value }))}
          />
          <textarea
            placeholder="Igisubizo"
            value={faqForm.answer}
            onChange={(event) => dispatch(updateFaqForm({ answer: event.target.value }))}
          />
          <button className="primary" onClick={createFaq}>Ongeraho igisubizo</button>
          {faqItems.map((faq) => (
            <div className="faq-item" key={faq.id ?? faq.question}>
              <input
                type="text"
                value={faq.question}
                aria-label="Ikibazo gikunze kubazwa"
                onChange={(event) => {
                  if (faq.id !== undefined) dispatch(updateFaqLocal({ id: faq.id, question: event.target.value, answer: faq.answer }));
                }}
              />
              <textarea
                value={faq.answer}
                aria-label="Igisubizo cy'ikibazo"
                onChange={(event) => {
                  if (faq.id !== undefined) dispatch(updateFaqLocal({ id: faq.id, question: faq.question, answer: event.target.value }));
                }}
              />
              {faq.id && <div className="action-row">
                <button className="small-button" onClick={() => void saveFaq(faq)}>Bika</button>
                <button className="small-button" onClick={() => void removeFaq(faq.id)}>Siba</button>
              </div>}
            </div>
          ))}
        </div>}

        <div className="report-section">
          <h3>Amasomo ategereje cyangwa yasohotse</h3>
          {adminContent.length === 0 ? <p className="text-muted">Nta masomo arahagarikwa.</p> : adminContent.map((item) => (
            <div key={item.id} className="report-row">
              <div><strong>{item.title}</strong><p>{statusInKinyarwanda(item.status)}</p></div>
              <div className="stacked-actions">
                {authUser?.role === 'admin' && <button className="small-button" onClick={() => editContent(item)}>Hindura</button>}
                {authUser?.role === 'admin' && item.status !== 'published' && <button className="small-button" onClick={() => void changeContentStatus(item.id, 'published')}>Sohora</button>}
                {authUser?.role === 'admin' && item.status !== 'rejected' && <button className="small-button" onClick={() => void changeContentStatus(item.id, 'rejected')}>Anga</button>}
                {authUser?.role === 'admin' && <button className="small-button" onClick={() => void removeContent(item.id)}>Siba</button>}
              </div>
            </div>
          ))}
        </div>

        {authUser?.role === 'admin' && <div className="report-section">
          <h3>Raporo z'abakoresha</h3>
          {issues.map((issue) => (
            <div key={issue.id} className="report-row">
              <div>
                <strong>{issue.title}</strong>
                <p>{issue.description}</p>
              </div>
              <select value={issue.status} onChange={(event) => void changeIssueStatus(issue.id, event.target.value)}>
                <option value="Open">Nshya</option>
                <option value="In review">Iri gusuzumwa</option>
                <option value="Resolved">Yakemuwe</option>
              </select>
            </div>
          ))}
        </div>}

        <div className="report-section">
          <h3>Ibibazo by'abanyeshuri</h3>
          {questions.map((question) => (
            <div key={question.id} className="report-row">
              <div>
                <strong>{question.topic}</strong>
                <p>{question.question}</p>
              </div>
              <div className="stacked-actions">
                <StatusBadge label={statusInKinyarwanda(question.status)} tone={question.status === 'Answered' ? 'success' : 'warning'} />
                {question.status !== 'Answered' && (
                  <>
                    <textarea
                      aria-label={`Andika igisubizo ku kibazo cya ${question.topic}`}
                      placeholder="Andika igisubizo"
                      value={answerDrafts[question.id] || ''}
                      onChange={(event) => dispatch(updateAnswerDraft({ id: question.id, answer: event.target.value }))}
                    />
                    <button className="small-button" onClick={() => void answerQuestion(question.id)}>Ohereza igisubizo</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );

  const innerScreenTitles: Record<string, string> = {
    library: 'Amasomo',
    ncd: 'Indwara zidakira',
    exercise: 'Imyitozo ngororamubiri',
    reminders: 'Ibyibutsa',
    faq: 'Ubufasha',
    admin: 'Ubuyobozi bwa Baho'
  };
  const isInnerScreen = ['library', 'ncd', 'exercise', 'reminders', 'faq', 'admin'].includes(currentScreen);

  return (
    <div className="app-shell">
      {feedbackMessage && <div className="panel-section" role="status">
        <div className="row-between">
          <p>{feedbackMessage}</p>
          <button className="small-button" onClick={() => dispatch(setFeedbackMessage(''))}>Funga</button>
        </div>
      </div>}
      {isInnerScreen && <header className="inner-page-header">
        <button className="brand-mark inner-page-brand" onClick={() => dispatch(setCurrentScreenAction('dashboard'))} aria-label="Baho ahabanza">
          <span className="brand-symbol inner-brand-symbol" aria-hidden="true">B</span>
          <span>BAHO<span className="brand-period">.</span></span>
        </button>
        <span className="inner-page-title">{innerScreenTitles[currentScreen]}</span>
        <div className="inner-page-actions">
          <span className="inner-user-label">{authUser?.name || 'Umushyitsi'}</span>
          {authUser ? <button className="inner-page-action" onClick={signOut}>Sohoka</button> : <button className="inner-page-action" onClick={openAuth}>Injira</button>}
          <button className="inner-page-home" onClick={() => dispatch(setCurrentScreenAction('dashboard'))}>Ahabanza</button>
        </div>
      </header>}
      {currentScreen === 'landing' && renderLanding()}
      {currentScreen === 'auth' && renderAuth()}
      {currentScreen === 'onboarding' && renderOnboarding()}
      {currentScreen === 'dashboard' && renderDashboard()}
      {currentScreen === 'library' && renderLibrary()}
      {currentScreen === 'ncd' && renderNcd()}
      {currentScreen === 'exercise' && renderExercise()}
      {currentScreen === 'reminders' && renderReminders()}
      {currentScreen === 'faq' && renderFaq()}
      {currentScreen === 'admin' && renderAdmin()}
    </div>
  );
}

export default App;
