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
    <section className="lesson-quiz" aria-labelledby={`quiz-${lessonId}`}>
      <div className="lesson-quiz-heading">
        <div>
          <p className="eyebrow">Isuzuma ry'isomo</p>
          <h4 id={`quiz-${lessonId}`}>Wumvise neza?</h4>
        </div>
        {bestScore && <span className="status-pill success">Amanota meza: {bestScore.score}/{bestScore.total}</span>}
      </div>

      {questions.map((question, questionIndex) => (
        <fieldset key={question.id ?? questionIndex} className="lesson-quiz-question" disabled={Boolean(result)}>
          <legend>{questionIndex + 1}. {question.question}</legend>
          <div className="quiz-options">
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
          </div>
          {result && question.explanation && (
            <p className={`quiz-feedback ${result.correct[questionIndex] ? 'correct' : 'wrong'}`}>
              <strong>{result.correct[questionIndex] ? '✓ Ni byo.' : '✗ Si byo.'}</strong> {question.explanation}
            </p>
          )}
        </fieldset>
      ))}

      {result ? (
        <div className="lesson-quiz-result" role="status">
          <strong>{result.score}/{result.total}</strong>
          <span>{result.score === result.total ? 'Ni byiza cyane! Isomo ryarangiye.' : result.score * 2 >= result.total ? 'Wakoze neza! Isomo ryarangiye.' : 'Ongera wumve isomo hanyuma ugerageze.'}</span>
          <button className="secondary" onClick={() => { setAnswers([]); setResult(null); }}>Ongera ugerageze</button>
        </div>
      ) : (
        <button className="primary" onClick={() => void submit()} disabled={!allAnswered || saving}>
          {saving ? 'Biri kubikwa…' : allAnswered ? 'Reba amanota' : `Subiza ibibazo byose (${answers.filter((answer) => answer !== undefined).length}/${questions.length})`}
        </button>
      )}
    </section>
  );
}
