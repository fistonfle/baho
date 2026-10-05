import { useState } from 'react';

import type { Curriculum, QuizQuestion } from '../../types';
import { DiseaseManager } from '../DiseaseManager';

import { api } from '../../services/api';
import {
  emptyContentForm,
  addContentLocal,
  addCreatorLocal,
  addFaqLocal,
  answerQuestionSuccess,
  removeFaqLocal,
  setAdminContent,
  setEditingContentId,
  setFeedbackMessage,
  setIssues,
  updateAnswerDraft,
  updateContentForm,
  updateContentLocal,
  updateCreatorForm,
  updateFaqForm,
  updateFaqLocal
} from '../../store/appSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { StatusBadge } from '../ui';

const statusLabels: Record<string, string> = {
  draft: 'Umushinga',
  review: 'Itegereje igenzurwa',
  published: 'Yasohotse',
  rejected: 'Yasubijwe inyuma',
  open: 'Nshya',
  'in review': 'Iri gusuzumwa',
  resolved: 'Yakemuwe',
  answered: 'Yasubijwe',
  pending: 'Itegereje'
};

const statusText = (status: string) => statusLabels[status.toLowerCase()] || status;
const statusTone = (status: string) => (['published', 'answered', 'resolved'].includes(status.toLowerCase()) ? 'success' : ['review', 'pending', 'open'].includes(status.toLowerCase()) ? 'warning' : 'neutral');
// Illustrations shipped in frontend/public/images that staff can pick from.
const imageChoices = ['bp-heart', 'bp-check', 'plate', 'salt', 'water', 'glucose', 'heart', 'stroke', 'screening', 'walking', 'medicine', 'foot-care', 'no-smoking']
  .map((name) => `/images/${name}.svg`);

const emptyQuestion = { question: '', options: ['', ''], answerIndex: 0, explanation: '' };

// Lets staff write the short comprehension quiz shown at the end of a lesson.
function QuizEditor({ quiz, onChange }: { quiz: QuizQuestion[]; onChange: (quiz: QuizQuestion[]) => void }) {
  const [draft, setDraft] = useState<QuizQuestion>(emptyQuestion);
  const canAdd = draft.question.trim() && draft.options.filter((option) => option.trim()).length >= 2;

  const addQuestion = () => {
    const options = draft.options.map((option) => option.trim()).filter(Boolean);
    onChange([...quiz, { ...draft, question: draft.question.trim(), options, answerIndex: Math.min(draft.answerIndex, options.length - 1) }]);
    setDraft(emptyQuestion);
  };

  return (
    <div className="quiz-editor creator-field-wide">
      <span className="quiz-editor-label">Isuzuma ry'isomo ({quiz.length} {quiz.length === 1 ? 'ikibazo' : 'ibibazo'})</span>
      {quiz.map((item, index) => (
        <div key={index} className="quiz-editor-item">
          <div>
            <strong>{index + 1}. {item.question}</strong>
            <p>{item.options.map((option, optionIndex) => (optionIndex === item.answerIndex ? `✓ ${option}` : option)).join(' · ')}</p>
          </div>
          <button type="button" className="small-button reject" onClick={() => onChange(quiz.filter((_, position) => position !== index))}>Siba</button>
        </div>
      ))}
      {quiz.length < 10 && (
        <div className="quiz-editor-new">
          <input value={draft.question} onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))} placeholder="Ikibazo gishya" aria-label="Ikibazo gishya" />
          {draft.options.map((option, index) => (
            <label key={index} className="quiz-editor-option">
              <input
                type="radio"
                name="quiz-correct"
                checked={draft.answerIndex === index}
                onChange={() => setDraft((current) => ({ ...current, answerIndex: index }))}
                aria-label={`Igisubizo cya ${index + 1} ni cyo cy'ukuri`}
              />
              <input
                value={option}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((current) => ({ ...current, options: current.options.map((item, position) => (position === index ? value : item)) }));
                }}
                placeholder={`Igisubizo ${String.fromCharCode(65 + index)}`}
              />
            </label>
          ))}
          <div className="quiz-editor-actions">
            {draft.options.length < 4 && (
              <button type="button" className="small-button" onClick={() => setDraft((current) => ({ ...current, options: [...current.options, ''] }))}>+ Igisubizo</button>
            )}
            <input value={draft.explanation} onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))} placeholder="Ibisobanuro (si ngombwa)" aria-label="Ibisobanuro" />
            <button type="button" className="small-button approve" onClick={addQuestion} disabled={!canAdd}>Ongeraho ikibazo</button>
          </div>
          <p className="form-hint">Hitamo akaziga k'igisubizo cy'ukuri.</p>
        </div>
      )}
    </div>
  );
}

type AdminTab = 'review' | 'content' | 'diseases' | 'questions' | 'staff' | 'issues' | 'faq';

// Shared lesson editor used by both administrators and creators.
function ContentForm({ isCreator, onSave }: { isCreator: boolean; onSave: (status: string) => void }) {
  const dispatch = useAppDispatch();
  const contentForm = useAppSelector((state) => state.app.contentForm);
  const editingContentId = useAppSelector((state) => state.app.editingContentId);
  const curricula = useAppSelector((state) => state.app.curricula);
  const categories = useAppSelector((state) => state.app.categories);

  const togglePath = (id: number) => dispatch(updateContentForm({
    curriculumIds: contentForm.curriculumIds.includes(id)
      ? contentForm.curriculumIds.filter((item) => item !== id)
      : [...contentForm.curriculumIds, id]
  }));

  return (
    <form className="creator-content-form question-card" onSubmit={(event) => { event.preventDefault(); onSave('review'); }}>
      <div className="creator-form-heading">
        <div>
          <p className="eyebrow">GUTEGURA ISOMO</p>
          <h3>{editingContentId ? 'Hindura isomo' : 'Ongeraho isomo rishya'}</h3>
        </div>
        {editingContentId && <span className="status-pill">Uri guhindura</span>}
      </div>
      <div className="creator-form-grid">
        <label className="creator-field">
          <span>Icyiciro</span>
          <select value={contentForm.categoryId} onChange={(event) => dispatch(updateContentForm({ categoryId: Number(event.target.value) }))}>
            {categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
        <label className="creator-field">
          <span>Umutwe w'isomo</span>
          <input value={contentForm.title} onChange={(event) => dispatch(updateContentForm({ title: event.target.value }))} placeholder="Andika umutwe usobanutse" required />
        </label>
        <label className="creator-field creator-field-wide">
          <span>Incamake</span>
          <input value={contentForm.summary} onChange={(event) => dispatch(updateContentForm({ summary: event.target.value }))} placeholder="Vuga muri make icyo isomo ryigisha" />
        </label>
        <label className="creator-field creator-field-wide">
          <span>Ibikubiye mu isomo</span>
          <textarea value={contentForm.body} onChange={(event) => dispatch(updateContentForm({ body: event.target.value }))} placeholder="Andika amagambo yoroshye, interuro ngufi" required />
        </label>
        <label className="creator-field creator-field-wide">
          <span>Aho ijwi ribitse (MP3, si ngombwa)</span>
          <input value={contentForm.audioUrl} onChange={(event) => dispatch(updateContentForm({ audioUrl: event.target.value }))} placeholder="/audio/isomo.mp3" />
        </label>
        <div className="creator-field creator-field-wide">
          <span>Ifoto y'isomo</span>
          <div className="image-picker" role="radiogroup" aria-label="Ifoto y'isomo">
            {imageChoices.map((url) => (
              <button
                type="button"
                key={url}
                role="radio"
                aria-checked={contentForm.imageUrl === url}
                className={contentForm.imageUrl === url ? 'active' : ''}
                onClick={() => dispatch(updateContentForm({ imageUrl: contentForm.imageUrl === url ? '' : url }))}
              >
                <img src={url} alt="" />
              </button>
            ))}
          </div>
        </div>
        {curricula.length > 0 && (
          <div className="creator-field creator-field-wide">
            <span>Inzira z'imyigire zirimo iri somo</span>
            <div className="path-checks">
              {curricula.map((curriculum) => (
                <label key={curriculum.id} className={`path-check ${contentForm.curriculumIds.includes(curriculum.id) ? 'active' : ''}`}>
                  <input type="checkbox" checked={contentForm.curriculumIds.includes(curriculum.id)} onChange={() => togglePath(curriculum.id)} />
                  {curriculum.title}
                </label>
              ))}
            </div>
          </div>
        )}
        <QuizEditor quiz={contentForm.quiz} onChange={(quiz) => dispatch(updateContentForm({ quiz }))} />
      </div>
      <p className="form-hint">Nta jwi rihari, Baho izasoma isomo ikoresheje ijwi rya mudasobwa.</p>
      <div className="creator-form-actions">
        <button type="button" className="secondary" onClick={() => onSave('draft')}>Bika nk'umushinga</button>
        {isCreator
          ? <button type="submit" className="primary">Ohereza kugira ngo risuzumwe</button>
          : <>
            <button type="submit" className="secondary">Shyira mu igenzurwa</button>
            <button type="button" className="primary" onClick={() => onSave('published')}>Sohora ako kanya</button>
          </>}
        {editingContentId && (
          <button type="button" className="creator-cancel" onClick={() => { dispatch(setEditingContentId(null)); dispatch(updateContentForm(emptyContentForm)); }}>
            Hagarika guhindura
          </button>
        )}
      </div>
    </form>
  );
}

export function AdminScreen() {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.app.authUser);
  const adminContent = useAppSelector((state) => state.app.adminContent);
  const adminCreators = useAppSelector((state) => state.app.adminCreators);
  const contentForm = useAppSelector((state) => state.app.contentForm);
  const editingContentId = useAppSelector((state) => state.app.editingContentId);
  const creatorForm = useAppSelector((state) => state.app.creatorForm);
  const faqItems = useAppSelector((state) => state.app.faqItems);
  const faqForm = useAppSelector((state) => state.app.faqForm);
  const questions = useAppSelector((state) => state.app.questions);
  const answerDrafts = useAppSelector((state) => state.app.answerDrafts);
  const issues = useAppSelector((state) => state.app.issues);
  const categories = useAppSelector((state) => state.app.categories);
  const categoryName = (id?: number) => categories.find((category) => category.id === id)?.name ?? '';
  const isCreator = authUser?.role === 'creator';
  const [tab, setTab] = useState<AdminTab>(isCreator ? 'content' : 'review');
  const [previewId, setPreviewId] = useState<number | null>(null);

  const reviewQueue = adminContent.filter((item) => item.status === 'review');
  const pendingQuestions = questions.filter((item) => item.status !== 'Answered');
  const openIssues = issues.filter((item) => item.status !== 'Resolved');

  const notify = (message: string) => dispatch(setFeedbackMessage(message));

  const saveContent = async (status: string) => {
    if (!contentForm.title.trim() || !contentForm.body.trim()) {
      notify('Andika umutwe n\'ibikubiye mu isomo.');
      return;
    }
    const payload = {
      categoryId: Number(contentForm.categoryId),
      title: contentForm.title.trim(),
      summary: contentForm.summary.trim(),
      body: contentForm.body.trim(),
      audioUrl: contentForm.audioUrl.trim(),
      imageUrl: contentForm.imageUrl,
      quiz: contentForm.quiz,
      curriculumIds: contentForm.curriculumIds,
      status
    };
    try {
      const response = editingContentId ? await api.updateContent(editingContentId, payload) : await api.createContent(payload);
      const saved = response.content;
      dispatch(editingContentId ? updateContentLocal(saved) : addContentLocal(saved));
      notify(status === 'draft' ? 'Umushinga wabitswe.' : status === 'published' ? 'Isomo ryasohotse.' : 'Isomo ryoherejwe kugira ngo risuzumwe.');
    } catch {
      notify('Ntibyashobotse kubika isomo. Reba amakuru wongere ugerageze.');
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
      imageUrl: item.imageUrl || '',
      quiz: item.quiz || [],
      curriculumIds: item.curriculumIds || [],
      status: item.status
    }));
    setTab('content');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Opens the lesson form ready for a new lesson about this disease.
  const writeLessonFor = (disease: Curriculum) => {
    dispatch(setEditingContentId(null));
    dispatch(updateContentForm({ ...emptyContentForm, categoryId: disease.categoryId ?? 1, curriculumIds: [disease.id] }));
    setTab('content');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeContentStatus = async (id: number, status: string) => {
    try {
      const response = await api.updateContentStatus(id, status);
      dispatch(setAdminContent(adminContent.map((item) => item.id === id ? { ...item, status: response.content.status } : item)));
      notify(status === 'published' ? 'Isomo ryasohotse. Abiga bararibona.' : 'Isomo ryasubijwe umwanditsi.');
    } catch {
      notify('Ntibyashobotse guhindura uko isomo rihagaze.');
    }
  };

  const removeContent = async (id: number) => {
    if (!window.confirm('Urashaka gusiba iri somo burundu?')) return;
    try {
      await api.deleteContent(id);
      dispatch(setAdminContent(adminContent.filter((item) => item.id !== id)));
      notify('Isomo ryasibwe.');
    } catch {
      notify('Ntibyashobotse gusiba isomo.');
    }
  };

  const createStaff = async () => {
    if (!creatorForm.fullName.trim() || !creatorForm.email.trim() || creatorForm.password.length < 8) {
      notify('Uzuza amazina, imeyili n\'ijambo ry\'ibanga rigizwe n\'inyuguti nibura 8.');
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
      notify(creatorForm.role === 'admin' ? 'Konti y\'umuyobozi yafunguwe.' : 'Konti y\'umwanditsi yafunguwe.');
    } catch {
      notify('Ntibyashobotse gufungura konti. Imeyili ishobora kuba isanzwe ikoreshwa.');
    }
  };

  const answerQuestion = async (id: number) => {
    const answer = (answerDrafts[id] || '').trim();
    if (!answer) {
      notify('Andika igisubizo mbere yo kucyohereza.');
      return;
    }
    try {
      const data = await api.answerQuestion(id, answer);
      dispatch(answerQuestionSuccess({ id, answer: data.question.answer }));
      notify('Igisubizo cyoherejwe.');
    } catch {
      notify('Ntibyashobotse kohereza igisubizo.');
    }
  };

  const changeIssueStatus = async (id: number, status: string) => {
    try {
      const response = await api.updateIssueStatus(id, status);
      dispatch(setIssues(issues.map((issue) => issue.id === id ? response.issue : issue)));
    } catch {
      notify('Ntibyashobotse guhindura imiterere ya raporo.');
    }
  };

  const createFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      notify('Andika ikibazo n\'igisubizo.');
      return;
    }
    try {
      const response = await api.createFaq({ question: faqForm.question.trim(), answer: faqForm.answer.trim() });
      dispatch(addFaqLocal(response.faq));
      notify('Ikibazo n\'igisubizo byongeweho.');
    } catch {
      notify('Ntibyashobotse kongeraho ikibazo.');
    }
  };

  const saveFaq = async (faq: { id?: number; question: string; answer: string }) => {
    if (!faq.id) return;
    try {
      const response = await api.updateFaq(faq.id, { question: faq.question, answer: faq.answer });
      dispatch(updateFaqLocal(response.faq));
      notify('Byahinduwe.');
    } catch {
      notify('Ntibyashobotse guhindura.');
    }
  };

  const removeFaq = async (id?: number) => {
    if (!id || !window.confirm('Gusiba iki kibazo?')) return;
    try {
      await api.deleteFaq(id);
      dispatch(removeFaqLocal(id));
    } catch {
      notify('Ntibyashobotse gusiba.');
    }
  };

  const tabs: { id: AdminTab; label: string; count?: number; adminOnly?: boolean }[] = [
    { id: 'review', label: 'Igenzurwa', count: reviewQueue.length, adminOnly: true },
    { id: 'content', label: isCreator ? 'Amasomo yanjye' : 'Amasomo yose' },
    { id: 'diseases', label: 'Indwara', adminOnly: true },
    { id: 'questions', label: 'Ibibazo', count: pendingQuestions.length },
    { id: 'staff', label: 'Abakozi', adminOnly: true },
    { id: 'issues', label: 'Raporo', count: openIssues.length, adminOnly: true },
    { id: 'faq', label: 'FAQ', adminOnly: true }
  ];

  const contentRow = (item: typeof adminContent[number], actions: 'review' | 'list') => (
    <article key={item.id} className="admin-content-row">
      <div className="admin-content-main">
        <div className="admin-content-title">
          <strong>{item.title}</strong>
          <span>{categoryName(item.categoryId)}</span>
        </div>
        <StatusBadge label={statusText(item.status)} tone={statusTone(item.status)} />
      </div>
      {previewId === item.id && (
        <div className="admin-preview">
          {item.imageUrl && <img className="admin-preview-image" src={item.imageUrl} alt="" />}
          {item.summary && <p><strong>{item.summary}</strong></p>}
          <p>{item.body}</p>
          <p className="form-hint">Isuzuma: ibibazo {item.quiz?.length ?? 0} · Inzira: {item.curriculumIds?.length ?? 0}</p>
        </div>
      )}
      <div className="admin-row-actions">
        <button className="small-button" onClick={() => setPreviewId(previewId === item.id ? null : item.id)}>{previewId === item.id ? 'Funga' : 'Soma'}</button>
        {(!isCreator || ['draft', 'review', 'rejected'].includes(item.status)) && <button className="small-button" onClick={() => editContent(item)}>Hindura</button>}
        {!isCreator && item.status !== 'published' && <button className="small-button approve" onClick={() => void changeContentStatus(item.id, 'published')}>✓ Sohora</button>}
        {!isCreator && actions === 'review' && <button className="small-button reject" onClick={() => void changeContentStatus(item.id, 'rejected')}>Subiza inyuma</button>}
        {!isCreator && actions === 'list' && item.status === 'published' && <button className="small-button" onClick={() => void changeContentStatus(item.id, 'rejected')}>Kura ku rubuga</button>}
        {!isCreator && actions === 'list' && <button className="small-button reject" onClick={() => void removeContent(item.id)}>Siba</button>}
      </div>
    </article>
  );

  return (
    <div className="screen dynamic-screen admin-screen">
      <div className="panel-section">
        <p className="eyebrow">{isCreator ? 'Umwanya w\'umwanditsi' : 'Ubuyobozi bwa Baho'}</p>
        <h2>Muraho, {authUser?.name}</h2>
        <p className="screen-intro">{isCreator
          ? 'Tegura amasomo asobanutse. Azabanza gusuzumwa n\'umuyobozi mbere yo kugera ku biga.'
          : 'Genzura amasomo, subiza ibibazo kandi ucunge abakozi.'}</p>

        {!isCreator && (
          <div className="staff-overview">
            <article><span>Bitegereje igenzurwa</span><strong>{reviewQueue.length}</strong></article>
            <article><span>Amasomo yasohotse</span><strong>{adminContent.filter((item) => item.status === 'published').length}</strong></article>
            <article><span>Ibibazo bitarasubizwa</span><strong>{pendingQuestions.length}</strong></article>
            <article><span>Abakozi</span><strong>{adminCreators.length}</strong></article>
          </div>
        )}

        <div className="admin-tabs" role="tablist">
          {tabs.filter((item) => !(item.adminOnly && isCreator)).map((item) => (
            <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
              {item.label}{item.count ? <span className="tab-count">{item.count}</span> : null}
            </button>
          ))}
        </div>

        {tab === 'review' && (
          <section className="admin-section">
            {reviewQueue.length === 0
              ? <div className="creator-empty-state"><span aria-hidden="true">✓</span><strong>Nta somo ritegereje</strong><p>Amasomo abanditsi bohereje azagaragara hano.</p></div>
              : reviewQueue.map((item) => contentRow(item, 'review'))}
          </section>
        )}

        {tab === 'content' && (
          <section className="admin-section">
            <ContentForm isCreator={isCreator} onSave={(status) => void saveContent(status)} />
            <h3 className="subheading">{isCreator ? 'Amasomo watanze' : 'Amasomo yose'} ({adminContent.length})</h3>
            {adminContent.length === 0
              ? <div className="creator-empty-state"><span aria-hidden="true">✎</span><strong>Nta somo rirahari</strong><p>Amasomo n'uko asuzumwa bizagaragara hano.</p></div>
              : adminContent.map((item) => contentRow(item, 'list'))}
          </section>
        )}

        {tab === 'diseases' && <DiseaseManager onWriteLesson={writeLessonFor} />}

        {tab === 'questions' && (
          <section className="admin-section">
            {questions.length === 0 && <p className="text-muted">Nta bibazo birahari.</p>}
            {questions.map((question) => (
              <article key={question.id} className="admin-content-row">
                <div className="admin-content-main">
                  <div className="admin-content-title">
                    <strong>{question.question}</strong>
                    <span>{question.topic}</span>
                  </div>
                  <StatusBadge label={statusText(question.status)} tone={question.status === 'Answered' ? 'success' : 'warning'} />
                </div>
                {question.answer && <p className="answer-box">{question.answer}</p>}
                {question.status !== 'Answered' && (
                  <div className="answer-form">
                    <textarea
                      aria-label={`Igisubizo ku kibazo: ${question.question}`}
                      placeholder="Andika igisubizo cyoroshye kumva"
                      value={answerDrafts[question.id] || ''}
                      onChange={(event) => dispatch(updateAnswerDraft({ id: question.id, answer: event.target.value }))}
                    />
                    <button className="primary" onClick={() => void answerQuestion(question.id)}>Ohereza igisubizo</button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {tab === 'staff' && (
          <section className="admin-section admin-two-col">
            <form className="question-card" onSubmit={(event) => { event.preventDefault(); void createStaff(); }}>
              <h3>Ongeraho umukozi</h3>
              <p className="form-hint">Abanditsi ni abaganga, abaforomo cyangwa abajyanama b'ubuzima bandika amasomo.</p>
              <label className="creator-field"><span>Amazina yose</span><input value={creatorForm.fullName} onChange={(event) => dispatch(updateCreatorForm({ fullName: event.target.value }))} required /></label>
              <label className="creator-field"><span>Imeyili</span><input type="email" value={creatorForm.email} onChange={(event) => dispatch(updateCreatorForm({ email: event.target.value }))} required /></label>
              <label className="creator-field"><span>Ijambo ry'ibanga ry'agateganyo</span><input type="password" minLength={8} value={creatorForm.password} onChange={(event) => dispatch(updateCreatorForm({ password: event.target.value }))} required /></label>
              <label className="creator-field">
                <span>Inshingano</span>
                <select value={creatorForm.role} onChange={(event) => dispatch(updateCreatorForm({ role: event.target.value }))}>
                  <option value="creator">Umwanditsi (yandika amasomo)</option>
                  <option value="admin">Umuyobozi (agenzura byose)</option>
                </select>
              </label>
              <button className="primary" type="submit">Fungura konti</button>
            </form>
            <div>
              <h3 className="subheading">Abakozi ba Baho</h3>
              {adminCreators.length === 0 ? <p className="text-muted">Nta bakozi barashyirwaho.</p> : adminCreators.map((member) => (
                <div key={member.id} className="staff-row">
                  <span className="account-avatar" aria-hidden="true">{member.fullName.charAt(0).toUpperCase()}</span>
                  <div><strong>{member.fullName}</strong><p>{member.email}</p></div>
                  <StatusBadge label={member.role === 'admin' ? 'Umuyobozi' : 'Umwanditsi'} tone={member.role === 'admin' ? 'success' : 'neutral'} />
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'issues' && (
          <section className="admin-section">
            {issues.length === 0 && <p className="text-muted">Nta raporo zirahari.</p>}
            {issues.map((issue) => (
              <article key={issue.id} className="admin-content-row">
                <div className="admin-content-main">
                  <div className="admin-content-title">
                    <strong>{issue.title}</strong>
                    <span>{issue.description}</span>
                  </div>
                  <select className="status-select" value={issue.status} onChange={(event) => void changeIssueStatus(issue.id, event.target.value)} aria-label="Imiterere ya raporo">
                    <option value="Open">Nshya</option>
                    <option value="In review">Iri gusuzumwa</option>
                    <option value="Resolved">Yakemuwe</option>
                  </select>
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === 'faq' && (
          <section className="admin-section">
            <form className="question-card" onSubmit={(event) => { event.preventDefault(); void createFaq(); }}>
              <h3>Ongeraho ikibazo gikunze kubazwa</h3>
              <label className="creator-field"><span>Ikibazo</span><input value={faqForm.question} onChange={(event) => dispatch(updateFaqForm({ question: event.target.value }))} required /></label>
              <label className="creator-field"><span>Igisubizo</span><textarea value={faqForm.answer} onChange={(event) => dispatch(updateFaqForm({ answer: event.target.value }))} required /></label>
              <button className="primary" type="submit">Ongeraho</button>
            </form>
            {faqItems.map((faq) => (
              <div className="faq-edit" key={faq.id ?? faq.question}>
                <input value={faq.question} aria-label="Ikibazo" onChange={(event) => { if (faq.id !== undefined) dispatch(updateFaqLocal({ id: faq.id, question: event.target.value, answer: faq.answer })); }} />
                <textarea value={faq.answer} aria-label="Igisubizo" onChange={(event) => { if (faq.id !== undefined) dispatch(updateFaqLocal({ id: faq.id, question: faq.question, answer: event.target.value })); }} />
                {faq.id && (
                  <div className="admin-row-actions">
                    <button className="small-button approve" onClick={() => void saveFaq(faq)}>Bika</button>
                    <button className="small-button reject" onClick={() => void removeFaq(faq.id)}>Siba</button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
