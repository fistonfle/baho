import { useState } from 'react';

import { riskQuestions } from '../../data/healthContent';
import { profileTags, type HealthProfile } from '../../lib/personalization';
import type { Category, Curriculum } from '../../types';
import { BrandMark, Disclaimer } from '../ui';

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
    <div className="screen onboarding-screen risk-screen">
      <div className="onboarding-content">
        {fromOnboarding && (
          <div className="onboarding-brand-row">
            <BrandMark />
            <span className="onboarding-progress-label">Intambwe ya 2 kuri 2 · Si ngombwa</span>
          </div>
        )}
        <div className="onboarding-card panel">
          {fromOnboarding && <div className="step-dots" aria-hidden="true"><span className="active" /><span className="active" /></div>}
          <div className="onboarding-step-heading">
            <span className="onboarding-step-number">02</span>
            <div>
              <p className="eyebrow">UMWIRONDORO W'UBUZIMA</p>
              <h2>Tugutegurire inzira yawe</h2>
            </div>
          </div>
          <div className="privacy-note">
            <span aria-hidden="true">🔒</span>
            <p>Ibisubizo byawe bibikwa kuri iyi telefoni gusa, birinzwe (encrypted). Ntabwo byoherezwa kuri seriveri ya Baho.</p>
          </div>

          <h3 className="profile-section-title">1. Hari indwara muganga yakubwiye ko ufite?</h3>
          <div className="condition-grid">
            {conditionOptions.map((condition) => (
              <button
                type="button"
                key={condition}
                className={`chip ${conditions.includes(condition) ? 'active' : ''}`}
                aria-pressed={conditions.includes(condition)}
                onClick={() => toggleCondition(condition)}
              >
                {condition}
              </button>
            ))}
            <button
              type="button"
              className={`chip ${conditions.length === 0 ? 'active' : ''}`}
              aria-pressed={conditions.length === 0}
              onClick={() => setConditions([])}
            >
              Nta na imwe
            </button>
          </div>
          {conditionOptions.length === 0 && <p className="form-hint">Inzira z'imyigire zizagaragara internet nigaruka.</p>}

          <h3 className="profile-section-title">2. Ibibazo bigufi ku mibereho yawe</h3>
          <ol className="risk-list">
            {riskQuestions.map((question, index) => (
              <li key={question.id} className="risk-question">
                <span className="risk-number">{index + 1}</span>
                <p>{question.question}</p>
                <div className="yes-no" role="group" aria-label={question.question}>
                  <button type="button" className={answers[question.id] === true ? 'active' : ''} aria-pressed={answers[question.id] === true} onClick={() => setAnswers((current) => ({ ...current, [question.id]: true }))}>Yego</button>
                  <button type="button" className={answers[question.id] === false ? 'active' : ''} aria-pressed={answers[question.id] === false} onClick={() => setAnswers((current) => ({ ...current, [question.id]: false }))}>Oya</button>
                </div>
              </li>
            ))}
          </ol>

          {finished && (
            <div className="risk-result" role="status">
              {tags.length === 0 ? (
                <p><strong>Ni byiza!</strong> Nta byago bikomeye bigaragaye. Komeza imibereho myiza kandi wipimishe buri mwaka.</p>
              ) : (
                <>
                  <p><strong>Tuzagushyirira imbere amasomo kuri:</strong></p>
                  <div className="chip-row">{tags.map((tag) => <span key={tag} className="mini-chip">{tag}</span>)}</div>
                  {tags.length >= 3 && <p>Turakugira inama yo kwipimisha umuvuduko w'amaraso n'isukari ku kigo nderabuzima.</p>}
                </>
              )}
            </div>
          )}

          <Disclaimer />

          <div className="onboarding-actions">
            <button type="button" className="onboarding-back" onClick={onSkip}>{fromOnboarding ? 'Simbuka' : 'Subira inyuma'}</button>
            <div className="onboarding-actions-right">
              {!fromOnboarding && hasSavedProfile && (
                <button type="button" className="secondary" onClick={onClear}>Siba umwirondoro</button>
              )}
              <button type="button" className="primary" disabled={!finished} onClick={() => onSave({ conditions, answers })}>
                {finished ? 'Bika' : `${answeredCount}/${riskQuestions.length} byasubijwe`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
