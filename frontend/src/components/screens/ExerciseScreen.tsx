import { useState } from 'react';

import { exerciseLevels, exercises, type ExerciseLevel } from '../../data/healthContent';
import { AudioPlayer } from '../AudioPlayer';
import { PageHeader } from '../ui';

export function ExerciseScreen({ onExerciseDone, onHome }: { onExerciseDone: (title: string) => void; onHome: () => void }) {
  const [level, setLevel] = useState<ExerciseLevel>('Nshya');
  const levelExercises = exercises.filter((exercise) => exercise.level === level);
  const [openId, setOpenId] = useState(levelExercises[0].id);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const selected = levelExercises.find((exercise) => exercise.id === openId) ?? levelExercises[0];

  const chooseLevel = (nextLevel: ExerciseLevel) => {
    setLevel(nextLevel);
    setOpenId(exercises.find((exercise) => exercise.level === nextLevel)!.id);
  };

  const finish = () => {
    setDoneIds([...doneIds, selected.id]);
    onExerciseDone(selected.title);
  };

  return (
    <div className="container">
      <PageHeader
        crumbs={[{ label: 'Ahabanza', onClick: onHome }, { label: 'Imyitozo ngororamubiri' }]}
        title="Imyitozo ngororamubiri"
        lead="Hitamo urwego rukubereye, ukurikize intambwe z'umwitozo."
      />
      <div className="layout-aside-main">
        <section className="panel">
          <div className="panel-head"><h2>Urwego</h2></div>
          <div className="panel-body" style={{ paddingBottom: 12 }}>
            <div className="option-list" role="radiogroup" aria-label="Urwego rw'imyitozo">
              {exerciseLevels.map((item) => (
                <label key={item.level} className={`option ${level === item.level ? 'selected' : ''}`}>
                  <input type="radio" name="exercise-level" checked={level === item.level} onChange={() => chooseLevel(item.level)} />
                  <span><strong>{item.level}</strong><br /><span className="small muted">{item.hint}</span></span>
                </label>
              ))}
            </div>
          </div>
          <div className="panel-head" style={{ borderTop: '1px solid var(--line)' }}><h2>Imyitozo</h2></div>
          <ul className="list">
            {levelExercises.map((exercise) => (
              <li key={exercise.id}>
                <button className={`list-button ${selected.id === exercise.id ? 'current' : ''}`} onClick={() => setOpenId(exercise.id)}>
                  <span className="grow"><strong>{exercise.title}</strong><small>Iminota {exercise.minutes}</small></span>
                  {doneIds.includes(exercise.id) && <span className="badge badge-success">Wabikoze</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <article className="panel">
          <div className="panel-head">
            <div><h2>{selected.title}</h2><p>Urwego: {selected.level} · Iminota {selected.minutes}</p></div>
          </div>
          <div className="panel-body">
            <h3 className="section-title" style={{ marginTop: 0 }}>Intambwe</h3>
            <ol className="fact-list">
              {selected.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <AudioPlayer text={`${selected.title}. ${selected.steps.join(' ')}`} />
            <button className="btn btn-primary" onClick={finish} disabled={doneIds.includes(selected.id)}>
              {doneIds.includes(selected.id) ? 'Wabikoze uyu munsi' : 'Narangije uyu mwitozo'}
            </button>
            <p className="alert alert-warning small" style={{ marginTop: 16 }}>
              <strong>Umutekano:</strong> Niba ufite indwara y'umutima, uri utwite cyangwa ubabara, banza ubaze muganga mbere yo gutangira imyitozo mishya.
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
