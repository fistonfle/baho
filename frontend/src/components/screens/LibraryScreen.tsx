import type { RefObject } from 'react';

import type { Lesson } from '../../types';

export function LibraryScreen({
  lessons,
  selectedLesson,
  activeCategory,
  setActiveCategory,
  setSelectedLesson,
  audioProgress,
  handleSeek,
  markLessonComplete,
  audioRef
}: {
  lessons: Lesson[];
  selectedLesson: Lesson;
  activeCategory: string;
  setActiveCategory: (value: string) => void;
  setSelectedLesson: (value: Lesson) => void;
  audioProgress: number;
  handleSeek: (value: number) => void;
  markLessonComplete: (lessonId: number) => void;
  audioRef: RefObject<HTMLAudioElement>;
}) {
  const topicCategories = ['Byose', 'Umuvuduko w\'amaraso', 'Diyabete', 'Imirire', 'Ubuzima bw\'umutima'];
  const selectedCategory = activeCategory === 'All' ? 'Byose' : activeCategory;
  const filteredLessons = activeCategory === 'All' ? lessons : lessons.filter((lesson) => lesson.category === activeCategory);

  const speakLesson = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const narration = new SpeechSynthesisUtterance(`${selectedLesson.title}. ${selectedLesson.body}`);
    narration.lang = 'rw-RW';
    window.speechSynthesis.speak(narration);
  };

  return (
    <div className="screen dynamic-screen library-screen">
      <div className="panel-section">
        <p className="eyebrow">Ibikubiyemo</p>
        <h2>Amakuru y'ubuzima</h2>

        <div className="category-row">
          {topicCategories.map((category) => (
            <button
              key={category}
              className={`tiny-button ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category === 'Byose' ? 'All' : category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="list-stack">
          {filteredLessons.map((lesson) => (
            <button key={lesson.id} className={`list-item ${selectedLesson.id === lesson.id ? 'selected' : ''}`} onClick={() => setSelectedLesson(lesson)}>
              <div>
                <strong>{lesson.title}</strong>
                <span>{lesson.category}</span>
              </div>
              <span>Fungura</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section audio-panel">
        <p className="eyebrow">{selectedLesson.category}</p>
        <h3>{selectedLesson.title}</h3>
        <p>{selectedLesson.body}</p>

        <div className="audio-box">
          <button className="play-control" onClick={() => {
            if (!audioRef.current || !selectedLesson.audioUrl) {
              speakLesson();
              return;
            }
            void audioRef.current.play().catch(speakLesson);
          }}>Tangira</button>
          <button className="play-control muted" onClick={() => {
            audioRef.current?.pause();
            if ('speechSynthesis' in window) window.speechSynthesis.pause();
          }}>Hagarika</button>
          <button className="play-control muted" onClick={() => {
            if (audioRef.current && selectedLesson.audioUrl) {
              audioRef.current.currentTime = 0;
              void audioRef.current.play().catch(speakLesson);
            } else {
              speakLesson();
            }
          }}>Subiramo</button>
          <button className="play-control success" onClick={() => markLessonComplete(selectedLesson.id)}>Rangiza isomo</button>
          <button className="play-control" onClick={speakLesson}>Umva isomo risomwe</button>
        </div>

        {selectedLesson.audioUrl && <div className="seek-row">
          <span>0%</span>
          <input type="range" min="0" max="100" value={audioProgress} onChange={(event) => handleSeek(Number(event.target.value))} />
          <span>100%</span>
        </div>}

        {selectedLesson.audioUrl && <audio ref={audioRef} controls src={selectedLesson.audioUrl} />}
      </div>
    </div>
  );
}
