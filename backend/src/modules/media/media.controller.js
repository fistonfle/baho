import express from 'express';

import { MediaStore, mediaStore } from './MediaStore.js';
import { ttsEngine } from './TtsEngine.js';

// Markup is for the eye. The voice is given words alone.
const plain = (text) => String(text || '')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[*_`>#|]/g, ' ')
  .replace(/^\s*[-+]\s+/gm, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const ordinals = ['mbere', 'kabiri', 'gatatu', 'kane', 'gatanu', 'gatandatu'];
const nth = (index) => ordinals[index] ?? String(index + 1);

// A title that is already a question keeps its mark instead of collecting a stop.
const sentence = (text) => (/[.!?]$/.test(text) ? text : `${text}.`);

// A line of dots asks the voice for silence, which is where the learner answers.
export const thinkingPause = '...';

// The lesson as a listener hears it: the text, then each question, a silence, the answer.
export const speakable = (title, body, quiz = []) => {
  const lines = [[title, body].map(plain).filter(Boolean).map(sentence).join(' ')];

  for (const [index, item] of (Array.isArray(quiz) ? quiz : []).entries()) {
    const asked = plain(item?.question);
    const options = (Array.isArray(item?.options) ? item.options : []).map(plain).filter(Boolean);
    const answer = options[Number(item?.answerIndex)];
    if (!asked || !answer) continue;
    lines.push(sentence(`Ikibazo cya ${nth(index)}. ${asked}`));
    lines.push(options.map((option, position) => sentence(`Icya ${nth(position)}: ${option}`)).join(' '));
    lines.push(thinkingPause);
    lines.push(sentence(`Igisubizo nyacyo ni ${answer}`));
  }

  const script = lines.filter(Boolean).join('\n');
  // Punctuation alone is not speech; a voice given it returns noise, not an error.
  return /[\p{L}\p{N}]/u.test(script) ? script : '';
};

// A disease page as a listener hears it: what it is, then each list under its own heading.
export const speakableDisease = (disease = {}) => {
  const heading = (label, items) => {
    const spoken = (Array.isArray(items) ? items : []).map(plain).filter(Boolean);
    return spoken.length ? [sentence(label), ...spoken.map(sentence)].join(' ') : '';
  };
  const lines = [
    [plain(disease.name), plain(disease.about)].filter(Boolean).map(sentence).join(' '),
    heading('Ibyongera ibyago', disease.riskFactors),
    heading('Ibimenyetso byo kwitondera', disease.warningSigns),
    heading('Uko wayirinda', disease.prevention)
  ];
  const script = lines.filter(Boolean).join('\n');
  return /[\p{L}\p{N}]/u.test(script) ? script : '';
};

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

// Spoken once and stored like an upload, so it plays offline and replaying costs nothing.
const voice = async (res, text, missing) => {
  if (!text) return res.status(400).json({ message: missing });
  if (!ttsEngine.isConfigured()) {
    return res.status(503).json({ message: 'This server has no voice installed, so audio must be uploaded as a recording' });
  }
  try {
    const name = await mediaStore.saveAudio(await ttsEngine.speak(text));
    return res.status(201).json({ url: `/api/v1/media/${name}`, synthetic: true });
  } catch (error) {
    if (error.message === 'too-long') return res.status(413).json({ message: 'The text is too long to voice in one piece' });
    if (error.message === 'timeout') return res.status(504).json({ message: 'Making the audio took too long; try a shorter text' });
    if (error.message === 'unsupported') return res.status(502).json({ message: 'The voice produced something that is not audio' });
    return res.status(503).json({ message: 'Could not make the audio' });
  }
};

// POST /admin/media/audio/generate, for a lesson and its quiz.
export const generateAudio = (req, res) => {
  const { title = '', body = '', quiz = [] } = req.body || {};
  return voice(res, speakable(title, body, quiz), 'Write the lesson first, then generate its audio');
};

// POST /admin/media/audio/generate/disease. Whoever writes the disease page may also voice it.
export const generateDiseaseAudio = (req, res) =>
  voice(res, speakableDisease(req.body || {}), 'Describe the disease first, then generate its audio');

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
