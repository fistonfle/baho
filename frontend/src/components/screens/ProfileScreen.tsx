import { useState } from 'react';

import { pathProgress, type HealthProfile } from '../../lib/personalization';
import type { Curriculum } from '../../types';
import { PageHeader, Panel, StatusBadge } from '../ui';

const roleLabels: Record<string, string> = {
  admin: 'Umuyobozi',
  creator: 'Umwanditsi',
  specialist: 'Inzobere',
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
  onSignOut,
  onHome
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
  onHome: () => void;
}) {
  const displayName = account?.name || userName || 'Umushyitsi';
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName);
  const progress = activePath ? pathProgress(activePath, completedLessons) : null;
  const answeredQuestions = Object.keys(healthProfile.answers).length;
  const hasHealthProfile = healthProfile.conditions.length > 0 || answeredQuestions > 0;
  const isStaff = ['admin', 'creator', 'specialist'].includes(account?.role ?? '');

  const saveName = () => {
    if (!nameDraft.trim()) return;
    onRename(nameDraft.trim());
    setEditingName(false);
  };

  return (
    <div className="container">
      <PageHeader
        crumbs={[{ label: 'Ahabanza', onClick: onHome }, { label: 'Umwirondoro wanjye' }]}
        title="Umwirondoro wanjye"
        actions={account ? (
          <>
            {isStaff && <button className="btn btn-primary" onClick={onOpenStaffArea}>Ubuyobozi</button>}
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
              <dt>Imeyili</dt><dd>{account?.email ?? '–'}</dd>
              <dt>Uruhare</dt><dd><StatusBadge label={account ? roleLabels[account.role] ?? account.role : 'Umushyitsi'} tone={account ? 'success' : 'warning'} /></dd>
            </dl>
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
          <Panel title="Inzira y'imyigire" actions={<button className="btn-link small" onClick={onViewPaths}>Hindura</button>}>
            {activePath && progress ? (
              <>
                <p><strong>{activePath.title}</strong></p>
                <div className="progress"><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
                <p className="small muted" style={{ marginTop: 6 }}>{progress.done} kuri {progress.total} warangije</p>
              </>
            ) : <p className="muted small">Nta nzira urahitamo.</p>}
          </Panel>
          <Panel title="Ingingo nkurikirana" actions={<button className="btn-link small" onClick={onEditInterests}>Hindura</button>}>
            <p className="small">{interests.length ? interests.join(', ') : 'Nta ngingo wahisemo.'}</p>
          </Panel>
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
