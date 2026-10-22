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

const roleNames: Record<string, string> = { admin: 'Admin', creator: 'Writer', specialist: 'Specialist' };
const issueStatus: Record<string, string> = { Open: 'New', 'In review': 'In review', Resolved: 'Resolved' };

// Illustrations shipped in frontend/public/images that staff can pick from.
const imageChoices = ['bp-heart', 'bp-check', 'plate', 'salt', 'water', 'glucose', 'heart', 'stroke', 'screening', 'walking', 'medicine', 'foot-care', 'no-smoking']
  .map((name) => `/images/${name}.svg`);

const emptyQuestion: QuizQuestion = { question: '', options: ['', ''], answerIndex: 0, explanation: '' };

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

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
      <span className="form-label">Lesson quiz ({quiz.length} {quiz.length === 1 ? 'question' : 'questions'})</span>
      {quiz.length > 0 && (
        <table className="table" style={{ marginBottom: 8 }}>
          <tbody>
            {quiz.map((item, index) => (
              <tr key={index}>
                <td>
                  <strong>{index + 1}. {item.question}</strong>
                  <div className="small muted">{item.options.map((option, optionIndex) => (optionIndex === item.answerIndex ? `${option} (answer)` : option)).join(' · ')}</div>
                </td>
                <td className="right"><button type="button" className="btn btn-danger btn-sm" onClick={() => onChange(quiz.filter((_, position) => position !== index))}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {quiz.length < 10 && (
        <div className="quiz-editor stack-sm">
          <input className="input" value={draft.question} onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))} placeholder="New question" aria-label="New question" />
          {draft.options.map((option, index) => (
            <label key={index} className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                type="radio"
                name="quiz-correct"
                checked={draft.answerIndex === index}
                onChange={() => setDraft((current) => ({ ...current, answerIndex: index }))}
                aria-label={`Answer ${String.fromCharCode(65 + index)} is correct`}
              />
              <input
                className="input"
                value={option}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((current) => ({ ...current, options: current.options.map((item, position) => (position === index ? value : item)) }));
                }}
                placeholder={`Answer ${String.fromCharCode(65 + index)}`}
              />
            </label>
          ))}
          <input className="input" value={draft.explanation} onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))} placeholder="Explanation (optional)" aria-label="Explanation" />
          <div className="row">
            {draft.options.length < 4 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDraft((current) => ({ ...current, options: [...current.options, ''] }))}>Add answer</button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={addQuestion} disabled={!canAdd}>Add question</button>
          </div>
          <span className="form-hint">Select the circle next to the correct answer.</span>
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
          <h2>{editingContentId ? 'Edit lesson' : 'New lesson'}</h2>
          <p>{reviewed ? 'This topic has a specialist: the lesson must be approved by them before it is published.' : 'This topic has no specialist: an admin publishes the lesson after reading it.'}</p>
        </div>
        {editingContentId && <StatusBadge label="Editing" tone="info" />}
      </div>
      <div className="panel-body">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="lesson-category">Topic (disease or subject)</label>
            <select id="lesson-category" className="input" value={contentForm.categoryId} onChange={(event) => dispatch(updateContentForm({ categoryId: Number(event.target.value) }))}>
              {categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="lesson-title">Lesson title</label>
            <input id="lesson-title" className="input" value={contentForm.title} onChange={(event) => dispatch(updateContentForm({ title: event.target.value }))} required />
          </div>
          <div className="form-group span-2">
            <label htmlFor="lesson-summary">Summary</label>
            <input id="lesson-summary" className="input" value={contentForm.summary} onChange={(event) => dispatch(updateContentForm({ summary: event.target.value }))} />
          </div>
          <div className="form-group span-2">
            <label htmlFor="lesson-body">Lesson text</label>
            <textarea id="lesson-body" className="input" value={contentForm.body} onChange={(event) => dispatch(updateContentForm({ body: event.target.value }))} required />
            <span className="form-hint">Write the lesson in Kinyarwanda, with short sentences and simple words.</span>
          </div>
          <div className="form-group span-2">
            <label htmlFor="lesson-audio">Audio (MP3, optional)</label>
            <input id="lesson-audio" className="input" value={contentForm.audioUrl} onChange={(event) => dispatch(updateContentForm({ audioUrl: event.target.value }))} placeholder="/audio/lesson.mp3" />
            <span className="form-hint">Without a recording, Baho reads the lesson aloud with the device's voice.</span>
          </div>
          <div className="form-group span-2">
            <span className="form-label">Lesson image</span>
            <div className="image-picker" role="radiogroup" aria-label="Lesson image">
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
              <span className="form-label">Learning paths that include this lesson</span>
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
        <button type="button" className="btn btn-secondary" onClick={() => onSave('draft')}>Save as draft</button>
        {isCreator
          ? <button type="submit" className="btn btn-primary">Submit for review</button>
          : reviewed
            ? <button type="submit" className="btn btn-primary">Send to specialist</button>
            : <>
              <button type="submit" className="btn btn-secondary">Move to review</button>
              <button type="button" className="btn btn-primary" onClick={() => onSave('published')}>Publish</button>
            </>}
        {editingContentId && (
          <button type="button" className="btn btn-link" onClick={() => { dispatch(setEditingContentId(null)); dispatch(updateContentForm(emptyContentForm)); }}>
            Cancel editing
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
          <strong className="small">Quiz ({lesson.quiz.length})</strong>
          <ol className="small">
            {lesson.quiz.map((question, index) => (
              <li key={index}>{question.question} <span className="muted">Answer: {question.options[question.answerIndex]}</span></li>
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

  const load = () => api.getReviewQueue().then((response) => setLessons(response.lessons)).catch(() => notify('Could not load the lessons to review.'));
  useEffect(() => { void load(); }, []);

  const decide = async (id: number, decision: 'approve' | 'changes') => {
    if (decision === 'changes' && !note.trim()) {
      notify('Write what the writer needs to change.');
      return;
    }
    try {
      await api.reviewLesson(id, decision, note.trim());
      notify(decision === 'approve' ? 'Lesson approved. An admin can now publish it.' : 'Lesson sent back to the writer with your note.');
      setOpenId(null);
      setNote('');
      await load();
    } catch {
      notify('Could not save your review.');
    }
  };

  const visible = lessons.filter((lesson) => (tab === 'pending' ? lesson.status === 'review' : lesson.status !== 'review'));

  return (
    <Panel
      title={tab === 'pending' ? 'Lessons waiting for your review' : 'Lessons you reviewed'}
      description={tab === 'pending' ? 'Read the lesson and its quiz, then approve it or request changes.' : undefined}
      flush
    >
      {visible.length === 0 ? <Empty>{tab === 'pending' ? 'No lessons are waiting for your review.' : 'You have not reviewed any lessons yet.'}</Empty> : (
        <table className="table">
          <thead><tr><th>Lesson</th><th>Writer</th><th>Status</th><th className="right">Actions</th></tr></thead>
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
                            <label htmlFor={`note-${lesson.id}`}>Note to the writer</label>
                            <textarea id={`note-${lesson.id}`} className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Required when requesting changes" />
                          </div>
                          <div className="row">
                            <button className="btn btn-primary btn-sm" onClick={() => void decide(lesson.id, 'approve')}>Approve lesson</button>
                            <button className="btn btn-danger btn-sm" onClick={() => void decide(lesson.id, 'changes')}>Request changes</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </td>
                <td>{lesson.creatorName || 'Admin'}</td>
                <td>
                  <LessonStatusBadge status={lesson.status} />
                  {lesson.reviewNote && tab === 'history' && <div className="small muted" style={{ marginTop: 4 }}>{lesson.reviewNote}</div>}
                  {lesson.reviewedAt && <div className="small muted">{formatDate(lesson.reviewedAt)}</div>}
                </td>
                <td className="right">
                  <button className="btn btn-secondary btn-sm" onClick={() => { setOpenId(openId === lesson.id ? null : lesson.id); setNote(''); }}>
                    {openId === lesson.id ? 'Close' : tab === 'pending' ? 'Review' : 'Read'}
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
      notify('Enter a full name, an email and a password of at least 8 characters.');
      return;
    }
    if (creatorForm.role === 'specialist' && creatorForm.topicIds.length === 0) {
      notify('Choose at least one disease for the specialist to review.');
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
      notify(`Account created for the new ${roleNames[creatorForm.role].toLowerCase()}.`);
    } catch {
      notify('Could not create the account. The email may already be in use.');
    }
  };

  const saveTopics = async (member: StaffMember) => {
    if (editTopics.length === 0) {
      notify('A specialist needs at least one disease.');
      return;
    }
    try {
      const response = await api.updateSpecialistTopics(member.id, editTopics);
      dispatch(setAdminCreators(staff.map((item) => (item.id === member.id ? { ...item, topicIds: response.categoryIds } : item))));
      setEditingId(null);
      notify('Specialist diseases updated.');
    } catch {
      notify('Could not save.');
    }
  };

  return (
    <div className="layout-main-aside">
      <Panel title="Baho staff" description="Writers draft lessons, specialists approve lessons on their diseases, admins publish." flush>
        {staff.length === 0 ? <Empty>No staff accounts yet.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Role</th><th>Reviews</th><th className="right">Actions</th></tr></thead>
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
                            <button className="btn btn-primary btn-sm" onClick={() => void saveTopics(member)}>Save</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : topicNames(member.topicIds ?? [])}
                    </td>
                    <td className="right">
                      {member.role === 'specialist' && editingId !== member.id && (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(member.id); setEditTopics(member.topicIds ?? []); }}>Change diseases</button>
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
        <div className="panel-head"><h2>Add staff member</h2></div>
        <div className="panel-body">
          <div className="form-group">
            <label htmlFor="staff-name">Full name</label>
            <input id="staff-name" className="input" value={creatorForm.fullName} onChange={(event) => dispatch(updateCreatorForm({ fullName: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="staff-email">Email</label>
            <input id="staff-email" className="input" type="email" value={creatorForm.email} onChange={(event) => dispatch(updateCreatorForm({ email: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="staff-password">Temporary password</label>
            <input id="staff-password" className="input" type="password" minLength={8} value={creatorForm.password} onChange={(event) => dispatch(updateCreatorForm({ password: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="staff-role">Role</label>
            <select id="staff-role" className="input" value={creatorForm.role} onChange={(event) => dispatch(updateCreatorForm({ role: event.target.value }))}>
              <option value="creator">Writer: drafts lessons</option>
              <option value="specialist">Specialist: approves lessons on their diseases</option>
              <option value="admin">Admin: manages everything</option>
            </select>
          </div>
          {creatorForm.role === 'specialist' && (
            <fieldset className="form-group" style={{ border: 0, padding: 0 }}>
              <legend className="form-label">Diseases this specialist reviews</legend>
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
          <button className="btn btn-primary" type="submit">Create account</button>
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
      notify('Enter the lesson title and text.');
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
        draft: 'Draft saved.',
        review: specialistTopics.has(payload.categoryId) || isCreator ? 'Lesson submitted for review.' : 'Lesson moved to review.',
        published: 'Lesson published.'
      };
      notify(messages[saved.status] ?? 'Lesson saved.');
    } catch {
      notify('Could not save the lesson. Check the fields and try again.');
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
      notify(status === 'published' ? 'Lesson published. Learners can now see it.' : 'Lesson sent back to the writer.');
    } catch (error) {
      notify(error instanceof Error && error.message.includes('specialist') ? 'This lesson must be approved by a specialist first.' : 'Could not change the lesson status.');
    }
  };

  const removeContent = async (id: number) => {
    if (!window.confirm('Delete this lesson permanently?')) return;
    try {
      await api.deleteContent(id);
      dispatch(setAdminContent(adminContent.filter((item) => item.id !== id)));
      notify('Lesson deleted.');
    } catch {
      notify('Could not delete the lesson.');
    }
  };

  const answerQuestion = async (id: number) => {
    const answer = (answerDrafts[id] || '').trim();
    if (!answer) {
      notify('Write an answer before sending it.');
      return;
    }
    try {
      const data = await api.answerQuestion(id, answer);
      dispatch(answerQuestionSuccess({ id, answer: data.question.answer }));
      notify('Answer sent.');
    } catch {
      notify('Could not send the answer.');
    }
  };

  const changeIssueStatus = async (id: number, status: string) => {
    try {
      const response = await api.updateIssueStatus(id, status);
      dispatch(setIssues(issues.map((issue) => (issue.id === id ? response.issue : issue))));
    } catch {
      notify('Could not update the report status.');
    }
  };

  const createFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      notify('Enter a question and an answer.');
      return;
    }
    try {
      const response = await api.createFaq({ question: faqForm.question.trim(), answer: faqForm.answer.trim() });
      dispatch(addFaqLocal(response.faq));
      notify('Question and answer added.');
    } catch {
      notify('Could not add the question.');
    }
  };

  const saveFaq = async (faq: { id?: number; question: string; answer: string }) => {
    if (!faq.id) return;
    try {
      const response = await api.updateFaq(faq.id, { question: faq.question, answer: faq.answer });
      dispatch(updateFaqLocal(response.faq));
      notify('Saved.');
    } catch {
      notify('Could not save the change.');
    }
  };

  const removeFaq = async (id?: number) => {
    if (!id || !window.confirm('Delete this question?')) return;
    try {
      await api.deleteFaq(id);
      dispatch(removeFaqLocal(id));
    } catch {
      notify('Could not delete.');
    }
  };

  const tabs: { id: Tab; label: string; count?: number; roles: string[] }[] = [
    { id: 'review', label: 'Review and publish', count: readyToPublish, roles: ['admin'] },
    { id: 'pending', label: 'Waiting for review', roles: ['specialist'] },
    { id: 'history', label: 'Reviewed', roles: ['specialist'] },
    { id: 'content', label: isCreator ? 'My lessons' : 'Lessons', roles: ['admin', 'creator'] },
    { id: 'diseases', label: 'Diseases', roles: ['admin'] },
    { id: 'questions', label: 'Learner questions', count: pendingQuestions.length, roles: ['admin', 'creator', 'specialist'] },
    { id: 'staff', label: 'Staff', roles: ['admin'] },
    { id: 'issues', label: 'Reports', count: openIssues.length, roles: ['admin'] },
    { id: 'faq', label: 'FAQ', roles: ['admin'] }
  ];

  const statusCell = (item: AdminContentItem) => (
    <>
      <LessonStatusBadge status={item.status === 'review' && specialistTopics.has(item.categoryId ?? 0) ? 'review' : item.status} />
      {item.status === 'review' && specialistTopics.has(item.categoryId ?? 0) && <div className="small muted">Waiting for specialist</div>}
      {item.reviewerName && ['approved', 'published', 'rejected'].includes(item.status) && (
        <div className="small muted">{item.status === 'rejected' ? 'Sent back by' : 'Approved by'} {item.reviewerName}</div>
      )}
    </>
  );

  const contentTable = (items: AdminContentItem[], mode: 'review' | 'all') => (
    items.length === 0 ? <Empty>{mode === 'review' ? 'No lessons are waiting for review or publishing.' : 'No lessons yet.'}</Empty> : (
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Lesson</th><th>Writer</th><th>Status</th><th className="right">Actions</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.title}</strong>
                  <div className="small muted">{categoryName(item.categoryId)} · Questions {item.quiz?.length ?? 0}</div>
                  {item.status === 'rejected' && item.reviewNote && (
                    <p className="alert alert-danger small" style={{ marginTop: 8 }}><strong>Specialist's note:</strong> {item.reviewNote}</p>
                  )}
                  {previewId === item.id && <div style={{ marginTop: 10 }}><LessonPreview lesson={item} /></div>}
                </td>
                <td>{item.creatorName || '–'}</td>
                <td>{statusCell(item)}</td>
                <td className="right">
                  <div className="actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setPreviewId(previewId === item.id ? null : item.id)}>{previewId === item.id ? 'Close' : 'Read'}</button>
                    {(isAdmin || ['draft', 'review', 'rejected'].includes(item.status)) && <button className="btn btn-secondary btn-sm" onClick={() => editContent(item)}>Edit</button>}
                    {isAdmin && item.status !== 'published' && (
                      <button className="btn btn-primary btn-sm" disabled={!canPublish(item)} title={canPublish(item) ? '' : 'Waiting for specialist approval'} onClick={() => void changeContentStatus(item.id, 'published')}>Publish</button>
                    )}
                    {isAdmin && mode === 'review' && <button className="btn btn-danger btn-sm" onClick={() => void changeContentStatus(item.id, 'rejected')}>Send back</button>}
                    {isAdmin && mode === 'all' && item.status === 'published' && <button className="btn btn-secondary btn-sm" onClick={() => void changeContentStatus(item.id, 'rejected')}>Unpublish</button>}
                    {isAdmin && mode === 'all' && <button className="btn btn-danger btn-sm" onClick={() => void removeContent(item.id)}>Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  const title = isSpecialist ? 'Specialist review' : isCreator ? 'Writer workspace' : 'Staff portal';
  const lead = isSpecialist
    ? 'Approve lessons on your diseases before they are published, or ask for changes.'
    : isCreator
      ? 'Draft lessons in Kinyarwanda. A specialist and an admin check them before learners see them.'
      : 'Manage lessons, staff, diseases, learner questions and reports.';

  return (
    <div className="container admin-screen">
      <PageHeader crumbs={[{ label: 'Home', onClick: onHome }, { label: title }]} title={title} lead={<>{lead} <span className="muted">Signed in as {authUser?.name} ({roleNames[role]}).</span></>} />

      {isAdmin && (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="stat"><div className="stat-label">Waiting for specialist</div><div className="stat-value">{adminContent.filter((item) => item.status === 'review').length}</div></div>
          <div className="stat"><div className="stat-label">Ready to publish</div><div className="stat-value">{readyToPublish}</div></div>
          <div className="stat"><div className="stat-label">Published lessons</div><div className="stat-value">{adminContent.filter((item) => item.status === 'published').length}</div></div>
          <div className="stat"><div className="stat-label">Unanswered questions</div><div className="stat-value">{pendingQuestions.length}</div></div>
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
        <Panel title="Review and publish" description="Lessons on diseases with a specialist can be published once the specialist approves them." flush>
          {contentTable(reviewQueue, 'review')}
        </Panel>
      )}

      {(tab === 'pending' || tab === 'history') && <SpecialistWorkspace tab={tab} />}

      {tab === 'content' && (
        <div className="stack">
          <ContentForm isCreator={isCreator} needsSpecialist={needsSpecialist} onSave={(status) => void saveContent(status)} />
          <Panel title={isCreator ? `My lessons (${adminContent.length})` : `All lessons (${adminContent.length})`} flush>
            {contentTable(adminContent, 'all')}
          </Panel>
        </div>
      )}

      {tab === 'diseases' && <DiseaseManager onWriteLesson={writeLessonFor} />}

      {tab === 'questions' && (
        <Panel title="Learner questions" description="Answer in simple Kinyarwanda. The learner who asked sees the answer." flush>
          {questions.length === 0 ? <Empty>No questions yet.</Empty> : (
            <table className="table">
              <thead><tr><th>Question</th><th>Status</th></tr></thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id}>
                    <td>
                      <strong>{question.question}</strong>
                      <div className="small muted">{question.topic}</div>
                      {question.answer && <p className="small" style={{ marginTop: 6 }}>Answer: {question.answer}</p>}
                      {question.status !== 'Answered' && (
                        <div className="stack-sm" style={{ marginTop: 8 }}>
                          <textarea
                            className="input"
                            aria-label={`Answer to: ${question.question}`}
                            value={answerDrafts[question.id] || ''}
                            onChange={(event) => dispatch(updateAnswerDraft({ id: question.id, answer: event.target.value }))}
                          />
                          <div><button className="btn btn-primary btn-sm" onClick={() => void answerQuestion(question.id)}>Send answer</button></div>
                        </div>
                      )}
                    </td>
                    <td><StatusBadge label={question.status === 'Answered' ? 'Answered' : 'Pending'} tone={question.status === 'Answered' ? 'success' : 'warning'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {tab === 'staff' && <StaffPanel />}

      {tab === 'issues' && (
        <Panel title="User reports" flush>
          {issues.length === 0 ? <Empty>No reports yet.</Empty> : (
            <table className="table">
              <thead><tr><th>Reports</th><th className="right">Status</th></tr></thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id}>
                    <td><strong>{issue.title}</strong><div className="small muted">{issue.description}</div></td>
                    <td className="right">
                      <select className="input" style={{ width: 170 }} value={issue.status} onChange={(event) => void changeIssueStatus(issue.id, event.target.value)} aria-label="Report status">
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
          <Panel title="FAQ" flush>
            <table className="table">
              <tbody>
                {faqItems.map((faq) => (
                  <tr key={faq.id ?? faq.question}>
                    <td className="stack-sm">
                      <input className="input" value={faq.question} aria-label="Question" onChange={(event) => { if (faq.id !== undefined) dispatch(updateFaqLocal({ id: faq.id, question: event.target.value, answer: faq.answer })); }} />
                      <textarea className="input" value={faq.answer} aria-label="Answer" onChange={(event) => { if (faq.id !== undefined) dispatch(updateFaqLocal({ id: faq.id, question: faq.question, answer: event.target.value })); }} />
                      {faq.id && (
                        <div className="row">
                          <button className="btn btn-primary btn-sm" onClick={() => void saveFaq(faq)}>Save</button>
                          <button className="btn btn-danger btn-sm" onClick={() => void removeFaq(faq.id)}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <form className="panel" onSubmit={(event) => { event.preventDefault(); void createFaq(); }}>
            <div className="panel-head"><h2>Add question</h2></div>
            <div className="panel-body">
              <div className="form-group">
                <label htmlFor="faq-question">Question</label>
                <input id="faq-question" className="input" value={faqForm.question} onChange={(event) => dispatch(updateFaqForm({ question: event.target.value }))} required />
              </div>
              <div className="form-group">
                <label htmlFor="faq-answer">Answer</label>
                <textarea id="faq-answer" className="input" value={faqForm.answer} onChange={(event) => dispatch(updateFaqForm({ answer: event.target.value }))} required />
              </div>
              <button className="btn btn-primary" type="submit">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
