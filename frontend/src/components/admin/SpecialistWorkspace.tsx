// A specialist's review queue and review history.
import { useEffect, useState } from 'react';

import { api } from '../../services/api';
import {
  setFeedbackMessage,
  type AdminContentItem
} from '../../store/appSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { Empty, LessonStatusBadge, Panel } from '../ui';
import { formatDate } from './shared';
import { LessonPreview } from './LessonPreview';

type ReviewLesson = AdminContentItem & { creatorName?: string; reviewedAt?: string | null };

export function SpecialistWorkspace({ tab }: { tab: 'pending' | 'history' }) {
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
