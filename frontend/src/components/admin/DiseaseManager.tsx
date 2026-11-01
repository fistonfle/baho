import { useState } from 'react';

import { api, type DiseasePayload } from '../../services/api';
import { setCategories, setFeedbackMessage, upsertCurriculum } from '../../store/appSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { Curriculum } from '../../types';
import { Panel } from '../ui';

type DiseaseForm = { name: string; icon: string; about: string; description: string; riskFactors: string; warningSigns: string; prevention: string };

const emptyForm: DiseaseForm = { name: '', icon: '', about: '', description: '', riskFactors: '', warningSigns: '', prevention: '' };

// One item per line in the form, a list in the API.
const toLines = (items: string[]) => items.join('\n');
const fromLines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);

// Admin tool to add a disease (it gets a lesson category and a learning path)
// and to edit the information learners see in the NCD module.
export function DiseaseManager({ onWriteLesson }: { onWriteLesson: (disease: Curriculum) => void }) {
  const dispatch = useAppDispatch();
  const curricula = useAppSelector((state) => state.app.curricula);
  const categories = useAppSelector((state) => state.app.categories);
  const diseases = curricula.filter((curriculum) => curriculum.condition);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DiseaseForm>(emptyForm);
  const notify = (message: string) => dispatch(setFeedbackMessage(message));

  const startEdit = (disease: Curriculum) => {
    setEditingId(disease.id);
    setForm({
      name: disease.condition || '',
      icon: disease.icon || '',
      about: disease.about,
      description: disease.description,
      riskFactors: toLines(disease.riskFactors),
      warningSigns: toLines(disease.warningSigns),
      prevention: toLines(disease.prevention)
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async () => {
    const payload: DiseasePayload = {
      name: form.name.trim(),
      icon: form.icon,
      about: form.about.trim(),
      description: form.description.trim(),
      riskFactors: fromLines(form.riskFactors),
      warningSigns: fromLines(form.warningSigns),
      prevention: fromLines(form.prevention)
    };
    if (!payload.name || !payload.about || !payload.riskFactors.length || !payload.warningSigns.length || !payload.prevention.length) {
      notify('Fill in the name, the description and at least one item in each list.');
      return;
    }
    try {
      const response = editingId ? await api.updateDisease(editingId, payload) : await api.createDisease(payload);
      dispatch(upsertCurriculum(response.disease));
      if (!editingId && response.disease.categoryId && !categories.some((category) => category.id === response.disease.categoryId)) {
        dispatch(setCategories([...categories, { id: response.disease.categoryId, name: payload.name, slug: response.disease.slug }]));
      }
      notify(editingId ? 'Disease information updated.' : `"${payload.name}" added. You can now write lessons for it.`);
      reset();
    } catch (error) {
      notify(error instanceof Error && error.message.includes('already exists') ? 'This disease already exists.' : 'Could not save the disease.');
    }
  };

  const field = (key: keyof DiseaseForm, label: string, hint?: string, multiline = true, placeholder = '') => (
    <div className="form-group">
      <label htmlFor={`disease-${key}`}>{label}</label>
      {multiline
        ? <textarea id={`disease-${key}`} className="input" value={form[key]} placeholder={placeholder} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
        : <input id={`disease-${key}`} className="input" value={form[key]} placeholder={placeholder} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );

  return (
    <div className="layout-main-aside">
      <Panel title={`Diseases in Baho (${diseases.length})`} description="Each disease has its own lesson topic and learning path." flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Diseases</th><th>Published lessons</th><th className="right">Actions</th></tr></thead>
            <tbody>
              {diseases.map((disease) => (
                <tr key={disease.id}>
                  <td><strong>{disease.condition}</strong><div className="small muted">{disease.description}</div></td>
                  <td>{disease.lessonIds.length}</td>
                  <td className="right">
                    <div className="actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(disease)}>Edit</button>
                      <button className="btn btn-primary btn-sm" onClick={() => onWriteLesson(disease)}>Write lesson</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <form className="panel" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <div className="panel-head">
          <div>
            <h2>{editingId ? 'Edit disease information' : 'Add disease'}</h2>
            <p>A new disease appears in the learners' disease section, health profile and learning paths. Write its information in Kinyarwanda.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="form-group">
            <label htmlFor="disease-name">Disease name (Kinyarwanda)</label>
            <input id="disease-name" className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={Boolean(editingId)} placeholder="e.g. Asima" required />
          </div>
          {field('about', 'What is it?', 'A few simple sentences.')}
          {field('riskFactors', 'Risk factors', 'One per line.')}
          {field('warningSigns', 'Warning signs', 'One per line.')}
          {field('prevention', 'Prevention', 'One per line.')}
          {field('description', 'Learning path tagline', 'Optional.', false)}
        </div>
        <div className="panel-foot form-actions">
          <button className="btn btn-primary" type="submit">{editingId ? 'Save changes' : 'Add disease'}</button>
          {editingId && <button type="button" className="btn btn-secondary" onClick={reset}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}
