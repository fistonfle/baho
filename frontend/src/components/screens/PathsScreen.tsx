import { pathProgress } from '../../lib/personalization';
import type { Curriculum } from '../../types';

export function PathsScreen({
  curricula,
  recommendedSlugs,
  activeSlug,
  completedLessons,
  onChoose,
  onEditProfile
}: {
  curricula: Curriculum[];
  recommendedSlugs: string[];
  activeSlug: string | null;
  completedLessons: number[];
  onChoose: (slug: string) => void;
  onEditProfile: () => void;
}) {
  return (
    <div className="screen dynamic-screen paths-screen">
      <div className="panel-section">
        <p className="eyebrow">Inzira z'imyigire</p>
        <h2>Hitamo inzira yawe</h2>
        <p className="screen-intro">
          Buri nzira ni urutonde rw'amasomo ateguwe ku ndwara runaka. Izo twagutoranyirije zishingiye ku mwirondoro wawe w'ubuzima.{' '}
          <button className="inline-link" onClick={onEditProfile}>Hindura umwirondoro</button>
        </p>
        {curricula.length === 0 && <p className="text-muted">Inzira z'imyigire zizagaragara internet nigaruka.</p>}
        <div className="path-grid">
          {curricula.map((curriculum) => {
            const { done, total } = pathProgress(curriculum, completedLessons);
            const active = curriculum.slug === activeSlug;
            return (
              <article key={curriculum.id} className={`path-card ${active ? 'active' : ''}`}>
                {curriculum.imageUrl && <img src={curriculum.imageUrl} alt="" className="path-card-image" />}
                <div className="path-card-body">
                  <div className="path-card-tags">
                    {recommendedSlugs.includes(curriculum.slug) && <span className="reason-chip">Byagutoranyirijwe</span>}
                    {active && <span className="reason-chip done">Uri kuyiga</span>}
                  </div>
                  <h3>{curriculum.title}</h3>
                  <p>{curriculum.description}</p>
                  <div className="progress-bar"><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
                  <small>{done} kuri {total} warangije</small>
                  <button className={active ? 'secondary' : 'primary'} onClick={() => onChoose(curriculum.slug)}>
                    {active ? 'Komeza iyi nzira' : 'Hitamo iyi nzira'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
