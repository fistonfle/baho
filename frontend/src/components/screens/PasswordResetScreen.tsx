import { useState, type FormEvent } from 'react';

import { api } from '../../services/api';
import { PageHeader } from '../ui';

// Staff sign in with an email address, so a forgotten password is recovered by
// email. The screen has two steps: asking for the link, and choosing the new
// password after the link is opened. Learners sign in with a phone number and
// a PIN and have no address on file, so this screen does not apply to them;
// recovering a forgotten PIN is not built yet. In English, like the rest of
// the staff portal.

export function PasswordResetScreen({
  token,
  onDone,
  onBack
}: {
  token?: string | null;
  onDone: () => void;
  onBack: () => void;
}) {
  const step: 'request' | 'choose' = token ? 'choose' : 'request';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [devLink, setDevLink] = useState('');
  const [changed, setChanged] = useState(false);

  const askForLink = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.includes('@')) {
      setError('Enter the email address of your staff account.');
      return;
    }
    setBusy(true);
    try {
      const response = await api.forgotPassword({ email: email.trim() });
      setSent(response.message);
      if (response.resetLink) setDevLink(response.resetLink);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send the reset link.');
    } finally {
      setBusy(false);
    }
  };

  const choosePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('The new password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('The two passwords are not the same.');
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword({ token: token as string, password });
      setChanged(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not change the password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container form-page">
      <PageHeader
        crumbs={[{ label: 'Home', onClick: onBack }, { label: 'Password reset' }]}
        title={step === 'choose' ? 'Choose a new password' : 'Reset your password'}
        lead={
          step === 'choose'
            ? 'Pick a password of at least 8 characters. The link you opened works only once.'
            : 'Enter the email address of your staff account and we will send you a link to set a new password.'
        }
      />
      <form className="panel" onSubmit={step === 'choose' ? choosePassword : askForLink} noValidate>
        <div className="panel-body">
          {error && <p className="alert alert-danger" role="alert">{error}</p>}

          {step === 'request' && !sent && (
            <>
              <div className="form-group">
                <label htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  className="input"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send the reset link'}
              </button>
            </>
          )}

          {step === 'request' && sent && (
            <>
              <p className="alert alert-info">{sent}</p>
              <p className="small">
                The link works for one hour and can be used once. Check the spam folder if it does not arrive.
              </p>
              {devLink && (
                <p className="small muted">
                  Email is not configured on this server, so here is the link: <a href={devLink}>{devLink}</a>
                </p>
              )}
              <button className="btn btn-block" type="button" onClick={onBack}>Back to sign-in</button>
            </>
          )}

          {step === 'choose' && !changed && (
            <>
              <div className="form-group">
                <label htmlFor="reset-password">New password</label>
                <input
                  id="reset-password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <span className="form-hint">At least 8 characters.</span>
              </div>
              <div className="form-group">
                <label htmlFor="reset-confirm">Repeat the new password</label>
                <input
                  id="reset-confirm"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save the new password'}
              </button>
            </>
          )}

          {step === 'choose' && changed && (
            <>
              <p className="alert alert-success">Your password has been changed. Sign in with the new one.</p>
              <button className="btn btn-primary btn-block" type="button" onClick={onDone}>Go to sign-in</button>
            </>
          )}
        </div>
        <div className="panel-foot">
          <p className="small">
            <button type="button" className="btn-link" onClick={onBack}>Back to sign-in</button>
          </p>
          <p className="small muted">
            This page is for staff accounts. Learners sign in with a phone number and a PIN.
          </p>
        </div>
      </form>
    </div>
  );
}
