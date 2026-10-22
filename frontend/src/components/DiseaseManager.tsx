import { useState } from 'react';

import { api, type DiseasePayload } from '../services/api';
import { setCategories, setFeedbackMessage, upsertCurriculum } from '../store/appSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { Curriculum } from '../types';
import { Panel } from './ui';

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
      notify('Uzuza izina, ibisobanuro n\'urutonde rumwe nibura muri buri gice.');
      return;
    }
    try {
      const response = editingId ? await api.updateDisease(editingId, payload) : await api.createDisease(payload);
      dispatch(upsertCurriculum(response.disease));
      if (!editingId && response.disease.categoryId && !categories.some((category) => category.id === response.disease.categoryId)) {
        dispatch(setCategories([...categories, { id: response.disease.categoryId, name: payload.name, slug: response.disease.slug }]));
      }
      notify(editingId ? 'Amakuru y\'indwara yahinduwe.' : `"${payload.name}" yongeweho. Ubu ushobora kwandika amasomo kuri yo.`);
      reset();
    } catch (error) {
      notify(error instanceof Error && error.message.includes('already exists') ? 'Iyi ndwara isanzwe ihari.' : 'Ntibyashobotse kubika indwara.');
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
      <Panel title={`Indwara ziri muri Baho (${diseases.length})`} description="Buri ndwara igira icyiciro cy'amasomo n'inzira y'imyigire." flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Indwara</th><th>Amasomo yasohotse</th><th className="right">Igikorwa</th></tr></thead>
            <tbody>
              {diseases.map((disease) => (
                <tr key={disease.id}>
                  <td><strong>{disease.condition}</strong><div className="small muted">{disease.description}</div></td>
                  <td>{disease.lessonIds.length}</td>
                  <td className="right">
                    <div className="actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(disease)}>Hindura</button>
                      <button className="btn btn-primary btn-sm" onClick={() => onWriteLesson(disease)}>Andika isomo</button>
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
            <h2>{editingId ? 'Hindura amakuru y\'indwara' : 'Ongeraho indwara'}</h2>
            <p>Indwara nshya igaragara mu gice cy'indwara, mu mwirondoro w'ubuzima no mu nzira z'imyigire.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="form-group">
            <label htmlFor="disease-name">Izina ry'indwara</label>
            <input id="disease-name" className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={Boolean(editingId)} placeholder="Urugero: Asima" required />
          </div>
          {field('about', 'Ni iki?', 'Interuro nke zoroshye.')}
          {field('riskFactors', 'Ibyongera ibyago', 'Kimwe ku murongo.')}
          {field('warningSigns', 'Ibimenyetso', 'Kimwe ku murongo.')}
          {field('prevention', 'Uko wayirinda', 'Kimwe ku murongo.')}
          {field('description', 'Interuro y\'inzira y\'imyigire', 'Si ngombwa.', false)}
        </div>
        <div className="panel-foot form-actions">
          <button className="btn btn-primary" type="submit">{editingId ? 'Bika impinduka' : 'Ongeraho indwara'}</button>
          {editingId && <button type="button" className="btn btn-secondary" onClick={reset}>Hagarika</button>}
        </div>
      </form>
    </div>
  );
}
