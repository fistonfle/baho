import { useState } from 'react';

import { api, type DiseasePayload } from '../services/api';
import { setCategories, setFeedbackMessage, upsertCurriculum } from '../store/appSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { Curriculum } from '../types';

const icons = ['✚', '❤', '◉', '♥', '🫁', '🧠', '🩸', '🦴', '👁', '🫀'];

type DiseaseForm = { name: string; icon: string; about: string; description: string; riskFactors: string; warningSigns: string; prevention: string };

const emptyForm: DiseaseForm = { name: '', icon: '✚', about: '', description: '', riskFactors: '', warningSigns: '', prevention: '' };

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
      icon: disease.icon || '✚',
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

  return (
    <section className="admin-section admin-two-col">
      <form className="question-card disease-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <h3>{editingId ? 'Hindura amakuru y\'indwara' : 'Ongeraho indwara nshya'}</h3>
        <p className="form-hint">Indwara nshya ihita igaragara mu gice cy'indwara, mu mwirondoro w'ubuzima no mu nzira z'imyigire.</p>
        <label className="creator-field">
          <span>Izina ry'indwara</span>
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={Boolean(editingId)} placeholder="Urugero: Asima" required />
        </label>
        <div className="creator-field">
          <span>Ikimenyetso</span>
          <div className="icon-picker" role="radiogroup" aria-label="Ikimenyetso cy'indwara">
            {icons.map((icon) => (
              <button type="button" key={icon} role="radio" aria-checked={form.icon === icon} className={form.icon === icon ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, icon }))}>{icon}</button>
            ))}
          </div>
        </div>
        <label className="creator-field">
          <span>Ni iki? (ibisobanuro)</span>
          <textarea value={form.about} onChange={(event) => setForm((current) => ({ ...current, about: event.target.value }))} placeholder="Sobanura indwara mu nteruro nke zoroshye" required />
        </label>
        <label className="creator-field">
          <span>Ibyongera ibyago (kimwe ku murongo)</span>
          <textarea value={form.riskFactors} onChange={(event) => setForm((current) => ({ ...current, riskFactors: event.target.value }))} placeholder={'Umwotsi\nIvumbi'} />
        </label>
        <label className="creator-field">
          <span>Ibimenyetso (kimwe ku murongo)</span>
          <textarea value={form.warningSigns} onChange={(event) => setForm((current) => ({ ...current, warningSigns: event.target.value }))} placeholder="Guhumeka nabi" />
        </label>
        <label className="creator-field">
          <span>Uko wayirinda (kimwe ku murongo)</span>
          <textarea value={form.prevention} onChange={(event) => setForm((current) => ({ ...current, prevention: event.target.value }))} placeholder="Irinde umwotsi" />
        </label>
        <label className="creator-field">
          <span>Interuro y'inzira y'imyigire (si ngombwa)</span>
          <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Wige kubana neza n'iyi ndwara." />
        </label>
        <div className="creator-form-actions">
          <button className="primary" type="submit">{editingId ? 'Bika impinduka' : 'Ongeraho indwara'}</button>
          {editingId && <button type="button" className="creator-cancel" onClick={reset}>Hagarika</button>}
        </div>
      </form>

      <div>
        <h3 className="subheading">Indwara ziri muri Baho ({diseases.length})</h3>
        {diseases.map((disease) => (
          <article key={disease.id} className="disease-row">
            <span className="disease-icon" aria-hidden="true">{disease.icon || '✚'}</span>
            <div>
              <strong>{disease.condition}</strong>
              <p>Amasomo {disease.lessonIds.length} yasohotse</p>
            </div>
            <div className="admin-row-actions">
              <button className="small-button" onClick={() => startEdit(disease)}>Hindura</button>
              <button className="small-button approve" onClick={() => onWriteLesson(disease)}>+ Isomo</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
