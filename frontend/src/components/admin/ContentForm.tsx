// The lesson editor used by admins and writers.
import {
  emptyContentForm,
  setEditingContentId,
  setFeedbackMessage,
  updateContentForm
} from '../../store/appSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { StatusBadge, smallPhoto } from '../ui';
import { imageChoices } from './shared';
import { AudioUpload } from './AudioUpload';
import { QuizEditor } from './QuizEditor';

// Used by writers (draft) and specialists (edit and publish their diseases).
export function ContentForm({ onSave, asSpecialist = false }: { onSave: (status: string) => void; asSpecialist?: boolean }) {
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
    <form className="panel creator-content-form" onSubmit={(event) => { event.preventDefault(); onSave(asSpecialist ? 'published' : 'review'); }}>
      <div className="panel-head">
        <div>
          <h2>{editingContentId ? 'Edit lesson' : 'New lesson'}</h2>
          <p>
            {asSpecialist
              ? 'This lesson is on one of your diseases. Correct the text, or replace the recording, then keep it where it is or publish it.'
              : 'The specialist for this disease has to approve the lesson, and their approval publishes it. Until a specialist is assigned to the disease, the lesson waits.'}
          </p>
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
          <AudioUpload
            value={contentForm.audioUrl}
            synthetic={contentForm.audioIsSynthetic}
            title={contentForm.title}
            body={contentForm.body}
            onChange={(audioUrl, audioIsSynthetic) => dispatch(updateContentForm({ audioUrl, audioIsSynthetic }))}
            onError={(message) => dispatch(setFeedbackMessage(message))}
          />
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
                  <img src={smallPhoto(url)} alt="" loading="lazy" />
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
        {asSpecialist ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => onSave(contentForm.status || 'draft')}>Save changes</button>
            <button type="submit" className="btn btn-primary">Save and publish</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => onSave('draft')}>Save as draft</button>
            <button type="submit" className="btn btn-primary">Send to specialist</button>
          </>
        )}
        {editingContentId && (
          <button type="button" className="btn btn-link" onClick={() => { dispatch(setEditingContentId(null)); dispatch(updateContentForm(emptyContentForm)); }}>
            Cancel editing
          </button>
        )}
      </div>
    </form>
  );
}
