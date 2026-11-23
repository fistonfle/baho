import { useEffect, useState } from 'react';

import { ALL, filterLessons, MINE, type RankedLesson } from '../../lib/personalization';
import { api } from '../../services/api';
import type { Lesson, QuizScore } from '../../types';
import { AudioPlayer } from '../AudioPlayer';
import { LessonQuiz } from '../LessonQuiz';
import { Disclaimer, Duration, PageHeader, Photo } from '../ui';

// On phones the player sits below the list, so bring it into view.
export const scrollToPlayer = () => {
  if (window.innerWidth > 820) return;
  window.setTimeout(() => document.querySelector('.audio-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
};

export function LibraryScreen({
  lessons,
  rankedLessons,
  myTopics,
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
  onAskAboutLesson,
  isSignedIn,
  onHome
}: {
  lessons: Lesson[];
  rankedLessons: RankedLesson[];
  myTopics: string[];
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
  onAskAboutLesson: (lessonId: number, question: string) => Promise<boolean>;
  isSignedIn: boolean;
  onHome: () => void;
}) {
  // Filter options: my topics, all, then each topic with lessons.
  const hasChoices = myTopics.length > 0;
  const filter = activeCategory === MINE && !hasChoices ? ALL : activeCategory;
  const categories = [...(hasChoices ? [MINE] : []), ALL, ...topics.filter((topic) => lessons.some((lesson) => lesson.category === topic))];
  const filterLabel = (value: string) => (value === MINE ? 'Ibyo wahisemo' : value === ALL ? 'Ibyiciro byose' : value);
  const filteredLessons = filterLessons(rankedLessons, lessons, filter, myTopics);
  // The open lesson always belongs to the list beside it.
  const firstShown = filteredLessons[0];
  const selectedIsListed = filteredLessons.some((lesson) => lesson.id === selectedLesson.id);
  useEffect(() => {
    if (!selectedIsListed && firstShown) setSelectedLesson(firstShown);
  }, [selectedIsListed, firstShown, setSelectedLesson]);
  const isComplete = completedLessons.includes(selectedLesson.id);
  const bestScore = quizScores.find((item) => item.contentId === selectedLesson.id);
  const hasQuiz = selectedLesson.quiz?.length > 0;

  // Back and next walk the list beside the lesson, so moving matches the order on screen.
  const position = filteredLessons.findIndex((lesson) => lesson.id === selectedLesson.id);
  const previousLesson = position > 0 ? filteredLessons[position - 1] : null;
  const followingLesson = position >= 0 ? filteredLessons[position + 1] ?? null : null;
  const openLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    scrollToPlayer();
  };

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
            <select id="lesson-filter" className="input" value={filter} onChange={(event) => setActiveCategory(event.target.value)}>
              {categories.map((category) => <option key={category} value={category}>{filterLabel(category)}</option>)}
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
                      <span className="meta">
                        <span className="tag">{lesson.category}</span>
                        <Duration value={lesson.duration} />
                      </span>
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
              <figure className="article-figure"><Photo src={selectedLesson.imageUrl} /></figure>
            )}
            <h2 style={{ fontSize: '1.4rem' }}>{selectedLesson.title}</h2>
            <div className="article-meta">
              <span className="tag tag-brand">{selectedLesson.category}</span>
              <Duration value={selectedLesson.duration} />
              {isComplete && <span className="badge badge-success">Warirangije</span>}
            </div>
            <div className="article-body">
              {selectedLesson.body.split('\n').filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
            <AudioPlayer
              audioUrl={selectedLesson.audioUrl}
              synthetic={selectedLesson.audioIsSynthetic}
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
                <span>Isomo rikurikira muri gahunda yawe: <strong>{nextInPath.title}</strong></span>
                <button className="btn btn-primary btn-sm" onClick={() => { setSelectedLesson(nextInPath); window.scrollTo({ top: 0, behavior: 'smooth' }); scrollToPlayer(); }}>Komeza</button>
              </div>
            )}
            <nav className="lesson-pager" aria-label="Kuzamuka no kumanuka mu masomo">
              <button
                type="button"
                className="btn btn-secondary pager-btn"
                disabled={!previousLesson}
                onClick={() => previousLesson && openLesson(previousLesson)}
              >
                <span className="pager-label"><span aria-hidden="true">&larr;</span> Isomo ribanziriza</span>
                <span className="pager-title">{previousLesson ? previousLesson.title : 'Iri ni irya mbere'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary pager-btn pager-next"
                disabled={!followingLesson}
                onClick={() => followingLesson && openLesson(followingLesson)}
              >
                <span className="pager-label">Isomo rikurikira <span aria-hidden="true">&rarr;</span></span>
                <span className="pager-title">{followingLesson ? followingLesson.title : 'Iri ni irya nyuma'}</span>
              </button>
            </nav>
            {position >= 0 && (
              <p className="small muted pager-count">Isomo rya {position + 1} kuri {filteredLessons.length}.</p>
            )}
            <LessonQuestions lessonId={selectedLesson.id} isSignedIn={isSignedIn} onAsk={onAskAboutLesson} />
            <div style={{ marginTop: 16 }}><Disclaimer /></div>
          </div>
        </article>
      </div>
    </div>
  );
}

/** The questions other learners asked about this lesson, and a box to add one. */
function LessonQuestions({
  lessonId,
  isSignedIn,
  onAsk
}: {
  lessonId: number;
  isSignedIn: boolean;
  onAsk: (lessonId: number, question: string) => Promise<boolean>;
}) {
  const [answered, setAnswered] = useState<{ id: number; question: string; answer: string }[]>([]);
  const [question, setQuestion] = useState('');
  const [sent, setSent] = useState(false);

  // Each lesson carries its own questions, so the list follows the lesson on screen.
  useEffect(() => {
    let live = true;
    setQuestion('');
    setSent(false);
    api.getLessonQuestions(lessonId)
      .then((data) => { if (live) setAnswered(data.questions); })
      .catch(() => { if (live) setAnswered([]); });
    return () => { live = false; };
  }, [lessonId]);

  const send = async () => {
    if (!question.trim()) return;
    if (await onAsk(lessonId, question.trim())) {
      setQuestion('');
      setSent(true);
    }
  };

  return (
    <section className="lesson-question" style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: '1.05rem' }}>Ibibazo n'ibisubizo</h3>
      {answered.length === 0 ? (
        <p className="small muted">Nta kibazo gisubijwe kuri iri somo. Niba ufite ikibazo, baza.</p>
      ) : (
        <>
          <p className="small muted">Ibibazo byabajijwe n'abandi, bisubijwe n'inzobere. Nta mazina agaragara.</p>
          <ul className="list qa-list">
            {answered.map((item) => (
              <li key={item.id}>
                <p className="qa-question">{item.question}</p>
                <p className="qa-answer">{item.answer}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <h4 style={{ fontSize: '0.98rem', marginTop: 16 }}>Ufite ikibazo kuri iri somo?</h4>
      {sent ? (
        <p role="status" className="alert alert-success">
          Ikibazo cyawe cyoherejwe. Inzobere ni yo izagisubiza, kandi igisubizo kizagaragara hano.
        </p>
      ) : (
        <>
          <label className="visually-hidden" htmlFor={`ask-${lessonId}`}>Ikibazo cyawe</label>
          <textarea
            id={`ask-${lessonId}`}
            className="input"
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Andika ikibazo cyawe mu Kinyarwanda."
          />
          <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => void send()}>
            Ohereza ikibazo
          </button>
        </>
      )}
      <p className="small muted">
        {isSignedIn
          ? 'Igisubizo kiza nyuma yo kwemezwa n\'inzobere, kandi kigaragara kuri iri somo ku bandi bose. Nta zina ryawe rigaragara.'
          : 'Ntugomba kwinjira ngo ubaze. Igisubizo kigaragara kuri iri somo nyuma yo kwemezwa n\'inzobere, nta zina ryawe.'}
        {' '}Niba ufite ikibazo cyihutirwa, jya ku kigo nderabuzima.
      </p>
    </section>
  );
}
