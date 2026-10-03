import { isDbConnected } from '../../config/db.js';

export const getHealth = (_req, res) => {
  res.json({
    status: 'ok',
    service: 'baho-backend',
    database: isDbConnected() ? 'postgres-connected' : 'demo-mode'
  });
};
