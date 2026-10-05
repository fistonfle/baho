import { useState } from 'react';

import { exerciseLevels, exercises, type ExerciseLevel } from '../../data/healthContent';
import { AudioPlayer } from '../AudioPlayer';

export function ExerciseScreen({ onExerciseDone }: { onExerciseDone: (title: string) => void }) {
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
    <div className="screen dynamic-screen exercise-screen">
      <div className="panel-section">
        <p className="eyebrow">Imyitozo ngororamubiri</p>
        <h2>Hitamo urwego rwawe</h2>
        <div className="level-picker" role="radiogroup" aria-label="Urwego rw'imyitozo">
          {exerciseLevels.map((item) => (
            <button
              key={item.level}
              role="radio"
              aria-checked={level === item.level}
              className={`level-option ${level === item.level ? 'active' : ''}`}
              onClick={() => chooseLevel(item.level)}
            >
              <strong>{item.level}</strong>
              <small>{item.hint}</small>
            </button>
          ))}
        </div>

        <div className="exercise-layout">
          <div className="exercise-list">
            {levelExercises.map((exercise) => (
              <button
                key={exercise.id}
                className={`exercise-item ${selected.id === exercise.id ? 'active' : ''}`}
                onClick={() => setOpenId(exercise.id)}
              >
                <span className="exercise-emoji" aria-hidden="true">{exercise.icon}</span>
                <span>
                  <strong>{exercise.title}</strong>
                  <small>Iminota {exercise.minutes}</small>
                </span>
                {doneIds.includes(exercise.id) && <span className="exercise-done" aria-label="Warangije">✓</span>}
              </button>
            ))}
          </div>

          <article className="exercise-box">
            <div className="exercise-illustration" aria-hidden="true">{selected.icon}</div>
            <h3>{selected.title}</h3>
            <p className="exercise-minutes">⏱ Iminota {selected.minutes}</p>
            <ol className="exercise-steps">
              {selected.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <AudioPlayer text={`${selected.title}. ${selected.steps.join(' ')}`} />
            <button className={`complete-button ${doneIds.includes(selected.id) ? 'done' : ''}`} onClick={finish} disabled={doneIds.includes(selected.id)}>
              {doneIds.includes(selected.id) ? '✓ Wabikoze uyu munsi' : 'Narangije uyu mwitozo'}
            </button>
          </article>
        </div>
        <p className="health-disclaimer"><strong>Umutekano:</strong> Niba ufite indwara y'umutima, uri utwite cyangwa ubabara, banza ubaze muganga mbere yo gutangira imyitozo mishya.</p>
      </div>
    </div>
  );
}
