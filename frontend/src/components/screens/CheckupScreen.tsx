import { useState } from 'react';

import { knowledgeCheck } from '../../data/healthContent';
import { PageHeader } from '../ui';

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
export function CheckupScreen({ onFinished, onOpenNcd, onHome }: { onFinished: () => void; onOpenNcd: () => void; onHome: () => void }) {
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

  const header = (
    <PageHeader
      crumbs={[{ label: 'Ahabanza', onClick: onHome }, { label: 'Indwara zitandura', onClick: onOpenNcd }, { label: 'Isuzuma ry\'ubumenyi' }]}
      title="Isuzuma ry'ubumenyi"
      lead="Ibibazo bitanu ku ndwara zitandura. Bikore mbere na nyuma yo kwiga."
    />
  );

  if (done) {
    const first = results[0];
    const improved = results.length > 1 && score > first.score;
    return (
      <div className="container narrow">
        {header}
        <section className="panel">
          <div className="panel-head"><h2>Ibisubizo</h2></div>
          <div className="panel-body stack">
            <div className="score-box">
              <div className="quiz-score">{score} / {knowledgeCheck.length}</div>
              <div className="muted">{score === knowledgeCheck.length ? 'Wasubije neza byose.' : score >= 3 ? 'Wakoze neza.' : 'Komeza wige amasomo.'}</div>
            </div>
            {results.length > 1 ? (
              <table className="table">
                <thead><tr><th>Isuzuma</th><th className="right">Amanota</th></tr></thead>
                <tbody>
                  <tr><td>Ubwa mbere</td><td className="right">{first.score} / {first.total}</td></tr>
                  <tr><td>Ubu</td><td className="right">{score} / {knowledgeCheck.length} {improved && <span className="badge badge-success">Watereye imbere</span>}</td></tr>
                </tbody>
              </table>
            ) : <p className="alert alert-info">Iga amasomo ku ndwara zitandura, hanyuma wongere ukore isuzuma urebe aho watereye imbere.</p>}
          </div>
          <div className="panel-foot row">
            <button className="btn btn-primary" onClick={onOpenNcd}>Iga ku ndwara</button>
            <button className="btn btn-secondary" onClick={restart}>Ongera ukore isuzuma</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container narrow">
      {header}
      <section className="panel">
        <div className="panel-head">
          <div><h2>Ikibazo cya {index + 1} kuri {knowledgeCheck.length}</h2></div>
          <button className="btn btn-secondary btn-sm" onClick={() => speak(`${question.question} ${question.options.join('. ')}`)}>Umva ikibazo</button>
        </div>
        <div className="panel-body">
          <div className="progress" style={{ marginBottom: 16 }}><span style={{ width: `${(index / knowledgeCheck.length) * 100}%` }} /></div>
          <fieldset className="quiz-question">
            <legend style={{ fontSize: '1.05rem' }}>{question.question}</legend>
            {question.options.map((option, optionIndex) => {
              const state = !revealed ? '' : optionIndex === question.answer ? 'correct' : optionIndex === choices[index] ? 'wrong' : 'dim';
              return (
                <button key={option} className={`quiz-option ${state}`} onClick={() => choose(optionIndex)} disabled={revealed}>
                  <span className="quiz-letter">{String.fromCharCode(65 + optionIndex)}</span>
                  {option}
                </button>
              );
            })}
          </fieldset>
          {revealed && (
            <p className={`alert small ${choices[index] === question.answer ? 'alert-success' : 'alert-danger'}`} role="status">
              <strong>{choices[index] === question.answer ? 'Ni byo.' : 'Si byo.'}</strong> {question.explanation}
            </p>
          )}
        </div>
        <div className="panel-foot row-between">
          <span className="small muted">Hitamo igisubizo kimwe.</span>
          <button className="btn btn-primary" onClick={next} disabled={!revealed}>
            {index === knowledgeCheck.length - 1 ? 'Reba amanota' : 'Ikibazo gikurikira'}
          </button>
        </div>
      </section>
    </div>
  );
}
