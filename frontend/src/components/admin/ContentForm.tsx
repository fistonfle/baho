// The lesson editor used by admins and writers.
import {
  emptyContentForm,
  setEditingContentId,
  updateContentForm
} from '../../store/appSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { StatusBadge } from '../ui';
import { imageChoices } from './shared';
import { QuizEditor } from './QuizEditor';

export function ContentForm({ isCreator, needsSpecialist, onSave }: { isCreator: boolean; needsSpecialist: (categoryId: number) => boolean; onSave: (status: string) => void }) {
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
