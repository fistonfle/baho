import express from 'express';

import { MediaStore, mediaStore } from './MediaStore.js';

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

// Reads the raw upload, up to the size limit, whatever type the browser sends.
export const readAudioBody = express.raw({ type: () => true, limit: MediaStore.maxBytes });

// Serves recordings. Names are random, so files can be cached for a year;
// byte ranges are supported, so the player can seek.
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
