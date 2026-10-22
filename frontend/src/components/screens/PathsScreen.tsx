import { pathProgress } from '../../lib/personalization';
import type { Curriculum } from '../../types';
import { Empty, PageHeader, Panel } from '../ui';

export function PathsScreen({
  curricula,
  recommendedSlugs,
  activeSlug,
  completedLessons,
  onChoose,
  onEditProfile,
  onHome
}: {
  curricula: Curriculum[];
  recommendedSlugs: string[];
  activeSlug: string | null;
  completedLessons: number[];
  onChoose: (slug: string) => void;
  onEditProfile: () => void;
  onHome: () => void;
}) {
  return (
    <div className="container">
      <PageHeader
        crumbs={[{ label: 'Ahabanza', onClick: onHome }, { label: 'Inzira z\'imyigire' }]}
        title="Inzira z'imyigire"
        lead="Buri nzira ni urutonde rw'amasomo ateguwe ku ndwara runaka. Izagutoranyirijwe zishingiye ku mwirondoro wawe w'ubuzima."
        actions={<button className="btn btn-secondary" onClick={onEditProfile}>Hindura umwirondoro</button>}
      />
      <Panel flush>
        {curricula.length === 0 ? <Empty>Inzira z'imyigire zizagaragara internet nigaruka.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Inzira</th><th>Indwara</th><th>Aho ugeze</th><th className="right">Igikorwa</th></tr>
              </thead>
              <tbody>
                {curricula.map((curriculum) => {
                  const { done, total } = pathProgress(curriculum, completedLessons);
                  const active = curriculum.slug === activeSlug;
                  return (
                    <tr key={curriculum.id}>
                      <td>
                        <strong>{curriculum.title}</strong>
                        <div className="small muted">{curriculum.description}</div>
                        <div className="row" style={{ marginTop: 4 }}>
                          {recommendedSlugs.includes(curriculum.slug) && <span className="badge badge-info">Byagutoranyirijwe</span>}
                          {active && <span className="badge badge-success">Uri kuyiga</span>}
                        </div>
                      </td>
                      <td>{curriculum.condition ?? 'Kwirinda muri rusange'}</td>
                      <td style={{ minWidth: 140 }}>
                        <div className="small">{done} kuri {total}</div>
                        <div className="progress"><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
                      </td>
                      <td className="right">
                        <button className={`btn btn-sm ${active ? 'btn-secondary' : 'btn-primary'}`} onClick={() => onChoose(curriculum.slug)}>
                          {active ? 'Komeza' : 'Hitamo'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
