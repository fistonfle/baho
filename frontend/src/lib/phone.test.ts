import { describe, expect, it } from 'vitest';

import { isPin, isRwandanPhone } from './phone';

describe('isRwandanPhone', () => {
  it.each(['0781234567', '078 123 4567', '+250 78 123 4567', '250781234567', '0721234567', '0791234567'])('accepts %s', (value) => {
    expect(isRwandanPhone(value)).toBe(true);
  });

  it.each(['0712345678', '078123456', '07812345678', '+254781234567', 'abcdefghij', ''])('rejects %s', (value) => {
    expect(isRwandanPhone(value)).toBe(false);
  });
});

describe('isPin', () => {
  it('accepts 4 to 6 digits only', () => {
    expect(['1234', '12345', '123456'].every(isPin)).toBe(true);
    expect(['123', '1234567', '12a4', ''].some(isPin)).toBe(false);
  });
});
