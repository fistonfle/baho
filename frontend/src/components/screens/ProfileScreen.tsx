import { useEffect, useState } from 'react';

import { isPin } from '../../lib/phone';
import { disablePush, enablePush, pushState, type PushState } from '../../lib/push';
import { pathProgress, type HealthProfile } from '../../lib/personalization';
import { api } from '../../services/api';
import type { Curriculum } from '../../types';
import { PageHeader, Panel, StatusBadge } from '../ui';

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  creator: 'Writer',
  specialist: 'Specialist',
  learner: 'Umunyeshuri'
};

// "Umwirondoro wanjye": who I am, how I'm doing, and what Baho knows about me.
export function ProfileScreen({
  userName,
  account,
  completedCount,
  totalLessons,
  streak,
  quizAverage,
  knowledgeScore,
  activePath,
  completedLessons,
  interests,
  healthProfile,
  onRename,
  onSaveEmail,
  onEditInterests,
  onEditHealthProfile,
  onClearHealthProfile,
  onViewPaths,
  onOpenStaffArea,
  onSignIn,
  onRegister,
  onSignOut,
  onHome
}: {
  userName: string;
  account: { name: string; email: string | null; phone?: string | null; role: string } | null;
  completedCount: number;
  totalLessons: number;
  streak: number;
  quizAverage: number | null;
  knowledgeScore: { first: number; latest: number; total: number } | null;
  activePath: Curriculum | null;
  completedLessons: number[];
  interests: string[];
  healthProfile: HealthProfile;
  onRename: (name: string) => void;
  onSaveEmail: (email: string) => Promise<string | null>;
  onEditInterests: () => void;
  onEditHealthProfile: () => void;
  onClearHealthProfile: () => void;
  onViewPaths: () => void;
  onOpenStaffArea: () => void;
  onSignIn: () => void;
  onRegister: () => void;
  onSignOut: () => void;
  onHome: () => void;
}) {
  const displayName = account?.name || userName || 'Umushyitsi';
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName);
  const progress = activePath ? pathProgress(activePath, completedLessons) : null;
  const answeredQuestions = Object.keys(healthProfile.answers).length;
  const hasHealthProfile = healthProfile.conditions.length > 0 || answeredQuestions > 0;
  const isStaff = ['admin', 'creator', 'specialist'].includes(account?.role ?? '');
  const isLearner = Boolean(account) && !isStaff;

  const saveName = () => {
    if (!nameDraft.trim()) return;
    onRename(nameDraft.trim());
    setEditingName(false);
  };

  // Changing your own PIN, so a learner who was given a temporary one by an
  // administrator can pick their own.
  const [changingPin, setChangingPin] = useState(false);
  const [pins, setPins] = useState({ current: '', next: '', repeat: '' });
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinDone, setPinDone] = useState(false);
  const digitsOnly = (value: string) => value.replace(/\D/g, '');

  const closePinForm = () => {
    setChangingPin(false);
    setPins({ current: '', next: '', repeat: '' });
    setPinError('');
  };

  const savePin = async () => {
    setPinError('');
    if (!isPin(pins.current)) {
      setPinError('Andika PIN usanzwe ukoresha.');
      return;
    }
    if (!isPin(pins.next)) {
      setPinError('PIN nshya igomba kuba imibare 4 kugeza kuri 6.');
      return;
    }
    if (pins.next !== pins.repeat) {
      setPinError('PIN nshya ebyiri ntizihura.');
      return;
    }
    if (pins.next === pins.current) {
      setPinError('PIN nshya igomba gutandukana n\'iya kera.');
      return;
    }
    setPinBusy(true);
    try {
      await api.changePassword({ current: pins.current, next: pins.next });
      setPinDone(true);
      closePinForm();
    } catch {
      setPinError('Ntibyakunze. Reba neza ko PIN usanzwe ukoresha ari yo.');
    } finally {
      setPinBusy(false);
    }
  };

  // An optional email address. Baho uses it to say that a reply to a question is
  // waiting, and to send the reminders the learner set. It can be removed at any
  // time. SMS is the channel most learners would actually read; this stands in
  // until that is available.
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(account?.email ?? '');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailDone, setEmailDone] = useState('');

  const saveEmail = async (value: string) => {
    setEmailError('');
    setEmailBusy(true);
    const failure = await onSaveEmail(value);
    setEmailBusy(false);
    if (failure) {
      setEmailError(failure);
      return;
    }
    setEmailDone(value ? 'Imeyili yawe yabitswe.' : 'Imeyili yawe yakuweho.');
    setEditingEmail(false);
  };

  // Notifications on this device. The answer depends on the phone and on what
  // the learner has already allowed, so it is read when the screen opens rather
  // than assumed.
  const [notifications, setNotifications] = useState<PushState>('unsupported');
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyError, setNotifyError] = useState('');

  useEffect(() => {
    if (!isLearner) return;
    void pushState().then(setNotifications);
  }, [isLearner]);

  const turnOnNotifications = async () => {
    setNotifyError('');
    setNotifyBusy(true);
    const failure = await enablePush();
    setNotifyBusy(false);
    if (!failure) {
      setNotifications('on');
      return;
    }
    if (failure === 'blocked') {
      setNotifications('blocked');
      return;
    }
    setNotifyError(failure === 'server'
      ? 'Ubu butumwa ntiburaboneka kuri seriveri.'
      : failure === 'unsupported'
        ? 'Iyi telefoni ntiyemera ubu butumwa.'
        : 'Ntibyakunze. Ongera ugerageze.');
  };

  const turnOffNotifications = async () => {
    setNotifyBusy(true);
    await disablePush();
    setNotifyBusy(false);
    setNotifications('off');
  };

  const pinField = (id: string, label: string, key: 'current' | 'next' | 'repeat') => (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input pin-input"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        autoComplete={key === 'current' ? 'current-password' : 'new-password'}
        value={pins[key]}
        onChange={(event) => setPins({ ...pins, [key]: digitsOnly(event.target.value) })}
      />
    </div>
  );

  return (
    <div className="container">
      <PageHeader
        crumbs={[{ label: 'Ahabanza', onClick: onHome }, { label: 'Umwirondoro wanjye' }]}
        title="Umwirondoro wanjye"
        actions={account ? (
          <>
            {isStaff && <button className="btn btn-primary" onClick={onOpenStaffArea}>Staff portal</button>}
            <button className="btn btn-secondary" onClick={onSignOut}>Sohoka</button>
          </>
        ) : (
          <>
            <button className="btn btn-primary" onClick={onRegister}>Fungura konti</button>
            <button className="btn btn-secondary" onClick={onSignIn}>Injira</button>
          </>
        )}
      />

      <div className="layout-main-aside">
        <div className="stack">
          <Panel title="Amakuru ya konti">
            <dl className="definition">
              <dt>Izina</dt>
              <dd>
                {editingName ? (
                  <form className="row" onSubmit={(event) => { event.preventDefault(); saveName(); }}>
                    <input className="input" style={{ width: 200 }} value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} aria-label="Izina ryawe" autoFocus />
                    <button className="btn btn-primary btn-sm" type="submit">Bika</button>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setEditingName(false); setNameDraft(userName); }}>Reka</button>
                  </form>
                ) : (
                  <>{displayName} {!account && <button className="btn-link small" onClick={() => setEditingName(true)}>Hindura</button>}</>
                )}
              </dd>
              {account?.phone && <><dt>Telefoni</dt><dd>{account.phone.replace(/^\+250(\d{3})(\d{3})(\d{3})$/, '0$1 $2 $3')}</dd></>}
              {account && (
                <>
                  <dt>Imeyili</dt>
                  <dd>
                    {account.email ?? 'Nta yo'}
                    {isLearner && !editingEmail && (
                      <button className="btn-link small" style={{ marginLeft: 8 }} onClick={() => { setEmailDone(''); setEmailDraft(account.email ?? ''); setEditingEmail(true); }}>
                        {account.email ? 'Hindura' : 'Ongeraho'}
                      </button>
                    )}
                  </dd>
                </>
              )}
              <dt>Uruhare</dt><dd><StatusBadge label={account ? roleLabels[account.role] ?? account.role : 'Umushyitsi'} tone={account ? 'success' : 'warning'} /></dd>
            </dl>
            {isLearner && (
              <div style={{ marginTop: 16 }}>
                {emailDone && <p className="alert alert-success small">{emailDone}</p>}
                {editingEmail ? (
                  <form className="stack-sm" onSubmit={(event) => { event.preventDefault(); void saveEmail(emailDraft.trim()); }}>
                    {emailError && <p className="alert alert-danger small">{emailError}</p>}
                    <div className="form-group">
                      <label htmlFor="profile-email">Imeyili (si itegeko)</label>
                      <input
                        id="profile-email"
                        className="input"
                        type="email"
                        autoComplete="email"
                        placeholder="izina@urugero.com"
                        value={emailDraft}
                        onChange={(event) => setEmailDraft(event.target.value)}
                      />
                    </div>
                    <div className="row">
                      <button className="btn btn-primary btn-sm" type="submit" disabled={emailBusy}>{emailBusy ? 'Birabikwa\u2026' : 'Bika'}</button>
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setEditingEmail(false); setEmailError(''); }}>Reka</button>
                      {account?.email && (
                        <button className="btn btn-danger btn-sm" type="button" disabled={emailBusy} onClick={() => void saveEmail('')}>Kuraho</button>
                      )}
                    </div>
                  </form>
                ) : (
                  <p className="small muted">
                    Niba utanze imeyili, Baho izakwandikira igihe ikibazo wabajije gisubijwe, kandi ikoherereze inyibutsa wiyandikiye.
                    Ubutumwa ku kibazo ntibukubiyemo amakuru y'ubuzima bwawe; inyibutsa yoherezwa n'amagambo wowe ubwawe wanditse.
                    Ushobora kuyikuraho igihe cyose. (Ubutumwa bwa SMS buzaza vuba.)
                  </p>
                )}
              </div>
            )}

            {account?.phone && (
              <div style={{ marginTop: 16 }}>
                {pinDone && <p className="alert alert-success small">PIN yawe yahindutse. Koresha iyo nshya ubutaha winjira.</p>}
                {changingPin ? (
                  <form className="stack-sm" onSubmit={(event) => { event.preventDefault(); void savePin(); }}>
                    {pinError && <p className="alert alert-danger small">{pinError}</p>}
                    {pinField('pin-current', 'PIN usanzwe ukoresha', 'current')}
                    {pinField('pin-next', 'PIN nshya', 'next')}
                    {pinField('pin-repeat', 'Ongera wandike PIN nshya', 'repeat')}
                    <div className="row">
                      <button className="btn btn-primary btn-sm" type="submit" disabled={pinBusy}>{pinBusy ? 'Birabikwa…' : 'Bika PIN nshya'}</button>
                      <button className="btn btn-secondary btn-sm" type="button" onClick={closePinForm}>Reka</button>
                    </div>
                  </form>
                ) : (
                  <button className="btn btn-sm" type="button" onClick={() => { setPinDone(false); setChangingPin(true); }}>Hindura PIN</button>
                )}
              </div>
            )}
            {!account && <p className="alert alert-info small" style={{ marginTop: 16 }}>Ukoresha Baho nk'umushyitsi: amakuru yawe abitswe kuri iyi telefoni gusa. Fungura konti kugira ngo aho ugeze n'amanota bibikwe, kandi ubashe kubaza inzobere.</p>}
          </Panel>

          <Panel title="Aho ngeze">
            <table className="table">
              <tbody>
                <tr><td>Amasomo warangije</td><td className="right"><strong>{completedCount} / {totalLessons}</strong></td></tr>
                <tr><td>Iminsi wiga ukurikiranya</td><td className="right"><strong>{streak}</strong></td></tr>
                <tr><td>Impuzandengo y'amasuzuma</td><td className="right"><strong>{quizAverage === null ? '–' : `${quizAverage}%`}</strong></td></tr>
                <tr><td>Isuzuma ry'ubumenyi (ubwa mbere → ubu)</td><td className="right"><strong>{knowledgeScore ? `${knowledgeScore.first}/${knowledgeScore.total} → ${knowledgeScore.latest}/${knowledgeScore.total}` : '–'}</strong></td></tr>
              </tbody>
            </table>
          </Panel>
        </div>

        <aside className="stack">
          <Panel title="Gahunda y'imyigire" actions={<button className="btn-link small" onClick={onViewPaths}>Hindura</button>}>
            {activePath && progress ? (
              <>
                <p><strong>{activePath.title}</strong></p>
                <div className="progress"><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
                <p className="small muted" style={{ marginTop: 6 }}>{progress.done} kuri {progress.total} warangije</p>
              </>
            ) : <p className="muted small">Nta gahunda urahitamo.</p>}
          </Panel>
          <Panel title="Ingingo nkurikirana" actions={<button className="btn-link small" onClick={onEditInterests}>Hindura</button>}>
            <p className="small">{interests.length ? interests.join(', ') : 'Nta ngingo wahisemo.'}</p>
          </Panel>
          {isLearner && (
            <Panel title="Kumenyeshwa">
              {notifications === 'on' ? (
                <>
                  <p className="small">Iyi telefoni irakumenyesha igihe ikibazo cyawe gisubijwe, kandi ikagufasha kwibuka ibyo wiyandikiye.</p>
                  <button className="btn btn-secondary btn-sm" disabled={notifyBusy} onClick={() => void turnOffNotifications()}>
                    {notifyBusy ? 'Tegereza\u2026' : 'Hagarika'}
                  </button>
                </>
              ) : notifications === 'blocked' ? (
                <p className="small muted">Wahagaritse ubu butumwa muri mushakisha yawe. Nubwemerera muri mushakisha, Baho izongera kukumenyesha.</p>
              ) : notifications === 'off' ? (
                <>
                  <p className="small">Baho ishobora kukumenyesha kuri iyi telefoni igihe ikibazo cyawe gisubijwe, no kukwibutsa ibyo wiyandikiye. Nta kintu cyerekeye ubuzima bwawe kiba muri ubwo butumwa.</p>
                  {notifyError && <p className="alert alert-danger small">{notifyError}</p>}
                  <button className="btn btn-primary btn-sm" disabled={notifyBusy} onClick={() => void turnOnNotifications()}>
                    {notifyBusy ? 'Tegereza\u2026' : 'Emera kumenyeshwa'}
                  </button>
                </>
              ) : (
                <p className="small muted">Iyi telefoni cyangwa iyi mushakisha ntiyemera ubutumwa bwa Baho. Kuri iPhone, banza wongere Baho ku rupapuro rwawe rw'imbere. Ushobora no gukoresha imeyili.</p>
              )}
            </Panel>
          )}
          <Panel title="Umwirondoro w'ubuzima">
            <p className="small muted">Bibitswe kuri iyi telefoni gusa, bihishwe. Ntibyoherezwa kuri seriveri, nubwo waba ufite konti.</p>
            {hasHealthProfile ? (
              <>
                <p className="small">Indwara: {healthProfile.conditions.length ? healthProfile.conditions.join(', ') : 'Nta na imwe'}<br />Ibibazo byasubijwe: {answeredQuestions} kuri 6</p>
                <div className="row">
                  <button className="btn btn-secondary btn-sm" onClick={onEditHealthProfile}>Hindura</button>
                  <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm('Gusiba umwirondoro w\'ubuzima kuri iyi telefoni?')) onClearHealthProfile(); }}>Siba</button>
                </div>
              </>
            ) : <button className="btn btn-primary btn-sm" onClick={onEditHealthProfile}>Uzuza umwirondoro</button>}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
