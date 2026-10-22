import { useEffect, useState } from 'react';

import { api } from '../../services/api';
import {
  addContentLocal,
  addCreatorLocal,
  addFaqLocal,
  answerQuestionSuccess,
  emptyContentForm,
  removeFaqLocal,
  setAdminContent,
  setAdminCreators,
  setEditingContentId,
  setFeedbackMessage,
  setIssues,
  updateAnswerDraft,
  updateContentForm,
  updateContentLocal,
  updateCreatorForm,
  updateFaqForm,
  updateFaqLocal,
  type AdminContentItem,
  type StaffMember
} from '../../store/appSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { Curriculum, QuizQuestion } from '../../types';
import { DiseaseManager } from '../DiseaseManager';
import { Empty, LessonStatusBadge, PageHeader, Panel, StatusBadge } from '../ui';

const roleNames: Record<string, string> = { admin: 'Umuyobozi', creator: 'Umwanditsi', specialist: 'Inzobere' };
const issueStatus: Record<string, string> = { Open: 'Nshya', 'In review': 'Iri gusuzumwa', Resolved: 'Yakemuwe' };

// Illustrations shipped in frontend/public/images that staff can pick from.
const imageChoices = ['bp-heart', 'bp-check', 'plate', 'salt', 'water', 'glucose', 'heart', 'stroke', 'screening', 'walking', 'medicine', 'foot-care', 'no-smoking']
  .map((name) => `/images/${name}.svg`);

const emptyQuestion: QuizQuestion = { question: '', options: ['', ''], answerIndex: 0, explanation: '' };

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('rw-RW', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// ---------------------------------------------------------------------------
// Lesson editor (admins and creators)

function QuizEditor({ quiz, onChange }: { quiz: QuizQuestion[]; onChange: (quiz: QuizQuestion[]) => void }) {
  const [draft, setDraft] = useState<QuizQuestion>(emptyQuestion);
  const canAdd = draft.question.trim() && draft.options.filter((option) => option.trim()).length >= 2;

  const addQuestion = () => {
    const options = draft.options.map((option) => option.trim()).filter(Boolean);
    onChange([...quiz, { ...draft, question: draft.question.trim(), options, answerIndex: Math.min(draft.answerIndex, options.length - 1) }]);
    setDraft(emptyQuestion);
  };

  return (
    <div className="form-group span-2">
      <span className="form-label">Isuzuma ry'isomo ({quiz.length} {quiz.length === 1 ? 'ikibazo' : 'ibibazo'})</span>
      {quiz.length > 0 && (
        <table className="table" style={{ marginBottom: 8 }}>
          <tbody>
            {quiz.map((item, index) => (
              <tr key={index}>
                <td>
                  <strong>{index + 1}. {item.question}</strong>
                  <div className="small muted">{item.options.map((option, optionIndex) => (optionIndex === item.answerIndex ? `${option} (igisubizo)` : option)).join(' · ')}</div>
                </td>
                <td className="right"><button type="button" className="btn btn-danger btn-sm" onClick={() => onChange(quiz.filter((_, position) => position !== index))}>Siba</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {quiz.length < 10 && (
        <div className="quiz-editor stack-sm">
          <input className="input" value={draft.question} onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))} placeholder="Ikibazo gishya" aria-label="Ikibazo gishya" />
          {draft.options.map((option, index) => (
            <label key={index} className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                type="radio"
                name="quiz-correct"
                checked={draft.answerIndex === index}
                onChange={() => setDraft((current) => ({ ...current, answerIndex: index }))}
                aria-label={`Igisubizo ${String.fromCharCode(65 + index)} ni cyo cy'ukuri`}
              />
              <input
                className="input"
                value={option}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((current) => ({ ...current, options: current.options.map((item, position) => (position === index ? value : item)) }));
                }}
                placeholder={`Igisubizo ${String.fromCharCode(65 + index)}`}
              />
            </label>
          ))}
          <input className="input" value={draft.explanation} onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))} placeholder="Ibisobanuro (si ngombwa)" aria-label="Ibisobanuro" />
          <div className="row">
            {draft.options.length < 4 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDraft((current) => ({ ...current, options: [...current.options, ''] }))}>Ongeraho igisubizo</button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={addQuestion} disabled={!canAdd}>Ongeraho ikibazo</button>
          </div>
          <span className="form-hint">Kanda akaziga kari imbere y'igisubizo cy'ukuri.</span>
        </div>
      )}
    </div>
  );
}

function ContentForm({ isCreator, needsSpecialist, onSave }: { isCreator: boolean; needsSpecialist: (categoryId: number) => boolean; onSave: (status: string) => void }) {
  const dispatch = useAppDispatch();
  const contentForm = useAppSelector((state) => state.app.contentForm);
  const editingContentId = useAppSelector((state) => state.app.editingContentId);
  const curricula = useAppSelector((state) => state.app.curricula);
  const categories = useAppSelector((state) => state.app.categories);
  const reviewed = needsSpecialist(Number(contentForm.categoryId));

  const togglePath = (id: number) => dispatch(updateContentForm({
    curriculumIds: contentForm.curriculumIds.includes(id)
      ? contentForm.curriculumIds.filter((item) => item !== id)
      : [...contentForm.curriculumIds, id]
  }));

  return (
    <form className="panel creator-content-form" onSubmit={(event) => { event.preventDefault(); onSave('review'); }}>
      <div className="panel-head">
        <div>
          <h2>{editingContentId ? 'Hindura isomo' : 'Isomo rishya'}</h2>
          <p>{reviewed ? 'Iki cyiciro gifite inzobere: isomo rizabanza kwemezwa nayo mbere yo gusohoka.' : 'Iki cyiciro nta nzobere gifite: umuyobozi asohora isomo nyuma yo kurisoma.'}</p>
        </div>
        {editingContentId && <StatusBadge label="Uri guhindura" tone="info" />}
      </div>
      <div className="panel-body">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="lesson-category">Icyiciro (indwara cyangwa ingingo)</label>
            <select id="lesson-category" className="input" value={contentForm.categoryId} onChange={(event) => dispatch(updateContentForm({ categoryId: Number(event.target.value) }))}>
              {categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="lesson-title">Umutwe w'isomo</label>
            <input id="lesson-title" className="input" value={contentForm.title} onChange={(event) => dispatch(updateContentForm({ title: event.target.value }))} required />
          </div>
          <div className="form-group span-2">
            <label htmlFor="lesson-summary">Incamake</label>
            <input id="lesson-summary" className="input" value={contentForm.summary} onChange={(event) => dispatch(updateContentForm({ summary: event.target.value }))} />
          </div>
          <div className="form-group span-2">
            <label htmlFor="lesson-body">Ibikubiye mu isomo</label>
            <textarea id="lesson-body" className="input" value={contentForm.body} onChange={(event) => dispatch(updateContentForm({ body: event.target.value }))} required />
            <span className="form-hint">Koresha interuro ngufi n'amagambo yoroshye.</span>
          </div>
          <div className="form-group span-2">
            <label htmlFor="lesson-audio">Ijwi (MP3, si ngombwa)</label>
            <input id="lesson-audio" className="input" value={contentForm.audioUrl} onChange={(event) => dispatch(updateContentForm({ audioUrl: event.target.value }))} placeholder="/audio/isomo.mp3" />
            <span className="form-hint">Nta jwi rihari, Baho isoma isomo ikoresheje ijwi rya mudasobwa.</span>
          </div>
          <div className="form-group span-2">
            <span className="form-label">Ishusho y'isomo</span>
            <div className="image-picker" role="radiogroup" aria-label="Ishusho y'isomo">
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
            <div className="form-group span-2">
              <span className="form-label">Inzira z'imyigire zirimo iri somo</span>
              <div className="checkbox-row">
                {curricula.map((curriculum) => (
                  <label key={curriculum.id} className="check path-check">
                    <input type="checkbox" checked={contentForm.curriculumIds.includes(curriculum.id)} onChange={() => togglePath(curriculum.id)} />
                    {curriculum.title}
                  </label>
                ))}
              </div>
            </div>
          )}
          <QuizEditor quiz={contentForm.quiz} onChange={(quiz) => dispatch(updateContentForm({ quiz }))} />
        </div>
      </div>
      <div className="panel-foot form-actions creator-form-actions">
        <button type="button" className="btn btn-secondary" onClick={() => onSave('draft')}>Bika nk'umushinga</button>
        {isCreator
          ? <button type="submit" className="btn btn-primary">Ohereza kugira ngo risuzumwe</button>
          : reviewed
            ? <button type="submit" className="btn btn-primary">Ohereza ku nzobere</button>
            : <>
              <button type="submit" className="btn btn-secondary">Shyira mu isuzuma</button>
              <button type="button" className="btn btn-primary" onClick={() => onSave('published')}>Sohora</button>
            </>}
        {editingContentId && (
          <button type="button" className="btn btn-link" onClick={() => { dispatch(setEditingContentId(null)); dispatch(updateContentForm(emptyContentForm)); }}>
            Hagarika guhindura
          </button>
        )}
      </div>
    </form>
  );
}

// Full lesson as a reviewer sees it, including the quiz answers.
function LessonPreview({ lesson }: { lesson: Pick<AdminContentItem, 'imageUrl' | 'summary' | 'body' | 'quiz'> }) {
  return (
    <div className="preview-box stack-sm">
      {lesson.imageUrl && <img src={lesson.imageUrl} alt="" />}
      {lesson.summary && <p><strong>{lesson.summary}</strong></p>}
      <p style={{ whiteSpace: 'pre-line' }}>{lesson.body}</p>
      {lesson.quiz && lesson.quiz.length > 0 && (
        <div>
          <strong className="small">Isuzuma ({lesson.quiz.length})</strong>
          <ol className="small">
            {lesson.quiz.map((question, index) => (
              <li key={index}>{question.question} <span className="muted">Igisubizo: {question.options[question.answerIndex]}</span></li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Specialist workspace

type ReviewLesson = AdminContentItem & { creatorName?: string; reviewedAt?: string | null };

function SpecialistWorkspace({ tab }: { tab: 'pending' | 'history' }) {
  const dispatch = useAppDispatch();
  const categories = useAppSelector((state) => state.app.categories);
  const [lessons, setLessons] = useState<ReviewLesson[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const categoryName = (id?: number) => categories.find((category) => category.id === id)?.name ?? '';
  const notify = (message: string) => dispatch(setFeedbackMessage(message));

  const load = () => api.getReviewQueue().then((response) => setLessons(response.lessons)).catch(() => notify('Ntibyashobotse kuzana amasomo yo gusuzuma.'));
  useEffect(() => { void load(); }, []);

  const decide = async (id: number, decision: 'approve' | 'changes') => {
    if (decision === 'changes' && !note.trim()) {
      notify('Andika icyo umwanditsi agomba gukosora.');
      return;
    }
    try {
      await api.reviewLesson(id, decision, note.trim());
      notify(decision === 'approve' ? 'Isomo ryemejwe. Umuyobozi ashobora kurisohora.' : 'Isomo ryasubijwe umwanditsi n\'inama zawe.');
      setOpenId(null);
      setNote('');
      await load();
    } catch {
      notify('Ntibyashobotse kubika isuzuma.');
    }
  };

  const visible = lessons.filter((lesson) => (tab === 'pending' ? lesson.status === 'review' : lesson.status !== 'review'));

  return (
    <Panel
      title={tab === 'pending' ? 'Amasomo ategereje isuzuma ryawe' : 'Amasomo wasuzumye'}
      description={tab === 'pending' ? 'Soma isomo n\'isuzuma ryaryo, hanyuma wemeze cyangwa usabe ko rikosorwa.' : undefined}
      flush
    >
      {visible.length === 0 ? <Empty>{tab === 'pending' ? 'Nta somo ritegereje isuzuma ryawe.' : 'Ntabwo urasuzuma isomo.'}</Empty> : (
        <table className="table">
          <thead><tr><th>Isomo</th><th>Umwanditsi</th><th>Imiterere</th><th className="right">Igikorwa</th></tr></thead>
          <tbody>
            {visible.map((lesson) => (
              <tr key={lesson.id}>
                <td>
                  <strong>{lesson.title}</strong>
                  <div className="small muted">{categoryName(lesson.categoryId)}</div>
                  {openId === lesson.id && (
                    <div className="stack-sm" style={{ marginTop: 12 }}>
                      <LessonPreview lesson={lesson} />
                      {tab === 'pending' && (
                        <>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor={`note-${lesson.id}`}>Inama ku mwanditsi</label>
                            <textarea id={`note-${lesson.id}`} className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ngombwa niba usaba ko rikosorwa" />
                          </div>
                          <div className="row">
                            <button className="btn btn-primary btn-sm" onClick={() => void decide(lesson.id, 'approve')}>Emeza isomo</button>
                            <button className="btn btn-danger btn-sm" onClick={() => void decide(lesson.id, 'changes')}>Saba ko rikosorwa</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </td>
                <td>{lesson.creatorName || 'Umuyobozi'}</td>
                <td>
                  <LessonStatusBadge status={lesson.status} />
                  {lesson.reviewNote && tab === 'history' && <div className="small muted" style={{ marginTop: 4 }}>{lesson.reviewNote}</div>}
                  {lesson.reviewedAt && <div className="small muted">{formatDate(lesson.reviewedAt)}</div>}
                </td>
                <td className="right">
                  <button className="btn btn-secondary btn-sm" onClick={() => { setOpenId(openId === lesson.id ? null : lesson.id); setNote(''); }}>
                    {openId === lesson.id ? 'Funga' : tab === 'pending' ? 'Suzuma' : 'Soma'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Staff accounts (admin)

function StaffPanel() {
  const dispatch = useAppDispatch();
  const staff = useAppSelector((state) => state.app.adminCreators);
  const creatorForm = useAppSelector((state) => state.app.creatorForm);
  const categories = useAppSelector((state) => state.app.categories);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTopics, setEditTopics] = useState<number[]>([]);
  const notify = (message: string) => dispatch(setFeedbackMessage(message));
  const topicNames = (ids: number[]) => ids.map((id) => categories.find((category) => category.id === id)?.name).filter(Boolean).join(', ');
  const toggle = (ids: number[], id: number) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);

  const createStaff = async () => {
    if (!creatorForm.fullName.trim() || !creatorForm.email.trim() || creatorForm.password.length < 8) {
      notify('Uzuza amazina, imeyili n\'ijambo ry\'ibanga rigizwe n\'inyuguti nibura 8.');
      return;
    }
    if (creatorForm.role === 'specialist' && creatorForm.topicIds.length === 0) {
      notify('Hitamo nibura indwara imwe inzobere izasuzuma.');
      return;
    }
    try {
      const response = await api.createCreator({
        fullName: creatorForm.fullName.trim(),
        email: creatorForm.email.trim(),
        password: creatorForm.password,
        role: creatorForm.role,
        topicIds: creatorForm.role === 'specialist' ? creatorForm.topicIds : []
      });
      dispatch(addCreatorLocal(response.user));
      notify(`Konti ya ${roleNames[creatorForm.role].toLowerCase()} yafunguwe.`);
    } catch {
      notify('Ntibyashobotse gufungura konti. Imeyili ishobora kuba isanzwe ikoreshwa.');
    }
  };

  const saveTopics = async (member: StaffMember) => {
    if (editTopics.length === 0) {
      notify('Inzobere igomba kugira nibura indwara imwe.');
      return;
    }
    try {
      const response = await api.updateSpecialistTopics(member.id, editTopics);
      dispatch(setAdminCreators(staff.map((item) => (item.id === member.id ? { ...item, topicIds: response.categoryIds } : item))));
      setEditingId(null);
      notify('Indwara z\'inzobere zahinduwe.');
    } catch {
      notify('Ntibyashobotse kubika.');
    }
  };

  return (
    <div className="layout-main-aside">
      <Panel title="Abakozi ba Baho" description="Abanditsi bategura amasomo, inzobere zikemeza amasomo y'indwara zabo, abayobozi bagasohora." flush>
        {staff.length === 0 ? <Empty>Nta bakozi barashyirwaho.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Izina</th><th>Uruhare</th><th>Indwara asuzuma</th><th className="right">Igikorwa</th></tr></thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td><strong>{member.fullName}</strong><div className="small muted">{member.email}</div></td>
                    <td><StatusBadge label={roleNames[member.role] ?? member.role} tone={member.role === 'admin' ? 'success' : member.role === 'specialist' ? 'info' : 'neutral'} /></td>
                    <td>
                      {member.role !== 'specialist' ? <span className="muted">–</span> : editingId === member.id ? (
                        <div className="stack-sm">
                          <div className="checkbox-row">
                            {categories.map((category) => (
                              <label key={category.id} className="check">
                                <input type="checkbox" checked={editTopics.includes(category.id)} onChange={() => setEditTopics(toggle(editTopics, category.id))} />
                                {category.name}
                              </label>
                            ))}
                          </div>
                          <div className="row">
                            <button className="btn btn-primary btn-sm" onClick={() => void saveTopics(member)}>Bika</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Reka</button>
                          </div>
                        </div>
                      ) : topicNames(member.topicIds ?? [])}
                    </td>
                    <td className="right">
                      {member.role === 'specialist' && editingId !== member.id && (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(member.id); setEditTopics(member.topicIds ?? []); }}>Hindura indwara</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <form className="panel" onSubmit={(event) => { event.preventDefault(); void createStaff(); }}>
        <div className="panel-head"><h2>Ongeraho umukozi</h2></div>
        <div className="panel-body">
          <div className="form-group">
            <label htmlFor="staff-name">Amazina yose</label>
            <input id="staff-name" className="input" value={creatorForm.fullName} onChange={(event) => dispatch(updateCreatorForm({ fullName: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="staff-email">Imeyili</label>
            <input id="staff-email" className="input" type="email" value={creatorForm.email} onChange={(event) => dispatch(updateCreatorForm({ email: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="staff-password">Ijambo ry'ibanga ry'agateganyo</label>
            <input id="staff-password" className="input" type="password" minLength={8} value={creatorForm.password} onChange={(event) => dispatch(updateCreatorForm({ password: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="staff-role">Uruhare</label>
            <select id="staff-role" className="input" value={creatorForm.role} onChange={(event) => dispatch(updateCreatorForm({ role: event.target.value }))}>
              <option value="creator">Umwanditsi: ategura amasomo</option>
              <option value="specialist">Inzobere: yemeza amasomo y'indwara ze</option>
              <option value="admin">Umuyobozi: acunga byose</option>
            </select>
          </div>
          {creatorForm.role === 'specialist' && (
            <fieldset className="form-group" style={{ border: 0, padding: 0 }}>
              <legend className="form-label">Indwara inzobere izasuzuma</legend>
              <div className="stack-sm">
                {categories.map((category) => (
                  <label key={category.id} className="check">
                    <input type="checkbox" checked={creatorForm.topicIds.includes(category.id)} onChange={() => dispatch(updateCreatorForm({ topicIds: toggle(creatorForm.topicIds, category.id) }))} />
                    {category.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <button className="btn btn-primary" type="submit">Fungura konti</button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------

type Tab = 'review' | 'content' | 'diseases' | 'questions' | 'staff' | 'issues' | 'faq' | 'pending' | 'history';

export function AdminScreen({ onHome }: { onHome: () => void }) {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.app.authUser);
  const adminContent = useAppSelector((state) => state.app.adminContent);
  const staff = useAppSelector((state) => state.app.adminCreators);
  const contentForm = useAppSelector((state) => state.app.contentForm);
  const editingContentId = useAppSelector((state) => state.app.editingContentId);
  const faqItems = useAppSelector((state) => state.app.faqItems);
  const faqForm = useAppSelector((state) => state.app.faqForm);
  const questions = useAppSelector((state) => state.app.questions);
  const answerDrafts = useAppSelector((state) => state.app.answerDrafts);
  const issues = useAppSelector((state) => state.app.issues);
  const categories = useAppSelector((state) => state.app.categories);
  const role = authUser?.role ?? 'creator';
  const isAdmin = role === 'admin';
  const isCreator = role === 'creator';
  const isSpecialist = role === 'specialist';
  const [tab, setTab] = useState<Tab>(isAdmin ? 'review' : isSpecialist ? 'pending' : 'content');
  const [previewId, setPreviewId] = useState<number | null>(null);
  const categoryName = (id?: number) => categories.find((category) => category.id === id)?.name ?? '';
  const notify = (message: string) => dispatch(setFeedbackMessage(message));

  // Topics that have a specialist need their approval before publishing.
  const specialistTopics = new Set(staff.filter((member) => member.role === 'specialist').flatMap((member) => member.topicIds ?? []));
  const needsSpecialist = (categoryId: number) => isCreator || specialistTopics.has(categoryId);
  const canPublish = (item: AdminContentItem) => item.status === 'approved' || (item.status === 'review' && !specialistTopics.has(item.categoryId ?? 0));

  const reviewQueue = adminContent.filter((item) => item.status === 'review' || item.status === 'approved');
  const readyToPublish = adminContent.filter(canPublish).length;
  const pendingQuestions = questions.filter((item) => item.status !== 'Answered');
  const openIssues = issues.filter((item) => item.status !== 'Resolved');

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
      const messages: Record<string, string> = {
        draft: 'Umushinga wabitswe.',
        review: specialistTopics.has(payload.categoryId) || isCreator ? 'Isomo ryoherejwe ku isuzuma.' : 'Isomo ryashyizwe mu isuzuma.',
        published: 'Isomo ryasohotse.'
      };
      notify(messages[saved.status] ?? 'Isomo ryabitswe.');
    } catch {
      notify('Ntibyashobotse kubika isomo. Reba amakuru wongere ugerageze.');
    }
  };

  const editContent = (item: AdminContentItem) => {
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

  const writeLessonFor = (disease: Curriculum) => {
    dispatch(setEditingContentId(null));
    dispatch(updateContentForm({ ...emptyContentForm, categoryId: disease.categoryId ?? 1, curriculumIds: [disease.id] }));
    setTab('content');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeContentStatus = async (id: number, status: string) => {
    try {
      const response = await api.updateContentStatus(id, status);
      dispatch(setAdminContent(adminContent.map((item) => (item.id === id ? { ...item, status: response.content.status } : item))));
      notify(status === 'published' ? 'Isomo ryasohotse. Abiga bararibona.' : 'Isomo ryasubijwe umwanditsi.');
    } catch (error) {
      notify(error instanceof Error && error.message.includes('specialist') ? 'Iri somo rigomba kubanza kwemezwa n\'inzobere.' : 'Ntibyashobotse guhindura uko isomo rihagaze.');
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
      dispatch(setIssues(issues.map((issue) => (issue.id === id ? response.issue : issue))));
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

  const tabs: { id: Tab; label: string; count?: number; roles: string[] }[] = [
    { id: 'review', label: 'Isuzuma no gusohora', count: readyToPublish, roles: ['admin'] },
    { id: 'pending', label: 'Ibitegereje isuzuma', roles: ['specialist'] },
    { id: 'history', label: 'Nasuzumye', roles: ['specialist'] },
    { id: 'content', label: isCreator ? 'Amasomo yanjye' : 'Amasomo', roles: ['admin', 'creator'] },
    { id: 'diseases', label: 'Indwara', roles: ['admin'] },
    { id: 'questions', label: 'Ibibazo by\'abiga', count: pendingQuestions.length, roles: ['admin', 'creator', 'specialist'] },
    { id: 'staff', label: 'Abakozi', roles: ['admin'] },
    { id: 'issues', label: 'Raporo', count: openIssues.length, roles: ['admin'] },
    { id: 'faq', label: 'Ibibazo bikunze kubazwa', roles: ['admin'] }
  ];

  const statusCell = (item: AdminContentItem) => (
    <>
      <LessonStatusBadge status={item.status === 'review' && specialistTopics.has(item.categoryId ?? 0) ? 'review' : item.status} />
      {item.status === 'review' && specialistTopics.has(item.categoryId ?? 0) && <div className="small muted">Itegereje inzobere</div>}
      {item.reviewerName && ['approved', 'published', 'rejected'].includes(item.status) && (
        <div className="small muted">{item.status === 'rejected' ? 'Yasubijwe na' : 'Yemejwe na'} {item.reviewerName}</div>
      )}
    </>
  );

  const contentTable = (items: AdminContentItem[], mode: 'review' | 'all') => (
    items.length === 0 ? <Empty>{mode === 'review' ? 'Nta somo ritegereje isuzuma cyangwa gusohorwa.' : 'Nta masomo arahari.'}</Empty> : (
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Isomo</th><th>Umwanditsi</th><th>Imiterere</th><th className="right">Igikorwa</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.title}</strong>
                  <div className="small muted">{categoryName(item.categoryId)} · Ibibazo {item.quiz?.length ?? 0}</div>
                  {item.status === 'rejected' && item.reviewNote && (
                    <p className="alert alert-danger small" style={{ marginTop: 8 }}><strong>Inama y'inzobere:</strong> {item.reviewNote}</p>
                  )}
                  {previewId === item.id && <div style={{ marginTop: 10 }}><LessonPreview lesson={item} /></div>}
                </td>
                <td>{item.creatorName || '–'}</td>
                <td>{statusCell(item)}</td>
                <td className="right">
                  <div className="actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setPreviewId(previewId === item.id ? null : item.id)}>{previewId === item.id ? 'Funga' : 'Soma'}</button>
                    {(isAdmin || ['draft', 'review', 'rejected'].includes(item.status)) && <button className="btn btn-secondary btn-sm" onClick={() => editContent(item)}>Hindura</button>}
                    {isAdmin && item.status !== 'published' && (
                      <button className="btn btn-primary btn-sm" disabled={!canPublish(item)} title={canPublish(item) ? '' : 'Ritegereje kwemezwa n\'inzobere'} onClick={() => void changeContentStatus(item.id, 'published')}>Sohora</button>
                    )}
                    {isAdmin && mode === 'review' && <button className="btn btn-danger btn-sm" onClick={() => void changeContentStatus(item.id, 'rejected')}>Subiza</button>}
                    {isAdmin && mode === 'all' && item.status === 'published' && <button className="btn btn-secondary btn-sm" onClick={() => void changeContentStatus(item.id, 'rejected')}>Kura ku rubuga</button>}
                    {isAdmin && mode === 'all' && <button className="btn btn-danger btn-sm" onClick={() => void removeContent(item.id)}>Siba</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  const title = isSpecialist ? 'Isuzuma ry\'inzobere' : isCreator ? 'Umwanya w\'umwanditsi' : 'Ubuyobozi';
  const lead = isSpecialist
    ? 'Emeza amasomo y\'indwara ushinzwe mbere y\'uko asohoka, cyangwa usabe ko akosorwa.'
    : isCreator
      ? 'Tegura amasomo. Azasuzumwa n\'inzobere n\'umuyobozi mbere yo kugera ku biga.'
      : 'Genzura amasomo, abakozi, indwara, ibibazo by\'abiga na raporo.';

  return (
    <div className="container admin-screen">
      <PageHeader crumbs={[{ label: 'Ahabanza', onClick: onHome }, { label: title }]} title={title} lead={<>{lead} <span className="muted">Winjiye nka {authUser?.name} ({roleNames[role]}).</span></>} />

      {isAdmin && (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="stat"><div className="stat-label">Ategereje inzobere</div><div className="stat-value">{adminContent.filter((item) => item.status === 'review').length}</div></div>
          <div className="stat"><div className="stat-label">Yiteguye gusohorwa</div><div className="stat-value">{readyToPublish}</div></div>
          <div className="stat"><div className="stat-label">Amasomo yasohotse</div><div className="stat-value">{adminContent.filter((item) => item.status === 'published').length}</div></div>
          <div className="stat"><div className="stat-label">Ibibazo bitarasubizwa</div><div className="stat-value">{pendingQuestions.length}</div></div>
        </div>
      )}

      <div className="tabs" role="tablist">
        {tabs.filter((item) => item.roles.includes(role)).map((item) => (
          <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
            {item.label}{item.count ? <span className="count">{item.count}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'review' && (
        <Panel title="Isuzuma no gusohora" description="Amasomo y'indwara zifite inzobere asohorwa nyuma y'uko inzobere iyemeje." flush>
          {contentTable(reviewQueue, 'review')}
        </Panel>
      )}

      {(tab === 'pending' || tab === 'history') && <SpecialistWorkspace tab={tab} />}

      {tab === 'content' && (
        <div className="stack">
          <ContentForm isCreator={isCreator} needsSpecialist={needsSpecialist} onSave={(status) => void saveContent(status)} />
          <Panel title={isCreator ? `Amasomo yanjye (${adminContent.length})` : `Amasomo yose (${adminContent.length})`} flush>
            {contentTable(adminContent, 'all')}
          </Panel>
        </div>
      )}

      {tab === 'diseases' && <DiseaseManager onWriteLesson={writeLessonFor} />}

      {tab === 'questions' && (
        <Panel title="Ibibazo by'abiga" description="Subiza mu magambo yoroshye. Igisubizo kigaragara ku wabajije." flush>
          {questions.length === 0 ? <Empty>Nta bibazo birahari.</Empty> : (
            <table className="table">
              <thead><tr><th>Ikibazo</th><th>Imiterere</th></tr></thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id}>
                    <td>
                      <strong>{question.question}</strong>
                      <div className="small muted">{question.topic}</div>
                      {question.answer && <p className="small" style={{ marginTop: 6 }}>Igisubizo: {question.answer}</p>}
                      {question.status !== 'Answered' && (
                        <div className="stack-sm" style={{ marginTop: 8 }}>
                          <textarea
                            className="input"
                            aria-label={`Igisubizo ku kibazo: ${question.question}`}
                            value={answerDrafts[question.id] || ''}
                            onChange={(event) => dispatch(updateAnswerDraft({ id: question.id, answer: event.target.value }))}
                          />
                          <div><button className="btn btn-primary btn-sm" onClick={() => void answerQuestion(question.id)}>Ohereza igisubizo</button></div>
                        </div>
                      )}
                    </td>
                    <td><StatusBadge label={question.status === 'Answered' ? 'Yasubijwe' : 'Itegereje'} tone={question.status === 'Answered' ? 'success' : 'warning'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {tab === 'staff' && <StaffPanel />}

      {tab === 'issues' && (
        <Panel title="Raporo z'abakoresha" flush>
          {issues.length === 0 ? <Empty>Nta raporo zirahari.</Empty> : (
            <table className="table">
              <thead><tr><th>Raporo</th><th className="right">Imiterere</th></tr></thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id}>
                    <td><strong>{issue.title}</strong><div className="small muted">{issue.description}</div></td>
                    <td className="right">
                      <select className="input" style={{ width: 170 }} value={issue.status} onChange={(event) => void changeIssueStatus(issue.id, event.target.value)} aria-label="Imiterere ya raporo">
                        {Object.entries(issueStatus).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {tab === 'faq' && (
        <div className="layout-main-aside">
          <Panel title="Ibibazo bikunze kubazwa" flush>
            <table className="table">
              <tbody>
                {faqItems.map((faq) => (
                  <tr key={faq.id ?? faq.question}>
                    <td className="stack-sm">
                      <input className="input" value={faq.question} aria-label="Ikibazo" onChange={(event) => { if (faq.id !== undefined) dispatch(updateFaqLocal({ id: faq.id, question: event.target.value, answer: faq.answer })); }} />
                      <textarea className="input" value={faq.answer} aria-label="Igisubizo" onChange={(event) => { if (faq.id !== undefined) dispatch(updateFaqLocal({ id: faq.id, question: faq.question, answer: event.target.value })); }} />
                      {faq.id && (
                        <div className="row">
                          <button className="btn btn-primary btn-sm" onClick={() => void saveFaq(faq)}>Bika</button>
                          <button className="btn btn-danger btn-sm" onClick={() => void removeFaq(faq.id)}>Siba</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <form className="panel" onSubmit={(event) => { event.preventDefault(); void createFaq(); }}>
            <div className="panel-head"><h2>Ongeraho ikibazo</h2></div>
            <div className="panel-body">
              <div className="form-group">
                <label htmlFor="faq-question">Ikibazo</label>
                <input id="faq-question" className="input" value={faqForm.question} onChange={(event) => dispatch(updateFaqForm({ question: event.target.value }))} required />
              </div>
              <div className="form-group">
                <label htmlFor="faq-answer">Igisubizo</label>
                <textarea id="faq-answer" className="input" value={faqForm.answer} onChange={(event) => dispatch(updateFaqForm({ answer: event.target.value }))} required />
              </div>
              <button className="btn btn-primary" type="submit">Ongeraho</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
