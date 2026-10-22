import { useState, type FormEvent } from 'react';

import type { AuthForm } from '../../store/appSlice';
import { PageHeader } from '../ui';

// Learners register and sign in with a phone number and a PIN, because most
// people have a phone but not an email address. Staff accounts are created by
// an admin and sign in with their email and password.
type AuthMode = 'login' | 'register';

const headings: Record<AuthMode, { title: string; text: string; button: string }> = {
  login: { title: 'Injira muri konti', text: 'Injira ukoresheje nimero ya telefoni na PIN yawe.', button: 'Injira' },
  register: { title: 'Fungura konti', text: 'Ukeneye nimero ya telefoni gusa. Konti ibika aho ugeze, amanota, ibyibutsa n\'ibibazo wohereje.', button: 'Fungura konti' }
};

// Same rule as the server: 07X XXX XXXX with an MTN or Airtel prefix, with or without +250.
export const isRwandanPhone = (value: string) => /^(?:\+?250|0)7[2389]\d{7}$/.test(value.replace(/[\s().-]/g, ''));

export function AuthScreen({
  mode,
  form,
  onFormChange,
  onModeChange,
  onSubmit,
  onBack,
  onError,
  staffSignIn = false
}: {
  mode: AuthMode;
  form: AuthForm;
  onFormChange: (changes: Partial<AuthForm>) => void;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: () => void;
  onBack: () => void;
  onError: (message: string) => void;
  staffSignIn?: boolean;
}) {
  const [staffLogin, setStaffLogin] = useState(staffSignIn);
  const useEmail = mode === 'login' && staffLogin;
  const heading = useEmail ? { ...headings.login, text: 'Abakozi binjira bakoresheje imeyili n\'ijambo ry\'ibanga.' } : headings[mode];

  const switchMethod = (staff: boolean) => {
    setStaffLogin(staff);
    onFormChange({ identifier: '', password: '' });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!useEmail && !isRwandanPhone(form.identifier)) {
      onError('Andika nimero ya telefoni yo mu Rwanda, urugero 078 123 4567.');
      return;
    }
    if (!useEmail && !/^\d{4,6}$/.test(form.password)) {
      onError('PIN igomba kuba imibare 4 kugeza kuri 6.');
      return;
    }
    onSubmit();
  };

  return (
    <div className="container form-page">
      <PageHeader crumbs={[{ label: 'Ahabanza', onClick: onBack }, { label: heading.title }]} title={heading.title} lead={heading.text} />
      <form className="panel" onSubmit={submit} noValidate>
        <div className="panel-body">
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-name">Amazina yawe</label>
              <input id="auth-name" className="input" autoComplete="name" value={form.name} onChange={(event) => onFormChange({ name: event.target.value })} required />
            </div>
          )}
          {useEmail ? (
            <>
              <div className="form-group">
                <label htmlFor="auth-email">Imeyili</label>
                <input id="auth-email" className="input" type="email" autoComplete="username" value={form.identifier} onChange={(event) => onFormChange({ identifier: event.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="auth-password">Ijambo ry'ibanga</label>
                <input id="auth-password" className="input" type="password" autoComplete="current-password" value={form.password} onChange={(event) => onFormChange({ password: event.target.value })} required />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="auth-phone">Nimero ya telefoni</label>
                <input
                  id="auth-phone"
                  className="input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="078 123 4567"
                  value={form.identifier}
                  onChange={(event) => onFormChange({ identifier: event.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="auth-pin">{mode === 'register' ? 'Hitamo PIN' : 'PIN'}</label>
                <input
                  id="auth-pin"
                  className="input pin-input"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={(event) => onFormChange({ password: event.target.value.replace(/\D/g, '') })}
                  required
                />
                <span className="form-hint">
                  {mode === 'register' ? 'Imibare 4 kugeza kuri 6. Ntuyibwire undi muntu.' : 'Nyuma yo kwibeshya inshuro 5, tegereza iminota 15.'}
                </span>
              </div>
            </>
          )}
          <button className="btn btn-primary btn-block" type="submit">{heading.button}</button>
        </div>
        <div className="panel-foot stack-sm">
          {mode === 'login'
            ? <p className="small">Nta konti ufite? <button type="button" className="btn-link" onClick={() => { switchMethod(false); onModeChange('register'); }}>Fungura konti ukoresheje telefoni</button></p>
            : <p className="small">Usanzwe ufite konti? <button type="button" className="btn-link" onClick={() => onModeChange('login')}>Injira</button></p>}
          {mode === 'login' && (
            <p className="small">
              {useEmail
                ? <button type="button" className="btn-link" onClick={() => switchMethod(false)}>Injira ukoresheje nimero ya telefoni</button>
                : <>Uri umukozi wa Baho? <button type="button" className="btn-link" onClick={() => switchMethod(true)}>Injira ukoresheje imeyili</button></>}
            </p>
          )}
          <p className="small muted">Ushobora no gukoresha Baho nta konti; ibyo wize bibikwa kuri iyi telefoni.</p>
        </div>
      </form>
    </div>
  );
}
