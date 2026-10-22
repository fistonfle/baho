import type { Interest } from '../../types';
import { PageHeader } from '../ui';

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
    <div className="container form-page">
      <PageHeader
        crumbs={[{ label: 'Ahabanza', onClick: onBack }, { label: 'Kwiyandikisha' }]}
        title="Tangira kwiga"
        lead="Hitamo ingingo wifuza kwigaho. Ibi bidufasha kukwereka amasomo akubereye."
      />
      <ol className="stepper">
        <li className="current">1. Ingingo n'izina</li>
        <li>2. Umwirondoro w'ubuzima (si ngombwa)</li>
      </ol>
      <form className="panel" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <div className="panel-body">
          <fieldset className="form-group" style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
            <legend className="form-label" style={{ marginBottom: 8 }}>Ingingo zigushishikaje</legend>
            <div className="choice-grid">
              {topics.map((interest) => (
                <label key={interest} className={`option ${selectedInterests.includes(interest) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={selectedInterests.includes(interest)} onChange={() => onToggleInterest(interest)} />
                  {interest}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-group">
            <label htmlFor="learner-name">Izina ryawe</label>
            <input id="learner-name" className="input" value={userName} onChange={(event) => onNameChange(event.target.value)} placeholder="Urugero: Uwase" autoComplete="given-name" />
          </div>
        </div>
        <div className="panel-foot row-between">
          <button type="button" className="btn btn-secondary" onClick={onBack}>Subira inyuma</button>
          <button type="submit" className="btn btn-primary">Komeza</button>
        </div>
      </form>
    </div>
  );
}
