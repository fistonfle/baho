import { useEffect, useState } from 'react';

import type { QuizQuestion, QuizScore } from '../types';

// Short comprehension quiz at the end of a lesson. The parent decides how the
// attempt is graded and saved (server for signed-in learners, device for guests).
export function LessonQuiz({
  lessonId,
  questions,
  bestScore,
  onSubmit
}: {
  lessonId: number;
  questions: QuizQuestion[];
  bestScore?: QuizScore;
  onSubmit: (answers: number[]) => Promise<{ score: number; total: number; correct: boolean[] }>;
}) {
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [result, setResult] = useState<{ score: number; total: number; correct: boolean[] } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAnswers([]);
    setResult(null);
  }, [lessonId]);

  if (questions.length === 0) return null;
  const allAnswered = questions.every((_, index) => answers[index] !== undefined);

  const submit = async () => {
    setSaving(true);
    try {
      setResult(await onSubmit(answers as number[]));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel" aria-labelledby={`quiz-${lessonId}`} style={{ marginTop: 20 }}>
      <div className="panel-head">
        <div>
          <h2 id={`quiz-${lessonId}`}>Isuzuma ry'isomo</h2>
          <p>Subiza ibibazo {questions.length} urebe niba wumvise isomo.</p>
        </div>
        {bestScore && <span className="badge badge-success">Amanota meza: {bestScore.score}/{bestScore.total}</span>}
      </div>
      <div className="panel-body">
        {questions.map((question, questionIndex) => (
          <fieldset key={question.id ?? questionIndex} className="quiz-question" disabled={Boolean(result)}>
            <legend>{questionIndex + 1}. {question.question}</legend>
            {question.options.map((option, optionIndex) => {
              const chosen = answers[questionIndex] === optionIndex;
              const state = !result ? (chosen ? 'chosen' : '') : optionIndex === question.answerIndex ? 'correct' : chosen ? 'wrong' : 'dim';
              return (
                <button
                  type="button"
                  key={option}
                  className={`quiz-option ${state}`}
                  aria-pressed={chosen}
                  onClick={() => setAnswers((current) => {
                    const next = [...current];
                    next[questionIndex] = optionIndex;
                    return next;
                  })}
                >
                  <span className="quiz-letter">{String.fromCharCode(65 + optionIndex)}</span>
                  {option}
                </button>
              );
            })}
            {result && question.explanation && (
              <p className={`alert small ${result.correct[questionIndex] ? 'alert-success' : 'alert-danger'}`}>
                <strong>{result.correct[questionIndex] ? 'Ni byo.' : 'Si byo.'}</strong> {question.explanation}
              </p>
            )}
          </fieldset>
        ))}
      </div>
      <div className="panel-foot">
        {result ? (
          <div className="quiz-result" role="status">
            <span className="quiz-score">{result.score}/{result.total}</span>
            <span>{result.score === result.total ? 'Wasubije neza byose. Isomo ryarangiye.' : result.score * 2 >= result.total ? 'Wakoze neza. Isomo ryarangiye.' : 'Ongera wumve isomo hanyuma ugerageze.'}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => { setAnswers([]); setResult(null); }}>Ongera ugerageze</button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => void submit()} disabled={!allAnswered || saving}>
            {saving ? 'Biri kubikwa…' : allAnswered ? 'Ohereza ibisubizo' : `Subiza ibibazo byose (${answers.filter((answer) => answer !== undefined).length}/${questions.length})`}
          </button>
        )}
      </div>
    </section>
  );
}
