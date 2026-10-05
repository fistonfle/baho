import { useState } from 'react';

import { pathProgress, type HealthProfile } from '../../lib/personalization';
import type { Curriculum } from '../../types';

const roleLabels: Record<string, string> = {
  admin: 'Umuyobozi',
  creator: 'Umwanditsi',
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
  onEditInterests,
  onEditHealthProfile,
  onClearHealthProfile,
  onViewPaths,
  onOpenStaffArea,
  onSignIn,
  onRegister,
  onSignOut
}: {
  userName: string;
  account: { name: string; email: string; role: string } | null;
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
  onEditInterests: () => void;
  onEditHealthProfile: () => void;
  onClearHealthProfile: () => void;
  onViewPaths: () => void;
  onOpenStaffArea: () => void;
  onSignIn: () => void;
  onRegister: () => void;
  onSignOut: () => void;
}) {
  const displayName = account?.name || userName || 'Umushyitsi';
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName);
  const progress = activePath ? pathProgress(activePath, completedLessons) : null;
  const answeredQuestions = Object.keys(healthProfile.answers).length;
  const hasHealthProfile = healthProfile.conditions.length > 0 || answeredQuestions > 0;
  const isStaff = account?.role === 'admin' || account?.role === 'creator';

  const saveName = () => {
    if (!nameDraft.trim()) return;
    onRename(nameDraft.trim());
    setEditingName(false);
  };

  return (
    <div className="screen dynamic-screen profile-screen">
      <section className="panel-section profile-header">
        <span className="profile-avatar" aria-hidden="true">{displayName.trim().charAt(0).toUpperCase()}</span>
        <div className="profile-identity">
          <p className="eyebrow">Umwirondoro wanjye</p>
          {editingName ? (
            <form className="profile-name-form" onSubmit={(event) => { event.preventDefault(); saveName(); }}>
              <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} aria-label="Izina ryawe" autoFocus />
              <button className="primary" type="submit">Bika</button>
              <button className="secondary" type="button" onClick={() => { setEditingName(false); setNameDraft(userName); }}>Reka</button>
            </form>
          ) : (
            <h2>
              {displayName}
              {!account && <button className="inline-link profile-edit-name" onClick={() => setEditingName(true)}>Hindura izina</button>}
            </h2>
          )}
          {account ? (
            <p className="profile-meta">
              <span>{account.email}</span>
              <span className={`status-pill ${account.role === 'learner' ? '' : 'success'}`}>{roleLabels[account.role] ?? account.role}</span>
            </p>
          ) : (
            <p className="profile-meta"><span className="status-pill warning">Umushyitsi</span> Amakuru yawe abitswe kuri iyi telefoni gusa.</p>
          )}
        </div>
        <div className="profile-actions">
          {account ? (
            <>
              {isStaff && <button className="primary" onClick={onOpenStaffArea}>Ubuyobozi</button>}
              <button className="secondary" onClick={onSignOut}>Sohoka</button>
            </>
          ) : (
            <>
              <button className="primary" onClick={onRegister}>Fungura konti</button>
              <button className="secondary" onClick={onSignIn}>Injira</button>
            </>
          )}
        </div>
      </section>

      {!account && (
        <p className="profile-guest-note">
          Fungura konti kugira ngo aho ugeze, amanota n'ibyibutsa bibikwe neza kandi ubashe kubaza inzobere z'ubuzima.
        </p>
      )}

      <section className="profile-stats" aria-label="Uko uhagaze">
        <article><span>Amasomo warangije</span><strong>{completedCount}<small> / {totalLessons}</small></strong></article>
        <article><span>Iminsi ukurikiranya</span><strong>{streak} 🔥</strong></article>
        <article><span>Amanota y'amasuzuma</span><strong>{quizAverage === null ? '–' : `${quizAverage}%`}</strong></article>
        <article>
          <span>Isuzuma ry'ubumenyi</span>
          <strong>{knowledgeScore ? `${knowledgeScore.latest}/${knowledgeScore.total}` : '–'}</strong>
          {knowledgeScore && <small>Ubwa mbere: {knowledgeScore.first}/{knowledgeScore.total}</small>}
        </article>
      </section>

      <div className="profile-columns">
        <section className="panel-section">
          <h3>Inzira yanjye y'imyigire</h3>
          {activePath && progress ? (
            <>
              <p className="profile-path-title">{activePath.title}</p>
              <div className="progress-bar"><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
              <p className="form-hint">{progress.done} kuri {progress.total} warangije</p>
            </>
          ) : (
            <p className="text-muted">Nta nzira urahitamo.</p>
          )}
          <button className="secondary" onClick={onViewPaths}>Hindura inzira</button>

          <h3 className="subheading">Ingingo nkurikirana</h3>
          <div className="chip-row">
            {interests.length ? interests.map((interest) => <span key={interest} className="mini-chip">{interest}</span>) : <span className="text-muted">Nta ngingo wahisemo.</span>}
          </div>
          <button className="secondary profile-section-button" onClick={onEditInterests}>Hindura ingingo</button>
        </section>

        <section className="panel-section">
          <h3>Umwirondoro w'ubuzima</h3>
          <div className="privacy-note">
            <span aria-hidden="true">🔒</span>
            <p>Bibitswe kuri iyi telefoni gusa, birinzwe. Ntibyoherezwa kuri seriveri ya Baho, nubwo waba ufite konti.</p>
          </div>
          {hasHealthProfile ? (
            <>
              <p className="form-hint">Indwara muganga yakubwiye:</p>
              <div className="chip-row">
                {healthProfile.conditions.length
                  ? healthProfile.conditions.map((condition) => <span key={condition} className="mini-chip">{condition}</span>)
                  : <span className="mini-chip">Nta na imwe</span>}
              </div>
              <p className="form-hint">Ibibazo ku mibereho: {answeredQuestions} kuri 6 byasubijwe.</p>
              <div className="profile-button-row">
                <button className="secondary" onClick={onEditHealthProfile}>Hindura</button>
                <button className="small-button" onClick={() => { if (window.confirm('Gusiba umwirondoro w\'ubuzima kuri iyi telefoni?')) onClearHealthProfile(); }}>Siba</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted">Ntabwo uruzuza umwirondoro w'ubuzima.</p>
              <button className="primary" onClick={onEditHealthProfile}>Uzuza umwirondoro</button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
