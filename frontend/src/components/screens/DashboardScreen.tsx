import type { Lesson, Interest } from '../../types';

export function DashboardScreen({
  userName,
  selectedInterests,
  lessons,
  progressPercent,
  isOnline,
  isStaff,
  healthTip,
  onViewLibrary,
  onViewNcd,
  onViewReminders,
  onViewExercise,
  onViewFaq,
  onViewAdmin,
  onSelectLesson,
  onViewDashboard
}: {
  userName: string;
  selectedInterests: Interest[];
  lessons: Lesson[];
  progressPercent: number;
  isOnline: boolean;
  isStaff: boolean;
  healthTip: string;
  onViewLibrary: () => void;
  onViewNcd: () => void;
  onViewReminders: () => void;
  onViewExercise: () => void;
  onViewFaq: () => void;
  onViewAdmin: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  onViewDashboard: () => void;
}) {
  const featuredLesson = lessons[0];

  return (
    <div className="screen dashboard-screen">
      <header className="dashboard-header">
        <button className="brand-mark dashboard-brand" onClick={onViewDashboard} aria-label="Baho ahabanza">
          <span className="brand-symbol" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M16 27s-10-6.1-10-13.1A5.9 5.9 0 0 1 16 10a5.9 5.9 0 0 1 10 3.9C26 20.9 16 27 16 27Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M8.5 16h4l2-4 3.1 8 2.1-4h3.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>BAHO<span className="brand-period">.</span></span>
        </button>
        <nav className="dashboard-nav" aria-label="Ibyiciro bya Baho">
          <button className="dashboard-nav-item active" onClick={onViewDashboard}>Ahabanza</button>
          <button className="dashboard-nav-item" onClick={onViewLibrary}>Amasomo</button>
          <button className="dashboard-nav-item" onClick={onViewNcd}>Indwara</button>
          <button className="dashboard-nav-item" onClick={onViewExercise}>Imyitozo</button>
          <button className="dashboard-nav-item" onClick={onViewReminders}>Ibyibutsa</button>
        </nav>
        <div className="dashboard-account">
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Kuri internet' : 'Nta internet'} />
          <span className="account-greeting">{userName || 'Umunyeshuri'}</span>
          <span className="account-avatar" aria-hidden="true">{(userName || 'B').trim().charAt(0).toUpperCase()}</span>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <p className="eyebrow">IKIGO CYAWE CY'UBUZIMA</p>
            <h1>Muraho, {userName || 'munyeshuri'}.</h1>
            <p>Witeguye kwiga ikintu gishya ku buzima bwawe uyu munsi?</p>
          </div>
          <span className={`connection-label ${isOnline ? 'online' : 'offline'}`}>
            <span /> {isOnline ? 'Kuri internet' : 'Nturi kuri internet'}
          </span>
        </section>

        <section className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <span className="dashboard-hero-kicker"><span /> ISOMO RIKURIKIRA</span>
            {featuredLesson ? <>
              <h2>{featuredLesson.title}</h2>
              <p>{featuredLesson.summary}</p>
              <button className="dashboard-hero-button" onClick={() => { onSelectLesson(featuredLesson); onViewLibrary(); }}>
                Tangira kwiga <span aria-hidden="true">→</span>
              </button>
            </> : <>
              <h2>Amasomo arategurwa</h2>
              <p>Garuka vuba urebe amakuru mashya y'ubuzima.</p>
            </>}
          </div>
          <div className="dashboard-hero-art" aria-hidden="true">
            <span className="hero-art-ring ring-one" />
            <span className="hero-art-ring ring-two" />
            <span className="hero-art-cross">+</span>
            <svg viewBox="0 0 220 180" fill="none">
              <path d="M110 152S34 107 34 64C34 24 83 15 110 55c27-40 76-31 76 9 0 43-76 88-76 88Z" fill="#E3F5EE" stroke="#27836B" strokeWidth="3" />
              <path d="M53 83h31l12-27 22 59 15-32h34" stroke="#197C68" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hero-art-label">Amakuru yizewe</span>
          </div>
        </section>

        <section className="dashboard-stats" aria-label="Imibare y'amasomo yawe">
          <article className="dashboard-stat progress-stat">
            <span className="stat-icon stat-icon-green" aria-hidden="true">↗</span>
            <div className="stat-content">
              <span className="stat-label">Iterambere ryawe</span>
              <strong>{progressPercent}%</strong>
              <div className="progress-bar"><span style={{ width: `${progressPercent}%` }} /></div>
              <small>Amasomo warangije</small>
            </div>
          </article>
          <article className="dashboard-stat interest-stat">
            <span className="stat-icon stat-icon-gold" aria-hidden="true">+</span>
            <div className="stat-content">
              <span className="stat-label">Ibyo ukurikirana</span>
              <strong>{selectedInterests.length} <small>ingingo</small></strong>
              <div className="chip-row">
                {selectedInterests.slice(0, 3).map((item) => <span key={item} className="mini-chip">{item}</span>)}
              </div>
            </div>
          </article>
          <article className="dashboard-stat tip-stat">
            <span className="stat-icon stat-icon-blue" aria-hidden="true">i</span>
            <div className="stat-content">
              <span className="stat-label">Inama y'uyu munsi</span>
              <p>{healthTip}</p>
            </div>
          </article>
        </section>

        <section className="dashboard-lessons">
          <div className="section-heading">
            <div><p className="eyebrow">KUBERA WEE</p><h2>Amasomo agufasha gukura</h2></div>
            <button className="text-link" onClick={onViewLibrary}>Reba amasomo yose <span aria-hidden="true">→</span></button>
          </div>
          <div className="dashboard-lesson-grid">
            {lessons.slice(0, 3).map((lesson, index) => (
              <article className={`dashboard-lesson-card lesson-card-${index + 1}`} key={lesson.id}>
                <div className="lesson-card-top"><span className="lesson-category">{lesson.category}</span><span className="lesson-duration">{lesson.duration}</span></div>
                <h3>{lesson.title}</h3>
                <p>{lesson.summary}</p>
                <button className="lesson-card-link" onClick={() => { onSelectLesson(lesson); onViewLibrary(); }}>Fungura isomo <span aria-hidden="true">→</span></button>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-bottom-row">
          <button className="dashboard-help-card" onClick={onViewFaq}>
            <span className="help-icon" aria-hidden="true">?</span>
            <span><strong>Ukeneye ubufasha?</strong><small>Reba ibisubizo cyangwa utange ikibazo.</small></span>
            <span className="help-arrow" aria-hidden="true">→</span>
          </button>
          {isStaff && <button className="dashboard-staff-link" onClick={onViewAdmin}>Fungura ubuyobozi →</button>}
        </section>
      </main>

      <footer className="dashboard-footer"><span>BAHO<span className="brand-period">.</span></span><span>Wige neza. Wite ku buzima bwawe.</span></footer>
    </div>
  );
}
