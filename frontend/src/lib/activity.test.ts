import { describe, expect, it } from 'vitest';

import { countStreak, dayKey } from './activity';

const daysBefore = (today: Date, ...offsets: number[]) =>
  new Set(offsets.map((offset) => {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    return dayKey(date);
  }));

describe('countStreak', () => {
  const today = new Date(2026, 9, 31);

  it('counts consecutive days ending today', () => {
    expect(countStreak(daysBefore(today, 0, 1, 2), today)).toBe(3);
  });

  it('still counts a streak that ended yesterday', () => {
    expect(countStreak(daysBefore(today, 1, 2), today)).toBe(2);
  });

  it('stops at the first missing day', () => {
    expect(countStreak(daysBefore(today, 0, 1, 3, 4), today)).toBe(2);
  });

  it('is zero with no recent activity', () => {
    expect(countStreak(daysBefore(today, 2, 3), today)).toBe(0);
    expect(countStreak(new Set(), today)).toBe(0);
  });

  it('crosses month and year boundaries', () => {
    const newYear = new Date(2027, 0, 1);
    expect(countStreak(daysBefore(newYear, 0, 1, 2), newYear)).toBe(3);
  });
});
