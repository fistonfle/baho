import { useState } from 'react';

import { riskQuestions } from '../../data/healthContent';
import { profileTags, type HealthProfile } from '../../lib/personalization';
import type { Category, Curriculum } from '../../types';
import { Disclaimer, PageHeader } from '../ui';

// Optional health profile (FR08): diagnosed conditions choose the learning
// path, the six questions refine the "for you" ranking. Everything is
// encrypted and kept on this device only.
export function HealthProfileScreen({
  initialProfile,
  curricula,
  categories,
  fromOnboarding,
  onSave,
  onSkip,
  onClear
}: {
  initialProfile: HealthProfile;
  curricula: Curriculum[];
  categories: Category[];
  fromOnboarding: boolean;
  onSave: (profile: HealthProfile) => void;
  onSkip: () => void;
  onClear: () => void;
}) {
  const [conditions, setConditions] = useState<string[]>(initialProfile.conditions);
  const [answers, setAnswers] = useState(initialProfile.answers);
  const conditionOptions = curricula.filter((curriculum) => curriculum.condition).map((curriculum) => curriculum.condition as string);
  const answeredCount = Object.keys(answers).length;
  const finished = answeredCount === riskQuestions.length;
  const tags = profileTags({ conditions, answers }, curricula, categories);
  const hasSavedProfile = initialProfile.conditions.length > 0 || Object.keys(initialProfile.answers).length > 0;

  const toggleCondition = (condition: string) => {
    setConditions((current) => current.includes(condition) ? current.filter((item) => item !== condition) : [...current, condition]);
  };

  return (
    <div className="container form-page wide">
      <PageHeader
        crumbs={fromOnboarding ? [{ label: 'Kwiyandikisha' }, { label: 'Umwirondoro w\'ubuzima' }] : [{ label: 'Ahabanza', onClick: onSkip }, { label: 'Umwirondoro w\'ubuzima' }]}
        title="Umwirondoro w'ubuzima"
        lead="Ibi bisubizo bidufasha kuguhitiramo inzira y'imyigire n'amasomo akubereye. Ni ubushake."
      />
      {fromOnboarding && (
        <ol className="stepper">
          <li className="done">1. Ingingo n'izina</li>
          <li className="current">2. Umwirondoro w'ubuzima (si ngombwa)</li>
        </ol>
      )}
      <p className="alert alert-info" style={{ marginBottom: 16 }}>
        <strong>Ibanga ryawe:</strong> ibisubizo bibikwa kuri iyi telefoni gusa, bihishwe (AES-GCM). Ntabwo byoherezwa kuri seriveri ya Baho.
      </p>

      <div className="stack">
        <section className="panel">
          <div className="panel-head"><div><h2>1. Indwara muganga yakubwiye ko ufite</h2><p>Hitamo izireba, cyangwa "Nta na imwe".</p></div></div>
          <div className="panel-body">
            <div className="choice-grid">
              {conditionOptions.map((condition) => (
                <label key={condition} className={`option ${conditions.includes(condition) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={conditions.includes(condition)} onChange={() => toggleCondition(condition)} />
                  {condition}
                </label>
              ))}
              <label className={`option ${conditions.length === 0 ? 'selected' : ''}`}>
                <input type="checkbox" checked={conditions.length === 0} onChange={() => setConditions([])} />
                Nta na imwe
              </label>
            </div>
            {conditionOptions.length === 0 && <p className="form-hint">Urutonde rw'indwara ruzagaragara internet nigaruka.</p>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>2. Ibibazo ku mibereho</h2><p>{answeredCount} kuri {riskQuestions.length} byasubijwe</p></div></div>
          <div className="panel-body flush">
            <table className="table question-table">
              <tbody>
                {riskQuestions.map((question, index) => (
                  <tr key={question.id}>
                    <td>{index + 1}. {question.question}</td>
                    <td>
                      <div className="segmented" role="group" aria-label={question.question}>
                        <button type="button" className={answers[question.id] === true ? 'active' : ''} aria-pressed={answers[question.id] === true} onClick={() => setAnswers((current) => ({ ...current, [question.id]: true }))}>Yego</button>
                        <button type="button" className={answers[question.id] === false ? 'active' : ''} aria-pressed={answers[question.id] === false} onClick={() => setAnswers((current) => ({ ...current, [question.id]: false }))}>Oya</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {finished && (
          <div className="alert alert-success" role="status">
            {tags.length === 0
              ? <p><strong>Nta byago bikomeye bigaragaye.</strong> Komeza imibereho myiza kandi wipimishe buri mwaka.</p>
              : <>
                <p><strong>Tuzagushyirira imbere amasomo kuri:</strong> {tags.join(', ')}.</p>
                {tags.length >= 3 && <p>Turakugira inama yo kwipimisha umuvuduko w'amaraso n'isukari ku kigo nderabuzima.</p>}
              </>}
          </div>
        )}

        <Disclaimer />

        <div className="row-between">
          <button type="button" className="btn btn-secondary" onClick={onSkip}>{fromOnboarding ? 'Simbuka' : 'Subira inyuma'}</button>
          <div className="row">
            {!fromOnboarding && hasSavedProfile && <button type="button" className="btn btn-danger" onClick={onClear}>Siba umwirondoro</button>}
            <button type="button" className="btn btn-primary" disabled={!finished} onClick={() => onSave({ conditions, answers })}>
              {finished ? 'Bika' : `Subiza ibibazo byose (${answeredCount}/${riskQuestions.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
