import { getWeek } from '../../lib/activity';
import { pathProgress, type RankedLesson } from '../../lib/personalization';
import type { Curriculum, Lesson } from '../../types';
import { Duration, PageHeader, Panel } from '../ui';

export function DashboardScreen({
  userName,
  rankedLessons,
  lessons,
  activePath,
  completedLessons,
  quizAverage,
  completedCount,
  totalLessons,
  streak,
  hasRiskCheck,
  knowledgeScore,
  healthTip,
  onOpenLesson,
  onViewPaths,
  onViewLibrary,
  onViewFaq
}: {
  userName: string;
  rankedLessons: RankedLesson[];
  lessons: Lesson[];
  activePath: Curriculum | null;
  completedLessons: number[];
  quizAverage: number | null;
  completedCount: number;
  totalLessons: number;
  streak: number;
  hasRiskCheck: boolean;
  knowledgeScore: { first: number; latest: number; total: number } | null;
  healthTip: string;
  onOpenLesson: (lesson: Lesson) => void;
  onViewPaths: () => void;
  onViewLibrary: () => void;
  onViewFaq: () => void;
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

  const activeDays = week.filter((day) => day.active).length;
  // A new learner has nothing to count yet: show the programme first, the numbers later.
  const hasProgress = completedCount > 0 || streak > 0 || quizAverage !== null || Boolean(knowledgeScore);

  return (
    <div className="container">
      <PageHeader
        crumbs={[{ label: 'Ahabanza' }]}
        title={`Muraho, ${userName || 'nshuti'}`}
        lead="Aha ni ho ubona gahunda yawe y'imyigire, aho ugeze n'amasomo akubereye."
      />

      {hasProgress && <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-label">Amasomo warangije</div>
          <div className="stat-value">{completedCount} <small>kuri {totalLessons}</small></div>
          <div className="progress"><span style={{ width: `${progressPercent}%` }} /></div>
        </div>
        <div className="stat">
          <div className="stat-label">Iminsi wiga ukurikiranya</div>
          <div className="stat-value">{streak} <small>{streak === 1 ? 'umunsi' : 'iminsi'}</small></div>
          <div className="small muted">Wize iminsi {activeDays} mu minsi 7 ishize</div>
        </div>
        <div className="stat">
          <div className="stat-label">Impuzandengo y'amasuzuma</div>
          <div className="stat-value">{quizAverage === null ? '–' : `${quizAverage}%`}</div>
          <div className="small muted">Amanota kuri buri somo</div>
        </div>
        <div className="stat">
          <div className="stat-label">Isuzuma ry'ubumenyi</div>
          <div className="stat-value">{knowledgeScore ? <>{knowledgeScore.latest}<small> / {knowledgeScore.total}</small></> : '–'}</div>
          <div className="small muted">{knowledgeScore ? `Ubwa mbere: ${knowledgeScore.first}/${knowledgeScore.total}` : 'Ntiwararikora'}</div>
        </div>
      </div>}

      <div className="layout-main-aside">
        <div className="stack">
          {activePath && progressInPath ? (
            <Panel
              title={activePath.title}
              description={progressInPath.done === progressInPath.total ? 'Warangije iyi gahunda yose.' : `Isomo rya ${progressInPath.done + 1} kuri ${progressInPath.total}`}
              actions={<button className="btn btn-secondary btn-sm" onClick={onViewPaths}>Hindura gahunda</button>}
              flush
              footer={nextLesson && (
                <div className="row-between">
                  <span className="small muted">Isomo rikurikira: <strong>{nextLesson.title}</strong></span>
                  <button className="btn btn-primary" onClick={() => onOpenLesson(nextLesson)}>{pathNext ? 'Komeza kwiga' : 'Fungura isomo'}</button>
                </div>
              )}
            >
              <ol className="list path-list">
                {pathLessons.map((lesson, index) => {
                  const done = completedLessons.includes(lesson.id);
                  const current = lesson.id === progressInPath.nextId;
                  return (
                    <li key={lesson.id}>
                      <button className={`list-button ${current ? 'current' : ''}`} onClick={() => onOpenLesson(lesson)}>
                        <span className={`step-no ${done ? 'done' : current ? 'next' : ''}`}>{done ? '✓' : index + 1}</span>
                        <span className="grow">
                          <strong>{lesson.title}</strong>
                          <span className="meta">
                            <span className="tag">{lesson.category}</span>
                            <Duration value={lesson.duration} />
                          </span>
                        </span>
                        {done && <span className="badge badge-success">Warirangije</span>}
                        {current && <span className="badge badge-info">Isomo rikurikira</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          ) : (
            <Panel title="Isomo rikurikira">
              {nextLesson ? (
                <div className="row-between">
                  <div><strong>{nextLesson.title}</strong><p className="muted small">{nextLesson.summary}</p></div>
                  <button className="btn btn-primary" onClick={() => onOpenLesson(nextLesson)}>Fungura isomo</button>
                </div>
              ) : <p className="muted">Amasomo arategurwa.</p>}
            </Panel>
          )}

          <Panel
            title={activePath ? 'Andi masomo akubereye' : 'Amasomo akubereye'}
            description={`Ashingiye ku ngingo wahisemo${hasRiskCheck ? ' n\'umwirondoro wawe w\'ubuzima' : ''}.`}
            actions={<button className="btn-link" onClick={onViewLibrary}>Reba amasomo yose</button>}
            flush
          >
            <ul className="list">
              {forYou.map(({ lesson, reasons }) => (
                <li key={lesson.id}>
                  <button className="list-button" onClick={() => onOpenLesson(lesson)}>
                    <span className="grow">
                      <strong>{lesson.title}</strong>
                      <span className="meta">
                        <span className="tag">{lesson.category}</span>
                        <Duration value={lesson.duration} />
                      </span>
                      {reasons.length > 0 && (
                        <span className="meta"><span className="meta-item">{reasons.join(', ')}</span></span>
                      )}
                    </span>
                    <span className="btn btn-secondary btn-sm">Fungura</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <aside className="stack">
          <Panel title="Inama y'uyu munsi">
            <p className="small">{healthTip}</p>
          </Panel>
          <Panel title="Ukeneye ubufasha?">
            <p className="small">Reba ibibazo bikunze kubazwa, ubaze inzobere cyangwa utange raporo.</p>
            <button className="btn btn-secondary btn-sm" onClick={onViewFaq}>Jya ku bufasha</button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
