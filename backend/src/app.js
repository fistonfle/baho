import express from 'express';
import cors from 'cors';

import apiRoutes from './routes/index.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/v1', apiRoutes);

// Errors from body parsing and file serving (too large, not found) as JSON.
app.use((error, _req, res, _next) => {
  const status = error.status || error.statusCode || 500;
  const messages = { 404: 'Not found', 413: 'The upload is too large' };
  res.status(status).json({ message: messages[status] || 'Something went wrong' });
});

export default app;
