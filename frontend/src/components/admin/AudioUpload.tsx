// Upload a recorded lesson, or have the server read it aloud when nobody can record it.
import { useState } from 'react';

import { api } from '../../services/api';
import type { QuizQuestion } from '../../types';
import { AudioPlayer } from '../AudioPlayer';

const maxBytes = 20 * 1024 * 1024;

type Props = {
  value: string;
  synthetic: boolean;
  title: string;
  body: string;
  quiz: QuizQuestion[];
  onChange: (url: string, synthetic: boolean) => void;
  onError: (message: string) => void;
};

export function AudioUpload({ value, synthetic, title, body, quiz, onChange, onError }: Props) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const busy = uploading || generating;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > maxBytes) {
      onError('The recording must be 20 MB or smaller.');
      return;
    }
    setUploading(true);
    try {
      const { url } = await api.uploadAudio(file);
      onChange(url, false);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not upload the recording.');
    } finally {
      setUploading(false);
    }
  };

  // A silent lesson shuts out whoever cannot read it; a recording still replaces this.
  const generate = async () => {
    if (!body.trim()) {
      onError('Write the lesson text first, then generate its audio.');
      return;
    }
    setGenerating(true);
    try {
      const { url } = await api.generateAudio(title, body, quiz);
      onChange(url, true);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not make the audio.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="form-group span-2">
      <label htmlFor="lesson-audio">Lesson audio (optional)</label>
      {value ? (
        <div className="stack-sm">
          <AudioPlayer audioUrl={value} synthetic={synthetic} />
          <div className="actions">
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onChange('', false)}>Remove audio</button>
            {synthetic && (
              <span className="small muted">Computer voice. Listen to it in full, and replace it with a recording when one is made.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="stack-sm">
          <input
            id="lesson-audio"
            className="input"
            type="file"
            accept="audio/*"
            disabled={busy}
            onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }}
          />
          <div className="actions">
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void generate()}>
              {generating ? <><span className="spinner" /> Making the audio...</> : 'Generate audio instead'}
            </button>
          </div>
        </div>
      )}
      <span className="form-hint">
        {uploading
          ? <><span className="spinner" /> Uploading...</>
          : 'A person reading the lesson in Kinyarwanda (MP3, M4A, OGG, WAV or WebM, up to 20 MB). If nobody can record it, the server can read it aloud instead, quiz and all: each question is read, then a silence to answer in, then the right answer. Learners are told the voice is a computer.'}
      </span>
    </div>
  );
}
