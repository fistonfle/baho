// Learning streak: the number of consecutive days (ending today or yesterday)
// on which the learner finished a lesson or a knowledge check.

const ACTIVITY_KEY = 'baho-activity-days';

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const readDays = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
  } catch {
    return [];
  }
};

export const recordActivity = () => {
  const days = new Set(readDays());
  days.add(dayKey(new Date()));
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify([...days].slice(-60)));
};

export const getStreak = () => {
  const days = new Set(readDays());
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

// The last seven days, oldest first, for the small streak calendar.
export const getWeek = () => {
  const days = new Set(readDays());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { label: ['Cyu', 'Mbe', 'Kab', 'Gtu', 'Kan', 'Gnu', 'Gnd'][date.getDay()], active: days.has(dayKey(date)) };
  });
};
