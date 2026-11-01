// Adds and removes quiz questions while a lesson is being written.
import { useState } from 'react';

import type { QuizQuestion } from '../../types';
import { emptyQuestion } from './shared';

export function QuizEditor({ quiz, onChange }: { quiz: QuizQuestion[]; onChange: (quiz: QuizQuestion[]) => void }) {
  const [draft, setDraft] = useState<QuizQuestion>(emptyQuestion);
  const canAdd = draft.question.trim() && draft.options.filter((option) => option.trim()).length >= 2;

  const addQuestion = () => {
    const options = draft.options.map((option) => option.trim()).filter(Boolean);
    onChange([...quiz, { ...draft, question: draft.question.trim(), options, answerIndex: Math.min(draft.answerIndex, options.length - 1) }]);
    setDraft(emptyQuestion);
  };

  return (
    <div className="form-group span-2">
      <span className="form-label">Lesson quiz ({quiz.length} {quiz.length === 1 ? 'question' : 'questions'})</span>
      {quiz.length > 0 && (
        <table className="table" style={{ marginBottom: 8 }}>
          <tbody>
            {quiz.map((item, index) => (
              <tr key={index}>
                <td>
                  <strong>{index + 1}. {item.question}</strong>
                  <div className="small muted">{item.options.map((option, optionIndex) => (optionIndex === item.answerIndex ? `${option} (answer)` : option)).join(' · ')}</div>
                </td>
                <td className="right"><button type="button" className="btn btn-danger btn-sm" onClick={() => onChange(quiz.filter((_, position) => position !== index))}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {quiz.length < 10 && (
        <div className="quiz-editor stack-sm">
          <input className="input" value={draft.question} onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))} placeholder="New question" aria-label="New question" />
          {draft.options.map((option, index) => (
            <label key={index} className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                type="radio"
                name="quiz-correct"
                checked={draft.answerIndex === index}
                onChange={() => setDraft((current) => ({ ...current, answerIndex: index }))}
                aria-label={`Answer ${String.fromCharCode(65 + index)} is correct`}
              />
              <input
                className="input"
                value={option}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((current) => ({ ...current, options: current.options.map((item, position) => (position === index ? value : item)) }));
                }}
                placeholder={`Answer ${String.fromCharCode(65 + index)}`}
              />
            </label>
          ))}
          <input className="input" value={draft.explanation} onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))} placeholder="Explanation (optional)" aria-label="Explanation" />
          <div className="row">
            {draft.options.length < 4 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDraft((current) => ({ ...current, options: [...current.options, ''] }))}>Add answer</button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={addQuestion} disabled={!canAdd}>Add question</button>
          </div>
          <span className="form-hint">Select the circle next to the correct answer.</span>
        </div>
      )}
    </div>
  );
}
