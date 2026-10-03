const unavailableCodes = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ETIMEDOUT',
  '28P01',
  '3D000',
  '42P01'
]);

export const isDatabaseUnavailable = (error) => unavailableCodes.has(error?.code);
