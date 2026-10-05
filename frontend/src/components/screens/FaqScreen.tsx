import { useState } from 'react';

import type { QuestionItem } from '../../types';

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
  onSignIn
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
}) {
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const query = search.trim().toLowerCase();
  const visibleFaqs = faqItems.filter((item) => !query || `${item.question} ${item.answer}`.toLowerCase().includes(query));

  return (
    <div className="screen dynamic-screen faq-screen">
      <div className="panel-section">
        <p className="eyebrow">Ibibazo bikunze kubazwa</p>
        <h2>Ubufasha</h2>
        <input
          className="faq-search"
          type="search"
          placeholder="🔍 Shakisha ikibazo…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Shakisha mu bibazo bikunze kubazwa"
        />
        <div className="faq-list">
          {visibleFaqs.length === 0 && <p className="text-muted">Nta gisubizo kibonetse. Ohereza ikibazo cyawe hepfo.</p>}
          {visibleFaqs.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={item.id ?? item.question} className={`faq-item ${open ? 'open' : ''}`}>
                <button className="faq-question" aria-expanded={open} onClick={() => setOpenIndex(open ? null : index)}>
                  <strong>{item.question}</strong>
                  <span aria-hidden="true">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                    <button className="listen-chip" onClick={() => speak(`${item.question} ${item.answer}`)}>🔊 Umva igisubizo</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="faq-columns">
        <div className="panel-section">
          <p className="eyebrow">Baza inzobere</p>
          <h3>Ohereza ikibazo cyawe</h3>
          {isSignedIn ? (
            <form className="stack-form" onSubmit={(event) => { event.preventDefault(); onAskQuestion(); }}>
              <label className="creator-field">
                <span>Ingingo</span>
                <select value={questionForm.topic} onChange={(event) => onQuestionFormChange({ topic: event.target.value })}>
                  {topics.map((interest) => <option key={interest} value={interest}>{interest}</option>)}
                </select>
              </label>
              <label className="creator-field">
                <span>Ikibazo</span>
                <textarea
                  placeholder="Andika ikibazo cyawe mu Kinyarwanda cyangwa mu Cyongereza"
                  value={questionForm.question}
                  onChange={(event) => onQuestionFormChange({ question: event.target.value })}
                  required
                />
              </label>
              <button className="primary" type="submit">Ohereza ikibazo</button>
            </form>
          ) : (
            <div className="signin-prompt">
              <p>Injira cyangwa ufungure konti kugira ngo wohereze ibibazo ku nzobere z'ubuzima kandi urebe ibisubizo.</p>
              <button className="primary" onClick={onSignIn}>Injira muri konti</button>
            </div>
          )}

          {isSignedIn && questions.length > 0 && (
            <div className="question-list">
              <h4>Ibibazo byawe</h4>
              {questions.map((item) => (
                <div key={item.id} className="question-row">
                  <div>
                    <span className="question-topic">{item.topic}</span>
                    <p>{item.question}</p>
                    {item.answer && <span className="answer-box"><strong>Igisubizo:</strong> {item.answer}</span>}
                  </div>
                  <span className={`status-pill ${item.status === 'Answered' ? 'success' : 'warning'}`}>{statusLabel(item.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel-section">
          <p className="eyebrow">Hari ikitagenda neza?</p>
          <h3>Tanga raporo</h3>
          <form className="stack-form" onSubmit={(event) => { event.preventDefault(); onReportIssue(); }}>
            <label className="creator-field">
              <span>Ikibazo</span>
              <input
                type="text"
                placeholder="Urugero: Ijwi ntirikora"
                value={issueForm.title}
                onChange={(event) => onIssueFormChange({ title: event.target.value })}
                required
              />
            </label>
            <label className="creator-field">
              <span>Bisobanure</span>
              <textarea
                placeholder="Ntushyiremo amakuru yawe y'ubuzima."
                value={issueForm.description}
                onChange={(event) => onIssueFormChange({ description: event.target.value })}
                required
              />
            </label>
            <button className="primary" type="submit">Ohereza raporo</button>
          </form>
          {pendingIssues > 0 && (
            <p className="outbox-note">📤 Raporo {pendingIssues} zitegereje internet. Zizoherezwa ako kanya internet igarutse.</p>
          )}
        </div>
      </div>
    </div>
  );
}
