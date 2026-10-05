import type { Lesson, QuizScore } from '../../types';
import { AudioPlayer } from '../AudioPlayer';
import { LessonQuiz } from '../LessonQuiz';
import { Disclaimer } from '../ui';

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
  submitQuiz
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
}) {
  // Only show filters for categories that actually have lessons.
  const categories = ['All', ...topics.filter((interest) => lessons.some((lesson) => lesson.category === interest))];
  const filteredLessons = activeCategory === 'All' ? lessons : lessons.filter((lesson) => lesson.category === activeCategory);
  const isComplete = completedLessons.includes(selectedLesson.id);
  const bestScore = quizScores.find((item) => item.contentId === selectedLesson.id);
  const hasQuiz = selectedLesson.quiz?.length > 0;

  return (
    <div className="screen dynamic-screen library-screen">
      <div className="panel-section">
        <p className="eyebrow">Ibikubiyemo</p>
        <h2>Amasomo y'ubuzima</h2>
        <p className="screen-intro">{completedLessons.length} kuri {lessons.length} warangije</p>

        <div className="category-row" role="tablist" aria-label="Ibyiciro by'amasomo">
          {categories.map((category) => (
            <button
              key={category}
              role="tab"
              aria-selected={activeCategory === category}
              className={`tiny-button ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category === 'All' ? 'Byose' : category}
            </button>
          ))}
        </div>

        <div className="list-stack">
          {filteredLessons.length === 0 && <p className="text-muted">Nta masomo ari muri iki cyiciro.</p>}
          {filteredLessons.map((lesson) => {
            const done = completedLessons.includes(lesson.id);
            const score = quizScores.find((item) => item.contentId === lesson.id);
            return (
              <button key={lesson.id} className={`list-item ${selectedLesson.id === lesson.id ? 'selected' : ''}`} onClick={() => { setSelectedLesson(lesson); scrollToPlayer(); }}>
                <span className={`lesson-check ${done ? 'done' : ''}`} aria-label={done ? 'Warirangije' : 'Ntirirarangira'}>{done ? '✓' : '▶'}</span>
                <div>
                  <strong>{lesson.title}</strong>
                  <span>{lesson.category} · {lesson.duration}</span>
                </div>
                {score && <span className="lesson-score">{score.score}/{score.total}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel-section audio-panel">
        {selectedLesson.imageUrl && <img className="lesson-image" src={selectedLesson.imageUrl} alt="" />}
        <p className="eyebrow">{selectedLesson.category}</p>
        <h3>{selectedLesson.title}</h3>
        <div className="lesson-body">
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
          <button className={`complete-button ${isComplete ? 'done' : ''}`} onClick={() => markLessonComplete(selectedLesson.id)} disabled={isComplete}>
            {isComplete ? '✓ Warangije iri somo' : 'Narangije iri somo'}
          </button>
        )}
        {isComplete && nextInPath && (
          <button className="next-lesson" onClick={() => { setSelectedLesson(nextInPath); window.scrollTo({ top: 0, behavior: 'smooth' }); scrollToPlayer(); }}>
            <span>Isomo rikurikira mu nzira yawe</span>
            <strong>{nextInPath.title} →</strong>
          </button>
        )}
        <Disclaimer />
      </div>
    </div>
  );
}
