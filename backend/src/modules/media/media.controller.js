import express from 'express';

import { MediaStore, mediaStore } from './MediaStore.js';
import { ttsEngine } from './TtsEngine.js';

// The lesson as a reader would hear it, without the on-screen markup.
export const speakable = (title, body) => [title, body]
  .map((part) => String(part || '').trim())
  .filter(Boolean)
  .join('. ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[*_`>#|]/g, ' ')
  .replace(/^\s*[-+]\s+/gm, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  // Punctuation alone is not speech; a voice given it returns noise, not an error.
  .replace(/^[^\p{L}\p{N}]*$/u, '');

// POST /admin/media/audio with the recording as the request body.
export const uploadAudio = async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ message: 'Send the recording as the request body' });
  }
  try {
    const name = await mediaStore.saveAudio(req.body);
    return res.status(201).json({ url: `/api/v1/media/${name}` });
  } catch (error) {
    if (error.message === 'unsupported') return res.status(415).json({ message: 'Upload an MP3, M4A, OGG, WAV or WebM recording' });
    if (error.message === 'too-large') return res.status(413).json({ message: 'The recording must be 20 MB or smaller' });
    return res.status(503).json({ message: 'Could not save the recording' });
  }
};

// POST /admin/media/audio/generate. Made once and stored like an upload, so it plays offline.
export const generateAudio = async (req, res) => {
  const { title = '', body = '' } = req.body || {};
  const text = speakable(title, body);
  if (!text) return res.status(400).json({ message: 'Write the lesson first, then generate its audio' });
  if (!ttsEngine.isConfigured()) {
    return res.status(503).json({ message: 'This server has no voice installed, so audio must be uploaded as a recording' });
  }
  try {
    const name = await mediaStore.saveAudio(await ttsEngine.speak(text));
    return res.status(201).json({ url: `/api/v1/media/${name}`, synthetic: true });
  } catch (error) {
    if (error.message === 'too-long') return res.status(413).json({ message: 'The lesson is too long to voice in one piece' });
    if (error.message === 'timeout') return res.status(504).json({ message: 'Making the audio took too long; try a shorter lesson' });
    if (error.message === 'unsupported') return res.status(502).json({ message: 'The voice produced something that is not audio' });
    return res.status(503).json({ message: 'Could not make the audio' });
  }
};

// Reads the raw upload, up to the size limit, whatever type the browser sends.
export const readAudioBody = express.raw({ type: () => true, limit: MediaStore.maxBytes });

// Serves recordings with long caching and byte ranges (for seeking).
export const serveMedia = express.static(mediaStore.directory, {
  fallthrough: false,
  immutable: true,
  maxAge: '365d',
  setHeaders: (res, path) => {
    const type = MediaStore.typeByExtension[path.split('.').pop()];
    if (type) res.setHeader('Content-Type', type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
});
