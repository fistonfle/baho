import type { FormEvent } from 'react';

import { BrandMark } from '../ui';

type AuthMode = 'login' | 'register' | 'setup';

const headings: Record<AuthMode, { title: string; text: string; button: string }> = {
  login: { title: 'Injira muri konti yawe', text: 'Injira kugira ngo ukomeze amasomo yawe n\'ibyo wabitse.', button: 'Injira' },
  register: { title: 'Fungura konti', text: 'Konti igufasha kubika ibibazo, ibyibutsa n\'aho ugeze mu masomo.', button: 'Fungura konti' },
  setup: { title: 'Fungura konti ya mbere y\'ubuyobozi', text: 'Umuyobozi wa Baho ashobora kongeramo abakozi no kugenzura amasomo.', button: 'Fungura konti y\'ubuyobozi' }
};

export function AuthScreen({
  mode,
  form,
  setupNeeded,
  onFormChange,
  onModeChange,
  onSubmit,
  onBack
}: {
  mode: AuthMode;
  form: { name: string; email: string; password: string };
  setupNeeded: boolean;
  onFormChange: (changes: Partial<{ name: string; email: string; password: string }>) => void;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const heading = headings[mode];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="screen auth-screen">
      <div className="auth-layout">
        <div className="auth-brand-row">
          <BrandMark />
          <span className="auth-brand-caption">Amakuru meza. Ubuzima bwiza.</span>
        </div>
        <form className="auth-card panel" onSubmit={submit}>
          <div className="auth-heading">
            <p className="eyebrow">Konti ya Baho</p>
            <h2>{heading.title}</h2>
            <p>{heading.text}</p>
          </div>
          {mode !== 'login' && (
            <label className="field">
              <span>Amazina yose</span>
              <input autoComplete="name" value={form.name} onChange={(event) => onFormChange({ name: event.target.value })} required />
            </label>
          )}
          <label className="field">
            <span>Imeyili</span>
            <input type="email" autoComplete="email" value={form.email} onChange={(event) => onFormChange({ email: event.target.value })} required />
          </label>
          <label className="field">
            <span>Ijambo ry'ibanga {mode !== 'login' && <small>(inyuguti nibura 8)</small>}</span>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={form.password}
              onChange={(event) => onFormChange({ password: event.target.value })}
              minLength={8}
              required
            />
          </label>
          <button className="primary full" type="submit">{heading.button}</button>
          <div className="auth-divider"><span>CYANGWA</span></div>
          <div className="auth-alternatives">
            {mode !== 'login' && (
              <button className="auth-option" type="button" onClick={() => onModeChange('login')}>
                Usanzwe ufite konti? <strong>Injira</strong>
              </button>
            )}
            {mode !== 'register' && (
              <button className="auth-option" type="button" onClick={() => onModeChange('register')}>
                Nta konti ufite? <strong>Fungura konti</strong>
              </button>
            )}
            {setupNeeded && mode !== 'setup' && (
              <button className="auth-option" type="button" onClick={() => onModeChange('setup')}>
                <strong>Fungura konti ya mbere y'ubuyobozi</strong>
              </button>
            )}
          </div>
          <p className="auth-guest-note">Ushobora no gukoresha Baho nta konti. Amakuru yawe azabikwa kuri iyi telefoni.</p>
          <button className="auth-back" type="button" onClick={onBack}>← Subira inyuma</button>
        </form>
      </div>
    </div>
  );
}
