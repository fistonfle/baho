import { useState } from 'react';

import type { QuestionItem } from '../../types';
import { Empty, PageHeader, StatusBadge } from '../ui';

const speak = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'rw-RW';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
};

const statusLabel = (status: string) => (status === 'Answered' ? 'Yasubijwe' : 'Itegereje');

export function FaqScreen({
  faqItems,
  topics,
  questions,
  questionForm,
  issueForm,
  pendingIssues,
  isSignedIn,
  onQuestionFormChange,
  onIssueFormChange,
  onAskQuestion,
  onReportIssue,
  onSignIn,
  onHome
}: {
  faqItems: { id?: number; question: string; answer: string }[];
  topics: string[];
  questions: QuestionItem[];
  questionForm: { topic: string; question: string };
  issueForm: { title: string; description: string };
  pendingIssues: number;
  isSignedIn: boolean;
  onQuestionFormChange: (changes: Partial<{ topic: string; question: string }>) => void;
  onIssueFormChange: (changes: Partial<{ title: string; description: string }>) => void;
  onAskQuestion: () => void;
  onReportIssue: () => void;
  onSignIn: () => void;
  onHome: () => void;
}) {
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const query = search.trim().toLowerCase();
  const visibleFaqs = faqItems.filter((item) => !query || `${item.question} ${item.answer}`.toLowerCase().includes(query));

  return (
    <div className="container">
      <PageHeader
        crumbs={[{ label: 'Ahabanza', onClick: onHome }, { label: 'Ubufasha' }]}
        title="Ubufasha"
        lead="Shakisha mu bibazo bikunze kubazwa, ubaze inzobere y'ubuzima, cyangwa utange raporo y'ikibazo cya tekiniki."
      />
      <div className="layout-main-aside">
        <section className="panel">
          <div className="panel-head"><h2>Ibibazo bikunze kubazwa</h2></div>
          <div className="filter-bar">
            <label className="visually-hidden" htmlFor="faq-search">Shakisha</label>
            <input
              id="faq-search"
              className="input faq-search"
              type="search"
              placeholder="Shakisha ikibazo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {visibleFaqs.length === 0 && <Empty>Nta gisubizo kibonetse. Ohereza ikibazo cyawe.</Empty>}
          {visibleFaqs.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={item.id ?? item.question} className="faq-item">
                <button className="faq-question" aria-expanded={open} onClick={() => setOpenIndex(open ? null : index)}>
                  <span>{item.question}</span>
                  <span aria-hidden="true">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                    <button className="btn btn-secondary btn-sm" onClick={() => speak(`${item.question} ${item.answer}`)}>Umva igisubizo</button>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Baza inzobere</h2></div>
            <div className="panel-body">
              {isSignedIn ? (
                <form onSubmit={(event) => { event.preventDefault(); onAskQuestion(); }}>
                  <div className="form-group">
                    <label htmlFor="question-topic">Ingingo</label>
                    <select id="question-topic" className="input" value={questionForm.topic} onChange={(event) => onQuestionFormChange({ topic: event.target.value })}>
                      {topics.map((interest) => <option key={interest} value={interest}>{interest}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="question-text">Ikibazo cyawe</label>
                    <textarea id="question-text" className="input" value={questionForm.question} onChange={(event) => onQuestionFormChange({ question: event.target.value })} required />
                  </div>
                  <button className="btn btn-primary" type="submit">Ohereza ikibazo</button>
                </form>
              ) : (
                <>
                  <p className="small">Injira cyangwa ufungure konti kugira ngo wohereze ibibazo ku nzobere z'ubuzima kandi urebe ibisubizo.</p>
                  <button className="btn btn-secondary" onClick={onSignIn}>Injira muri konti</button>
                </>
              )}
            </div>
            {isSignedIn && questions.length > 0 && (
              <div className="panel-foot stack-sm">
                <strong className="small">Ibibazo wohereje</strong>
                {questions.map((item) => (
                  <div key={item.id} className="small">
                    <div className="row-between"><span>{item.question}</span><StatusBadge label={statusLabel(item.status)} tone={item.status === 'Answered' ? 'success' : 'warning'} /></div>
                    {item.answer && <p className="muted" style={{ marginTop: 4 }}>Igisubizo: {item.answer}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <form className="panel" onSubmit={(event) => { event.preventDefault(); onReportIssue(); }}>
            <div className="panel-head"><h2>Tanga raporo</h2></div>
            <div className="panel-body">
              <div className="form-group">
                <label htmlFor="issue-title">Ikibazo</label>
                <input id="issue-title" className="input" type="text" placeholder="Urugero: Ijwi ntirikora" value={issueForm.title} onChange={(event) => onIssueFormChange({ title: event.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="issue-description">Bisobanure</label>
                <textarea id="issue-description" className="input" placeholder="Ntushyiremo amakuru yawe y'ubuzima." value={issueForm.description} onChange={(event) => onIssueFormChange({ description: event.target.value })} required />
              </div>
              <button className="btn btn-primary" type="submit">Ohereza raporo</button>
              {pendingIssues > 0 && (
                <p className="alert alert-warning small outbox-note" style={{ marginTop: 12 }}>Raporo {pendingIssues} zitegereje internet. Zizoherezwa internet igarutse.</p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
