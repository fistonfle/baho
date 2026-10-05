import { getWeek } from '../../lib/activity';
import { pathProgress, type RankedLesson } from '../../lib/personalization';
import type { Curriculum, Interest, Lesson } from '../../types';

export function DashboardScreen({
  userName,
  selectedInterests,
  rankedLessons,
  lessons,
  activePath,
  completedLessons,
  quizAverage,
  completedCount,
  totalLessons,
  streak,
  hasRiskCheck,
  riskTags,
  knowledgeScore,
  healthTip,
  onOpenLesson,
  onViewPaths,
  onViewLibrary,
  onViewRiskCheck,
  onViewCheckup,
  onViewFaq,
  onEditInterests
}: {
  userName: string;
  selectedInterests: Interest[];
  rankedLessons: RankedLesson[];
  lessons: Lesson[];
  activePath: Curriculum | null;
  completedLessons: number[];
  quizAverage: number | null;
  completedCount: number;
  totalLessons: number;
  streak: number;
  hasRiskCheck: boolean;
  riskTags: Interest[];
  knowledgeScore: { first: number; latest: number; total: number } | null;
  healthTip: string;
  onOpenLesson: (lesson: Lesson) => void;
  onViewPaths: () => void;
  onViewLibrary: () => void;
  onViewRiskCheck: () => void;
  onViewCheckup: () => void;
  onViewFaq: () => void;
  onEditInterests: () => void;
}) {
  const pathLessons = activePath
    ? activePath.lessonIds.map((id) => lessons.find((lesson) => lesson.id === id)).filter((lesson): lesson is Lesson => Boolean(lesson))
    : [];
  const progressInPath = activePath ? pathProgress(activePath, completedLessons) : null;
  const pathNext = pathLessons.find((lesson) => lesson.id === progressInPath?.nextId) ?? null;
  const nextLesson = pathNext ?? rankedLessons.find((item) => !item.reasons.includes('Warirangije'))?.lesson ?? rankedLessons[0]?.lesson;
  // Lessons already in the path are shown there, so the "for you" list adds new ones.
  const forYou = rankedLessons.filter((item) => !activePath?.lessonIds.includes(item.lesson.id)).slice(0, 3);
  const progressPercent = Math.round((completedCount / Math.max(totalLessons, 1)) * 100);
  const week = getWeek();

  return (
    <div className="screen dashboard-screen">
      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <p className="eyebrow">IKIGO CYAWE CY'UBUZIMA</p>
            <h1>Muraho, {userName || 'nshuti'}.</h1>
            <p>Witeguye kwiga ikintu gishya ku buzima bwawe uyu munsi?</p>
          </div>
        </section>

        {activePath && progressInPath ? (
          <section className="path-hero">
            <div className="path-hero-main">
              <span className="dashboard-hero-kicker"><span /> INZIRA YAWE</span>
              <h2>{activePath.title}</h2>
              <p>{progressInPath.done === progressInPath.total
                ? 'Warangije iyi nzira yose. Ni byiza cyane!'
                : `Isomo rya ${progressInPath.done + 1} kuri ${progressInPath.total}`}</p>
              <div className="path-hero-bar"><span style={{ width: `${(progressInPath.done / Math.max(progressInPath.total, 1)) * 100}%` }} /></div>
              <div className="path-hero-actions">
                {nextLesson && (
                  <button className="dashboard-hero-button" onClick={() => onOpenLesson(nextLesson)}>
                    ▶ {pathNext ? 'Komeza' : 'Umva isomo'}: {nextLesson.title}
                  </button>
                )}
                <button className="path-change" onClick={onViewPaths}>Hindura inzira</button>
              </div>
            </div>
            <ol className="path-steps">
              {pathLessons.map((lesson, index) => {
                const done = completedLessons.includes(lesson.id);
                const current = lesson.id === progressInPath.nextId;
                return (
                  <li key={lesson.id} className={done ? 'done' : current ? 'current' : ''}>
                    <button onClick={() => onOpenLesson(lesson)}>
                      <span className="path-step-mark">{done ? '✓' : index + 1}</span>
                      <span className="path-step-title">{lesson.title}</span>
                      {current && <span className="path-step-next">Ubu</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : (
          <section className="dashboard-hero">
            <div className="dashboard-hero-copy">
              <span className="dashboard-hero-kicker"><span /> ISOMO RIKURIKIRA</span>
              {nextLesson ? <>
                <h2>{nextLesson.title}</h2>
                <p>{nextLesson.summary}</p>
                <button className="dashboard-hero-button" onClick={() => onOpenLesson(nextLesson)}>▶ Umva isomo</button>
              </> : <>
                <h2>Amasomo arategurwa</h2>
                <p>Garuka vuba urebe amakuru mashya y'ubuzima.</p>
              </>}
            </div>
          </section>
        )}

        <section className="dashboard-stats" aria-label="Uko uhagaze">
          <article className="dashboard-stat progress-stat">
            <span className="stat-icon stat-icon-green" aria-hidden="true">↗</span>
            <div className="stat-content">
              <span className="stat-label">Amasomo warangije</span>
              <strong>{completedCount}<small> / {totalLessons}</small></strong>
              <div className="progress-bar"><span style={{ width: `${progressPercent}%` }} /></div>
              <small>{progressPercent}% by'amasomo yose</small>
            </div>
          </article>
          <article className="dashboard-stat streak-stat">
            <span className="stat-icon stat-icon-gold" aria-hidden="true">🔥</span>
            <div className="stat-content">
              <span className="stat-label">Iminsi wiga ukurikiranya</span>
              <strong>{streak} <small>{streak === 1 ? 'umunsi' : 'iminsi'}</small></strong>
              <div className="week-row" aria-label="Iminsi 7 ishize">
                {week.map((day, index) => (
                  <span key={index} className={day.active ? 'active' : ''} title={day.label}>{day.label}</span>
                ))}
              </div>
            </div>
          </article>
          <article className="dashboard-stat quiz-stat">
            <span className="stat-icon stat-icon-blue" aria-hidden="true">✓</span>
            <div className="stat-content">
              <span className="stat-label">Amanota y'amasuzuma</span>
              <strong>{quizAverage === null ? '–' : `${quizAverage}%`}</strong>
              <small>{quizAverage === null ? 'Kora isuzuma nyuma y\'isomo' : 'Impuzandengo y\'amanota yawe meza'}</small>
            </div>
          </article>
        </section>

        <section className="dashboard-actions-row">
          <button className="action-card risk-card" onClick={onViewRiskCheck}>
            <span className="action-card-icon" aria-hidden="true">🩺</span>
            <span>
              <strong>{hasRiskCheck ? 'Umwirondoro w\'ubuzima' : 'Uzuza umwirondoro w\'ubuzima'}</strong>
              <small>{hasRiskCheck
                ? (riskTags.length ? `Twibanda kuri: ${riskTags.slice(0, 2).join(', ')}` : 'Nta byago bikomeye byagaragaye')
                : 'Bidufasha kuguhitiramo inzira y\'imyigire'}</small>
            </span>
            <span className="help-arrow" aria-hidden="true">→</span>
          </button>
          <button className="action-card quiz-card" onClick={onViewCheckup}>
            <span className="action-card-icon" aria-hidden="true">✓</span>
            <span>
              <strong>Gerageza ubumenyi bwawe</strong>
              <small>{knowledgeScore
                ? `Ubwa mbere: ${knowledgeScore.first}/${knowledgeScore.total} · Ubu: ${knowledgeScore.latest}/${knowledgeScore.total}`
                : 'Ibibazo 5 ku ndwara zitandura'}</small>
            </span>
            <span className="help-arrow" aria-hidden="true">→</span>
          </button>
        </section>

        <section className="dashboard-lessons">
          <div className="section-heading">
            <div><p className="eyebrow">BYAGUTEGURIWE</p><h2>{activePath ? 'Andi masomo akubereye' : 'Amasomo akubereye'}</h2></div>
            <button className="text-link" onClick={onViewLibrary}>Reba amasomo yose <span aria-hidden="true">→</span></button>
          </div>
          <p className="for-you-explainer">
            Dushingiye ku ngingo wahisemo
            {selectedInterests.length > 0 && <> ({selectedInterests.slice(0, 3).join(', ')}{selectedInterests.length > 3 ? '…' : ''})</>}
            {hasRiskCheck && ' n\'isuzuma ryawe'}. <button className="inline-link" onClick={onEditInterests}>Hindura</button>
          </p>
          <div className="dashboard-lesson-grid">
            {forYou.map(({ lesson, reasons }, index) => (
              <article className={`dashboard-lesson-card lesson-card-${index + 1}`} key={lesson.id}>
                <div className="lesson-card-top"><span className="lesson-category">{lesson.category}</span><span className="lesson-duration">🎧 {lesson.duration}</span></div>
                <h3>{lesson.title}</h3>
                <p>{lesson.summary}</p>
                {reasons.length > 0 && (
                  <div className="reason-row">
                    {reasons.map((reason) => <span key={reason} className={`reason-chip ${reason === 'Warirangije' ? 'done' : ''}`}>{reason === 'Warirangije' ? '✓ ' : ''}{reason}</span>)}
                  </div>
                )}
                <button className="lesson-card-link" onClick={() => onOpenLesson(lesson)}>Fungura isomo <span aria-hidden="true">→</span></button>
              </article>
            ))}
          </div>
        </section>

        <p className="tip-banner"><span aria-hidden="true">💡</span> <strong>Inama y'uyu munsi:</strong> {healthTip}</p>

        <section className="dashboard-bottom-row">
          <button className="dashboard-help-card" onClick={onViewFaq}>
            <span className="help-icon" aria-hidden="true">?</span>
            <span><strong>Ukeneye ubufasha?</strong><small>Reba ibisubizo cyangwa utange ikibazo.</small></span>
            <span className="help-arrow" aria-hidden="true">→</span>
          </button>
        </section>
      </main>

      <footer className="dashboard-footer"><span>BAHO<span className="brand-period">.</span></span><span>Wige neza. Wite ku buzima bwawe.</span></footer>
    </div>
  );
}
