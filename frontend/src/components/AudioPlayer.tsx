import { useEffect, useRef, useState } from 'react';

import { mediaUrl } from '../services/api';

// Plays a lesson recorded by a person (FR02). Lessons without a recording, or
// whose file cannot be loaded, show no player at all: Baho does not read text
// aloud with a computer voice.

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

export function AudioPlayer({ audioUrl, onFinished }: { audioUrl?: string; onFinished?: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [saved, setSaved] = useState(false);

  // Reset whenever a different lesson is opened.
  useEffect(() => {
    setFailed(false);
    setPlaying(false);
    setProgress(0);
    setElapsed(0);
    setDuration(0);
    setSaved(false);
  }, [audioUrl]);

  if (!audioUrl || failed) return null;

  const play = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    audio.play().then(() => setPlaying(true)).catch(() => setFailed(true));
  };

  const pause = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    play();
  };

  const seek = (value: number) => {
    setProgress(value);
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration)) audio.currentTime = (value / 100) * audio.duration;
  };

  const changeRate = () => {
    const next = rate === 1 ? 0.75 : rate === 0.75 ? 1.25 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  // The service worker keeps every recording it serves, so fetching the whole
  // file once is enough to have it offline.
  const saveForOffline = async () => {
    try {
      const response = await fetch(mediaUrl(audioUrl));
      if (response.ok) setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={mediaUrl(audioUrl)}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          setElapsed(audio.currentTime);
          if (audio.duration > 0) setProgress((audio.currentTime / audio.duration) * 100);
        }}
        onEnded={() => { setPlaying(false); onFinished?.(); }}
        onError={() => setFailed(true)}
      />
      <button className="audio-toggle" onClick={playing ? pause : play} aria-label={playing ? 'Hagarika' : 'Umva isomo'}>
        {playing
          ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" /></svg>
          : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" /></svg>}
      </button>
      <div className="audio-main">
        <div className="audio-meta">
          <strong>{playing ? 'Biri gusomwa' : progress >= 100 ? 'Warangije kumva' : 'Umva isomo mu ijwi'}</strong>
          <span>{formatTime(elapsed)} / {formatTime(duration)}</span>
        </div>
        <input
          className="audio-seek"
          type="range"
          min="0"
          max="100"
          value={Math.round(progress)}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Aho isomo rigeze"
        />
        <div className="audio-actions">
          <button className="btn btn-secondary btn-sm" onClick={restart}>Subiramo</button>
          <button className="btn btn-secondary btn-sm" onClick={changeRate} aria-label="Umuvuduko w'ijwi">Umuvuduko: {rate}×</button>
          <button className="btn btn-secondary btn-sm" onClick={() => void saveForOffline()} disabled={saved}>{saved ? 'Ryabitswe kuri telefoni' : 'Bika ku gikoresho'}</button>
        </div>
      </div>
    </div>
  );
}
