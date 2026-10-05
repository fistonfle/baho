import type { Interest } from '../../types';
import { BrandMark } from '../ui';

export function OnboardingScreen({
  userName,
  topics,
  selectedInterests,
  onNameChange,
  onToggleInterest,
  onBack,
  onContinue,
  onError
}: {
  userName: string;
  topics: Interest[];
  selectedInterests: Interest[];
  onNameChange: (name: string) => void;
  onToggleInterest: (interest: Interest) => void;
  onBack: () => void;
  onContinue: () => void;
  onError: (message: string) => void;
}) {
  const submit = () => {
    if (!userName.trim()) {
      onError('Andika izina ryawe kugira ngo ukomeze.');
      return;
    }
    if (selectedInterests.length === 0) {
      onError('Hitamo nibura ingingo imwe.');
      return;
    }
    onContinue();
  };

  return (
    <div className="screen onboarding-screen">
      <div className="onboarding-content">
        <div className="onboarding-brand-row">
          <BrandMark />
          <span className="onboarding-progress-label">Intambwe ya 1 kuri 2</span>
        </div>
        <form className="onboarding-card panel" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <div className="step-dots" aria-hidden="true"><span className="active" /><span /></div>
          <div className="onboarding-step-heading">
            <span className="onboarding-step-number">01</span>
            <div>
              <p className="eyebrow">KUGUTEGURIRA BAHO</p>
              <h2>Ni izihe ngingo zigushishikaje?</h2>
            </div>
          </div>
          <p className="onboarding-intro">Hitamo ingingo wifuza kwigaho. Ibi bidufasha kukwereka amasomo akubereye.</p>
          <div className="interest-grid">
            {topics.map((interest) => (
              <button
                type="button"
                key={interest}
                className={`chip ${selectedInterests.includes(interest) ? 'active' : ''}`}
                aria-pressed={selectedInterests.includes(interest)}
                onClick={() => onToggleInterest(interest)}
              >
                {interest}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Izina ryawe</span>
            <input value={userName} onChange={(event) => onNameChange(event.target.value)} placeholder="Urugero: Uwase" autoComplete="given-name" />
          </label>
          <div className="onboarding-actions">
            <button type="button" className="onboarding-back" onClick={onBack}>Subira inyuma</button>
            <button type="submit" className="primary">Komeza <span aria-hidden="true">→</span></button>
          </div>
        </form>
      </div>
    </div>
  );
}
