import { useState } from 'react';

import { knowledgeCheck } from '../../data/healthContent';

export type KnowledgeResult = { date: string; score: number; total: number };

const RESULTS_KEY = 'baho-knowledge-results';

export const loadKnowledgeResults = (): KnowledgeResult[] => {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveKnowledgeResult = (result: KnowledgeResult) => {
  localStorage.setItem(RESULTS_KEY, JSON.stringify([...loadKnowledgeResults(), result]));
};

const speak = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'rw-RW';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
};

// Five-item NCD knowledge check (same items as Appendix A). Taking it before
// and after the NCD module shows the learner, and the researcher, the change.
export function CheckupScreen({ onFinished, onOpenNcd }: { onFinished: () => void; onOpenNcd: () => void }) {
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<KnowledgeResult[]>(loadKnowledgeResults);
  const done = index >= knowledgeCheck.length;
  const question = knowledgeCheck[index];
  const score = choices.filter((choice, position) => choice === knowledgeCheck[position].answer).length;

  const choose = (option: number) => {
    if (revealed) return;
    setChoices([...choices.slice(0, index), option]);
    setRevealed(true);
  };

  const next = () => {
    setRevealed(false);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex === knowledgeCheck.length) {
      const finalScore = choices.filter((choice, position) => choice === knowledgeCheck[position].answer).length;
      const result = { date: new Date().toISOString(), score: finalScore, total: knowledgeCheck.length };
      saveKnowledgeResult(result);
      setResults([...results, result]);
      onFinished();
    }
  };

  const restart = () => {
    setIndex(0);
    setChoices([]);
    setRevealed(false);
  };

  if (done) {
    const first = results[0];
    const improved = results.length > 1 && score > first.score;
    return (
      <div className="screen dynamic-screen checkup-screen">
        <div className="panel-section checkup-card">
          <p className="eyebrow">Isuzuma ry'ubumenyi</p>
          <div className="score-ring" style={{ ['--score' as string]: `${(score / knowledgeCheck.length) * 100}%` }}>
            <strong>{score}/{knowledgeCheck.length}</strong>
          </div>
          <h2>{score === knowledgeCheck.length ? 'Ni byiza cyane!' : score >= 3 ? 'Wakoze neza!' : 'Komeza wige!'}</h2>
          {results.length > 1 && (
            <p className="score-compare">
              Ubwa mbere: <strong>{first.score}/{first.total}</strong> → Ubu: <strong>{score}/{knowledgeCheck.length}</strong>
              {improved && <span className="score-up"> ↑ Watereye imbere</span>}
            </p>
          )}
          {results.length === 1 && <p>Iga amasomo ku ndwara zitandura, hanyuma wongere ugerageze urebe aho watereye imbere.</p>}
          <div className="action-row">
            <button className="secondary" onClick={restart}>Ongera ugerageze</button>
            <button className="primary" onClick={onOpenNcd}>Iga ku ndwara</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen dynamic-screen checkup-screen">
      <div className="panel-section checkup-card">
        <div className="row-between">
          <p className="eyebrow">Ikibazo cya {index + 1} kuri {knowledgeCheck.length}</p>
          <button className="listen-chip" onClick={() => speak(`${question.question} ${question.options.join('. ')}`)}>🔊 Umva</button>
        </div>
        <div className="quiz-progress"><span style={{ width: `${(index / knowledgeCheck.length) * 100}%` }} /></div>
        <h2>{question.question}</h2>
        <div className="quiz-options">
          {question.options.map((option, optionIndex) => {
            const state = !revealed ? '' : optionIndex === question.answer ? 'correct' : optionIndex === choices[index] ? 'wrong' : 'dim';
            return (
              <button key={option} className={`quiz-option ${state}`} onClick={() => choose(optionIndex)} disabled={revealed}>
                <span className="quiz-letter">{String.fromCharCode(65 + optionIndex)}</span>
                {option}
              </button>
            );
          })}
        </div>
        {revealed && (
          <div className={`quiz-feedback ${choices[index] === question.answer ? 'correct' : 'wrong'}`} role="status">
            <strong>{choices[index] === question.answer ? '✓ Ni byo!' : '✗ Si byo.'}</strong> {question.explanation}
          </div>
        )}
        <div className="checkup-footer">
          <button className="primary" onClick={next} disabled={!revealed}>
            {index === knowledgeCheck.length - 1 ? 'Reba amanota' : 'Ikibazo gikurikira →'}
          </button>
        </div>
      </div>
    </div>
  );
}
