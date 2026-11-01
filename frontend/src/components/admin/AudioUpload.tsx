// Uploads a lesson recorded by a person. Phones can record straight from the
// microphone through the file picker. Without a recording, learners see no player.
import { useState } from 'react';

import { api } from '../../services/api';
import { AudioPlayer } from '../AudioPlayer';

const maxBytes = 20 * 1024 * 1024;

export function AudioUpload({ value, onChange, onError }: { value: string; onChange: (url: string) => void; onError: (message: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > maxBytes) {
      onError('The recording must be 20 MB or smaller.');
      return;
    }
    setUploading(true);
    try {
      const { url } = await api.uploadAudio(file);
      onChange(url);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not upload the recording.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="form-group span-2">
      <label htmlFor="lesson-audio">Recorded audio (optional)</label>
      {value ? (
        <div className="stack-sm">
          <AudioPlayer audioUrl={value} />
          <div><button type="button" className="btn btn-danger btn-sm" onClick={() => onChange('')}>Remove recording</button></div>
        </div>
      ) : (
        <input
          id="lesson-audio"
          className="input"
          type="file"
          accept="audio/*"
          disabled={uploading}
          onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }}
        />
      )}
      <span className="form-hint">
        {uploading ? 'Uploading…' : 'A person reading the lesson in Kinyarwanda (MP3, M4A, OGG, WAV or WebM, up to 20 MB). Lessons without a recording show no audio player.'}
      </span>
    </div>
  );
}
