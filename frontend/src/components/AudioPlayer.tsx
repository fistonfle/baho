import { useEffect, useRef, useState } from 'react';

// One player for every lesson (FR02). It plays the recorded Kinyarwanda MP3
// when there is one, and falls back to the browser's speech voice when the
// file is missing, so every lesson can still be listened to.

type Source = 'file' | 'voice';

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

// There is rarely a Kinyarwanda voice installed; Swahili sounds closest.
const pickVoice = () => {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang.toLowerCase().startsWith('rw'))
    || voices.find((voice) => voice.lang.toLowerCase().startsWith('sw'))
    || null;
};

export function AudioPlayer({ text, audioUrl, onFinished }: { text: string; audioUrl?: string; onFinished?: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const voiceOffset = useRef(0);
  // Cancelling speech can fire 'end' on the old utterance, so only react to the current one.
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const [source, setSource] = useState<Source>(audioUrl ? 'file' : 'voice');
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [saved, setSaved] = useState(false);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Reset whenever a different lesson is opened.
  useEffect(() => {
    setSource(audioUrl ? 'file' : 'voice');
    setPlaying(false);
    setProgress(0);
    setElapsed(0);
    setDuration(0);
    setSaved(false);
    voiceOffset.current = 0;
    return () => {
      currentUtterance.current = null;
      if (canSpeak) window.speechSynthesis.cancel();
    };
  }, [audioUrl, text, canSpeak]);

  const speakFrom = (startIndex: number) => {
    if (!canSpeak) return;
    currentUtterance.current = null;
    window.speechSynthesis.cancel();
    voiceOffset.current = startIndex;
    const utterance = new SpeechSynthesisUtterance(text.slice(startIndex));
    currentUtterance.current = utterance;
    utterance.lang = 'rw-RW';
    utterance.rate = rate * 0.9;
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.onboundary = (event) => {
      if (currentUtterance.current === utterance) setProgress(((voiceOffset.current + event.charIndex) / text.length) * 100);
    };
    utterance.onend = () => {
      if (currentUtterance.current !== utterance) return;
      currentUtterance.current = null;
      setPlaying(false);
      setProgress(100);
      voiceOffset.current = 0;
      onFinished?.();
    };
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  };

  const play = () => {
    if (source === 'file' && audioRef.current) {
      audioRef.current.playbackRate = rate;
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {
        setSource('voice');
        speakFrom(0);
      });
      return;
    }
    const resumeAt = progress >= 100 ? 0 : Math.floor((progress / 100) * text.length);
    speakFrom(text.lastIndexOf(' ', resumeAt) + 1);
  };

  const pause = () => {
    audioRef.current?.pause();
    currentUtterance.current = null;
    if (canSpeak) window.speechSynthesis.cancel();
    setPlaying(false);
  };

  const restart = () => {
    if (source === 'file' && audioRef.current) {
      audioRef.current.currentTime = 0;
      play();
      return;
    }
    setProgress(0);
    speakFrom(0);
  };

  const seek = (value: number) => {
    setProgress(value);
    if (source === 'file' && audioRef.current && Number.isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = (value / 100) * audioRef.current.duration;
      return;
    }
    if (playing) speakFrom(text.lastIndexOf(' ', Math.floor((value / 100) * text.length)) + 1);
  };

  const changeRate = () => {
    const next = rate === 1 ? 0.75 : rate === 0.75 ? 1.25 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const saveForOffline = async () => {
    if (!audioUrl || !('caches' in window)) return;
    try {
      const cache = await caches.open('baho-v2-audio');
      await cache.add(audioUrl);
      setSaved(true);
    } catch {
      setSource('voice');
    }
  };

  return (
    <div className="audio-player">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget;
            setElapsed(audio.currentTime);
            if (audio.duration > 0) setProgress((audio.currentTime / audio.duration) * 100);
          }}
          onEnded={() => { setPlaying(false); onFinished?.(); }}
          onError={() => setSource('voice')}
        />
      )}
      <button className="audio-play" onClick={playing ? pause : play} aria-label={playing ? 'Hagarika' : 'Umva isomo'}>
        {playing
          ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" /></svg>
          : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" /></svg>}
      </button>
      <div className="audio-main">
        <div className="audio-meta">
          <strong>{playing ? 'Biri gukina…' : progress >= 100 ? 'Warangije kumva' : 'Umva isomo'}</strong>
          <span>{source === 'file' ? `${formatTime(elapsed)} / ${formatTime(duration)}` : 'Ijwi rya mudasobwa'}</span>
        </div>
        <input
          className="audio-seek"
          type="range"
          min="0"
          max="100"
          value={Math.round(progress)}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Aho isomo rigeze"
          style={{ ['--fill' as string]: `${progress}%` }}
        />
        <div className="audio-actions">
          <button onClick={restart}>↺ Subiramo</button>
          <button onClick={changeRate} aria-label="Umuvuduko w'ijwi">{rate}×</button>
          {source === 'file' && 'caches' in window && (
            <button onClick={() => void saveForOffline()} disabled={saved}>{saved ? '✓ Yabitswe' : '↓ Bika nta internet'}</button>
          )}
        </div>
        {source === 'voice' && !canSpeak && <p className="audio-note">Uru rubuga ntirushobora gusoma mu ijwi.</p>}
      </div>
    </div>
  );
}
