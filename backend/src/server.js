import app from './app.js';
import connectDatabase from './config/db.js';
import { seedInitialAdmin } from './modules/auth/bootstrap.js';
import { startReminderMailer } from './modules/reminders/reminder.mailer.js';

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  await connectDatabase();
  const adminSeed = await seedInitialAdmin();
  if (adminSeed.seeded) console.log('Initial administrator account seeded from environment.');

  startReminderMailer();

  app.listen(PORT, () => {
    console.log(`Baho backend running on http://localhost:${PORT}`);
  });
};

startServer();
