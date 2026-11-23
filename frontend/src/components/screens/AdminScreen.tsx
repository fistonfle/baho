// Staff portal: tabs for admins, writers and specialists. Its parts are in components/admin.
import { Fragment, useState } from 'react';

import { api } from '../../services/api';
import {
  addContentLocal,
  addFaqLocal,
  answerQuestionSuccess,
  emptyContentForm,
  removeFaqLocal,
  setAdminContent,
  setEditingContentId,
  setFeedbackMessage,
  setIssues,
  updateAnswerDraft,
  updateContentForm,
  updateContentLocal,
  updateFaqForm,
  updateFaqLocal,
  type AdminContentItem
} from '../../store/appSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { Curriculum } from '../../types';
import { Empty, LessonStatusBadge, PageHeader, Panel, StatusBadge } from '../ui';
import { roleNames, issueStatus } from '../admin/shared';
import { ContentForm } from '../admin/ContentForm';
import { LessonPreview } from '../admin/LessonPreview';
import { SpecialistWorkspace } from '../admin/SpecialistWorkspace';
import { LearnerPanel } from '../admin/LearnerPanel';
import { StaffPanel } from '../admin/StaffPanel';
import { DiseaseManager } from '../admin/DiseaseManager';

type Tab = 'write' | 'content' | 'diseases' | 'questions' | 'staff' | 'learners' | 'issues' | 'faq' | 'pending' | 'history';

export function AdminScreen() {
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
  const [tab, setTab] = useState<Tab>(isAdmin ? 'staff' : isSpecialist ? 'pending' : 'content');
  const [previewId, setPreviewId] = useState<number | null>(null);
  // Only one FAQ is open for editing at a time; the rest stay a readable list.
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);
  const categoryName = (id?: number) => categories.find((category) => category.id === id)?.name ?? '';
  const notify = (message: string) => dispatch(setFeedbackMessage(message));

  // The server already filters lessons for specialists.
  const canAct = isSpecialist;

  const awaitingSpecialist = adminContent.filter((item) => item.status === 'review').length;
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
      audioIsSynthetic: contentForm.audioIsSynthetic,
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
        review: 'Lesson submitted for review.',
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
      audioIsSynthetic: Boolean(item.audioIsSynthetic),
      imageUrl: item.imageUrl || '',
      quiz: item.quiz || [],
      curriculumIds: item.curriculumIds || [],
      status: item.status
    }));
    setTab('write');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const writeLessonFor = (disease: Curriculum) => {
    dispatch(setEditingContentId(null));
    dispatch(updateContentForm({ ...emptyContentForm, categoryId: disease.categoryId ?? 1, curriculumIds: [disease.id] }));
    setTab('write');
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

  // Writer saves a draft; specialist sends the answer.
  const saveDraftAnswer = async (id: number) => {
    const answer = (answerDrafts[id] || '').trim();
    if (!answer) {
      notify('Write a draft answer before sending it to the specialist.');
      return;
    }
    try {
      const data = await api.draftAnswer(id, answer);
      dispatch(answerQuestionSuccess({ id, answer: data.question.answer, status: 'Drafted' }));
      notify('Draft sent to the specialist for approval.');
    } catch {
      notify('Could not save the draft.');
    }
  };

  const approveAnswer = async (id: number, draft: string) => {
    const edited = (answerDrafts[id] || '').trim();
    const answer = edited || draft;
    if (!answer) {
      notify('There is no answer to approve yet.');
      return;
    }
    try {
      const data = await api.answerQuestion(id, answer);
      dispatch(answerQuestionSuccess({ id, answer: data.question.answer, status: 'Answered' }));
      notify('Answer published under the lesson.');
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
    { id: 'pending', label: 'Waiting for review', roles: ['specialist'] },
    { id: 'history', label: 'Reviewed', roles: ['specialist'] },
    { id: 'write', label: 'Write a lesson', roles: ['creator', 'specialist'] },
    { id: 'content', label: isCreator ? 'My lessons' : 'All lessons', roles: ['admin', 'creator', 'specialist'] },
    { id: 'diseases', label: 'Diseases', roles: ['admin'] },
    { id: 'questions', label: 'Learner questions', count: pendingQuestions.length, roles: ['creator', 'specialist'] },
    { id: 'staff', label: 'Staff', roles: ['admin'] },
    { id: 'learners', label: 'Learners', roles: ['admin'] },
    { id: 'issues', label: 'Reports', count: openIssues.length, roles: ['admin'] },
    { id: 'faq', label: 'FAQ', roles: ['admin'] }
  ];

  const statusCell = (item: AdminContentItem) => (
    <>
      <LessonStatusBadge status={item.status} />
      {item.status === 'review' && <div className="small muted">Waiting for specialist</div>}
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
              <Fragment key={item.id}>
              <tr>
                <td>
                  <strong>{item.title}</strong>
                  <div className="small muted">{categoryName(item.categoryId)} · Questions {item.quiz?.length ?? 0}</div>
                  {item.status === 'rejected' && item.reviewNote && (
                    <p className="alert alert-danger small" style={{ marginTop: 8 }}><strong>Specialist's note:</strong> {item.reviewNote}</p>
                  )}
                </td>
                <td>{item.creatorName || '–'}</td>
                <td>{statusCell(item)}</td>
                <td className="right">
                  <div className="actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setPreviewId(previewId === item.id ? null : item.id)}>{previewId === item.id ? 'Close' : 'Read'}</button>
                    {isCreator && ['draft', 'review', 'rejected'].includes(item.status) && <button className="btn btn-secondary btn-sm" onClick={() => editContent(item)}>Edit</button>}
                    {/* A specialist answers for what is taught about their own
                        diseases, so a lesson on one of them stays theirs to
                        correct and to re-record, published or not. */}
                    {canAct && <button className="btn btn-secondary btn-sm" onClick={() => editContent(item)}>Edit</button>}
                    {canAct && item.status !== 'published' && (
                      <button className="btn btn-primary btn-sm" onClick={() => void changeContentStatus(item.id, 'published')}>Publish</button>
                    )}
                    {canAct && item.status === 'published' && <button className="btn btn-secondary btn-sm" onClick={() => void changeContentStatus(item.id, 'rejected')}>Unpublish</button>}
                    {isAdmin && mode === 'all' && <button className="btn btn-danger btn-sm" onClick={() => void removeContent(item.id)}>Delete</button>}
                  </div>
                </td>
              </tr>
              {previewId === item.id && (
                <tr className="preview-row">
                  <td colSpan={4}><LessonPreview lesson={item} /></td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  // Questions asked from inside a lesson name it, so the staff see the context.
  const lessonTitle = (id: number) => adminContent.find((item) => item.id === id)?.title ?? `lesson ${id}`;

  const listDescription = isCreator
    ? 'Your own lessons. Edit one while it is a draft, in review or sent back.'
    : isSpecialist
      ? 'Every lesson on your own diseases, whoever wrote it. You can correct one, replace its recording, and publish or unpublish it.'
      : 'Every lesson on the platform, for your oversight. Writing and publishing belong to writers and specialists; you can remove a lesson if you have to.';

  const title = isSpecialist ? 'Specialist review' : isCreator ? 'Writer workspace' : 'Staff portal';
  const lead = isSpecialist
    ? 'Approve lessons on your diseases, which publishes them, or ask for changes.'
    : isCreator
      ? 'Draft lessons in Kinyarwanda. The specialist for the disease approves them before learners see them.'
      : 'Manage staff, diseases, learner questions and reports. Lessons are written and approved by others.';

  return (
    <div className="container admin-screen">
      <PageHeader crumbs={title === 'Staff portal' ? [{ label: title }] : [{ label: 'Staff portal' }, { label: title }]} title={title} lead={<>{lead} <span className="muted">Signed in as {authUser?.name} ({roleNames[role]}).</span></>} />

      {isAdmin && (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="stat"><div className="stat-label">Waiting for specialist</div><div className="stat-value">{awaitingSpecialist}</div></div>
          <div className="stat"><div className="stat-label">Staff accounts</div><div className="stat-value">{staff.length}</div></div>
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

      {(tab === 'pending' || tab === 'history') && <SpecialistWorkspace tab={tab} />}

      {tab === 'write' && isCreator && (
        <ContentForm onSave={(status) => void saveContent(status)} />
      )}

      {/* A specialist is the clinical authority on their own diseases, so they
          write and publish there without waiting for anyone else. */}
      {tab === 'write' && isSpecialist && (
        <ContentForm onSave={(status) => void saveContent(status)} asSpecialist />
      )}

      {tab === 'content' && (
        <Panel
          title={isCreator ? `My lessons (${adminContent.length})` : `All lessons (${adminContent.length})`}
          description={listDescription}
          flush
        >
          {contentTable(adminContent, 'all')}
        </Panel>
      )}

      {tab === 'diseases' && <DiseaseManager onWriteLesson={isCreator ? writeLessonFor : undefined} />}

      {tab === 'questions' && (
        <Panel
          title="Learner questions"
          description={isCreator
            ? 'Draft an answer in simple Kinyarwanda. It is published only after the specialist for that disease approves it. You are not told who asked.'
            : 'Answer a question yourself, or approve a writer\'s draft. The answer is published under the lesson for everyone, and nobody is told who asked. Only questions about your own diseases appear here.'}
          flush
        >
          {questions.length === 0 ? (
            <Empty>{isCreator ? 'No questions are waiting for a draft answer.' : 'No questions about your diseases yet.'}</Empty>
          ) : (
            <table className="table">
              <thead><tr><th>Question</th><th>Status</th></tr></thead>
              <tbody>
                {questions.map((question) => {
                  const draft = question.answer || '';
                  const isAnswered = question.status === 'Answered';
                  const waitingOnMe = !isAnswered;
                  return (
                    <tr key={question.id}>
                      <td>
                        <strong>{question.question}</strong>
                        <div className="small muted">
                          {question.topic}
                          {question.contentId ? ` · asked from ${lessonTitle(question.contentId)}` : ''}
                        </div>
                        {draft && (
                          <p className="small" style={{ marginTop: 6 }}>
                            <strong>{isAnswered ? 'Answer sent:' : "Writer's draft:"}</strong> {draft}
                          </p>
                        )}
                        {waitingOnMe && (
                          <div className="stack-sm" style={{ marginTop: 8 }}>
                            <label className="visually-hidden" htmlFor={`answer-${question.id}`}>
                              {isCreator ? 'Draft answer' : 'Edit the answer before approving'}
                            </label>
                            <textarea
                              id={`answer-${question.id}`}
                              className="input"
                              placeholder={isCreator || !draft ? 'Write the answer in simple Kinyarwanda.' : 'Leave empty to approve the draft as it stands.'}
                              value={answerDrafts[question.id] || ''}
                              onChange={(event) => dispatch(updateAnswerDraft({ id: question.id, answer: event.target.value }))}
                            />
                            <div>
                              {isCreator
                                ? <button className="btn btn-primary btn-sm" onClick={() => void saveDraftAnswer(question.id)}>Send to specialist</button>
                                : <button className="btn btn-primary btn-sm" onClick={() => void approveAnswer(question.id, draft)}>{draft ? 'Approve and publish' : 'Answer and publish'}</button>}
                            </div>
                          </div>
                        )}
                        {!isCreator && question.status === 'Pending' && (
                          <p className="small muted" style={{ marginTop: 6 }}>No writer has drafted this one. You can answer it yourself.</p>
                        )}
                      </td>
                      <td><StatusBadge label={question.status} tone={isAnswered ? 'success' : question.status === 'Drafted' ? 'info' : 'warning'} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {tab === 'staff' && <StaffPanel />}

      {tab === 'learners' && <LearnerPanel />}

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
          <Panel
            title={`FAQ (${faqItems.length})`}
            description="Click a question to edit it. One opens at a time."
            flush
          >
            {faqItems.length === 0 ? <Empty>No questions yet.</Empty> : (
              <ul className="list">
                {faqItems.map((faq) => {
                  const open = faq.id !== undefined && openFaqId === faq.id;
                  return (
                    <li key={faq.id ?? faq.question}>
                      <button
                        type="button"
                        className="faq-question"
                        aria-expanded={open}
                        onClick={() => setOpenFaqId(open ? null : faq.id ?? null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <strong>{faq.question || 'Untitled question'}</strong>
                        <span className="muted" aria-hidden="true">{open ? '\u2212' : '+'}</span>
                      </button>
                      {open && (
                        <div className="stack-sm faq-editor">
                          <label className="visually-hidden" htmlFor={`faq-q-${faq.id}`}>Question</label>
                          <input
                            id={`faq-q-${faq.id}`}
                            className="input"
                            value={faq.question}
                            onChange={(event) => { if (faq.id !== undefined) dispatch(updateFaqLocal({ id: faq.id, question: event.target.value, answer: faq.answer })); }}
                          />
                          <label className="visually-hidden" htmlFor={`faq-a-${faq.id}`}>Answer</label>
                          <textarea
                            id={`faq-a-${faq.id}`}
                            className="input"
                            value={faq.answer}
                            onChange={(event) => { if (faq.id !== undefined) dispatch(updateFaqLocal({ id: faq.id, question: faq.question, answer: event.target.value })); }}
                          />
                          {faq.id && (
                            <div className="row">
                              <button className="btn btn-primary btn-sm" onClick={() => void saveFaq(faq)}>Save</button>
                              <button className="btn btn-danger btn-sm" onClick={() => void removeFaq(faq.id)}>Delete</button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
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
