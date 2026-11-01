// Staff portal: tabs for admins, writers and specialists. Its parts are in components/admin.
import { useState } from 'react';

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
import { StaffPanel } from '../admin/StaffPanel';
import { DiseaseManager } from '../admin/DiseaseManager';

type Tab = 'review' | 'content' | 'diseases' | 'questions' | 'staff' | 'issues' | 'faq' | 'pending' | 'history';

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
      <PageHeader crumbs={title === 'Staff portal' ? [{ label: title }] : [{ label: 'Staff portal' }, { label: title }]} title={title} lead={<>{lead} <span className="muted">Signed in as {authUser?.name} ({roleNames[role]}).</span></>} />

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
