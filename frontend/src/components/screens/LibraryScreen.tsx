import type { Lesson, QuizScore } from '../../types';
import { AudioPlayer } from '../AudioPlayer';
import { LessonQuiz } from '../LessonQuiz';
import { Disclaimer, PageHeader } from '../ui';

// On phones the player sits below the list, so bring it into view.
export const scrollToPlayer = () => {
  if (window.innerWidth > 820) return;
  window.setTimeout(() => document.querySelector('.audio-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
};

export function LibraryScreen({
  lessons,
  topics,
  selectedLesson,
  activeCategory,
  completedLessons,
  quizScores,
  nextInPath,
  setActiveCategory,
  setSelectedLesson,
  markLessonComplete,
  submitQuiz,
  onHome
}: {
  lessons: Lesson[];
  topics: string[];
  selectedLesson: Lesson;
  activeCategory: string;
  completedLessons: number[];
  quizScores: QuizScore[];
  nextInPath: Lesson | null;
  setActiveCategory: (value: string) => void;
  setSelectedLesson: (value: Lesson) => void;
  markLessonComplete: (lessonId: number) => void;
  submitQuiz: (lessonId: number, answers: number[]) => Promise<{ score: number; total: number; correct: boolean[] }>;
  onHome: () => void;
}) {
  // Only show filters for categories that actually have lessons.
  const categories = ['All', ...topics.filter((interest) => lessons.some((lesson) => lesson.category === interest))];
  const filteredLessons = activeCategory === 'All' ? lessons : lessons.filter((lesson) => lesson.category === activeCategory);
  const isComplete = completedLessons.includes(selectedLesson.id);
  const bestScore = quizScores.find((item) => item.contentId === selectedLesson.id);
  const hasQuiz = selectedLesson.quiz?.length > 0;

  return (
    <div className="container">
      <PageHeader
        crumbs={[{ label: 'Ahabanza', onClick: onHome }, { label: 'Amasomo' }, { label: selectedLesson.title }]}
        title="Amasomo"
        lead={`Warangije amasomo ${completedLessons.length} kuri ${lessons.length}.`}
      />
      <div className="layout-aside-main">
        <section className="panel">
          <div className="panel-head"><h2>Urutonde rw'amasomo</h2></div>
          <div className="filter-bar">
            <label className="visually-hidden" htmlFor="lesson-filter">Icyiciro</label>
            <select id="lesson-filter" className="input" value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}>
              {categories.map((category) => <option key={category} value={category}>{category === 'All' ? 'Ibyiciro byose' : category}</option>)}
            </select>
          </div>
          <ul className="list lesson-list">
            {filteredLessons.length === 0 && <li className="empty">Nta masomo ari muri iki cyiciro.</li>}
            {filteredLessons.map((lesson) => {
              const done = completedLessons.includes(lesson.id);
              const score = quizScores.find((item) => item.contentId === lesson.id);
              return (
                <li key={lesson.id}>
                  <button className={`list-button ${selectedLesson.id === lesson.id ? 'current' : ''}`} onClick={() => { setSelectedLesson(lesson); scrollToPlayer(); }}>
                    <span className="grow">
                      <strong>{lesson.title}</strong>
                      <small>{lesson.category} · {lesson.duration}</small>
                    </span>
                    {done && <span className="badge badge-success">{score ? `${score.score}/${score.total}` : 'Ryarangiye'}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <article className="panel audio-panel">
          <div className="panel-body">
            {selectedLesson.imageUrl && (
              <figure className="article-figure"><img src={selectedLesson.imageUrl} alt="" /></figure>
            )}
            <h2 style={{ fontSize: '1.4rem' }}>{selectedLesson.title}</h2>
            <div className="article-meta">
              <span>Icyiciro: {selectedLesson.category}</span>
              <span>Igihe: {selectedLesson.duration}</span>
              {isComplete && <span className="badge badge-success">Warirangije</span>}
            </div>
            <div className="article-body">
              {selectedLesson.body.split('\n').filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
            <AudioPlayer
              text={`${selectedLesson.title}. ${selectedLesson.body}`}
              audioUrl={selectedLesson.audioUrl}
              onFinished={hasQuiz ? undefined : () => markLessonComplete(selectedLesson.id)}
            />
            {hasQuiz ? (
              <LessonQuiz
                lessonId={selectedLesson.id}
                questions={selectedLesson.quiz}
                bestScore={bestScore}
                onSubmit={(answers) => submitQuiz(selectedLesson.id, answers)}
              />
            ) : (
              <button className="btn btn-primary" onClick={() => markLessonComplete(selectedLesson.id)} disabled={isComplete}>
                {isComplete ? 'Warangije iri somo' : 'Narangije iri somo'}
              </button>
            )}
            {isComplete && nextInPath && (
              <div className="alert alert-info row-between" style={{ marginTop: 16 }}>
                <span>Isomo rikurikira mu nzira yawe: <strong>{nextInPath.title}</strong></span>
                <button className="btn btn-primary btn-sm" onClick={() => { setSelectedLesson(nextInPath); window.scrollTo({ top: 0, behavior: 'smooth' }); scrollToPlayer(); }}>Komeza</button>
              </div>
            )}
            <div style={{ marginTop: 16 }}><Disclaimer /></div>
          </div>
        </article>
      </div>
    </div>
  );
}
