import type { FormEvent } from 'react';

import { PageHeader } from '../ui';

// Staff accounts are created by an admin, and the first admin comes from the
// server's environment, so this screen only signs in and registers learners.
type AuthMode = 'login' | 'register';

const headings: Record<AuthMode, { title: string; text: string; button: string }> = {
  login: { title: 'Injira muri konti', text: 'Abanyeshuri n\'abakozi b\'ubuzima binjirira hano.', button: 'Injira' },
  register: { title: 'Fungura konti y\'umunyeshuri', text: 'Konti igufasha kubika aho ugeze, amanota, ibyibutsa n\'ibibazo wohereje.', button: 'Fungura konti' }
};

export function AuthScreen({
  mode,
  form,
  onFormChange,
  onModeChange,
  onSubmit,
  onBack
}: {
  mode: AuthMode;
  form: { name: string; email: string; password: string };
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
    <div className="container form-page">
      <PageHeader crumbs={[{ label: 'Ahabanza', onClick: onBack }, { label: heading.title }]} title={heading.title} lead={heading.text} />
      <form className="panel" onSubmit={submit}>
        <div className="panel-body">
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-name">Amazina yose</label>
              <input id="auth-name" className="input" autoComplete="name" value={form.name} onChange={(event) => onFormChange({ name: event.target.value })} required />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="auth-email">Imeyili</label>
            <input id="auth-email" className="input" type="email" autoComplete="email" value={form.email} onChange={(event) => onFormChange({ email: event.target.value })} required />
          </div>
          <div className="form-group">
            <label htmlFor="auth-password">Ijambo ry'ibanga</label>
            <input
              id="auth-password"
              className="input"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={form.password}
              onChange={(event) => onFormChange({ password: event.target.value })}
              minLength={8}
              required
            />
            {mode === 'register' && <span className="form-hint">Nibura inyuguti 8.</span>}
          </div>
          <button className="btn btn-primary btn-block" type="submit">{heading.button}</button>
        </div>
        <div className="panel-foot stack-sm">
          {mode === 'login'
            ? <p className="small">Nta konti ufite? <button type="button" className="btn-link" onClick={() => onModeChange('register')}>Fungura konti y'umunyeshuri</button></p>
            : <p className="small">Usanzwe ufite konti? <button type="button" className="btn-link" onClick={() => onModeChange('login')}>Injira</button></p>}
          <p className="small muted">Konti z'abakozi (abanditsi, inzobere n'abayobozi) zifungurwa n'umuyobozi wa Baho. Ushobora no gukoresha Baho nta konti.</p>
        </div>
      </form>
    </div>
  );
}
