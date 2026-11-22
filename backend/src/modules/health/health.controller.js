import { isDbConnected } from '../../config/db.js';
import { ttsEngine } from '../media/TtsEngine.js';

export const getHealth = async (_req, res) => {
  res.json({
    status: 'ok',
    service: 'baho-backend',
    database: isDbConnected() ? 'postgres-connected' : 'demo-mode',
    voice: await ttsEngine.probe()
  });
};
