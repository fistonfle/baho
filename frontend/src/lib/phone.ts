// Same rule as the server (backend/src/modules/auth/phone.js): a Rwandan mobile
// number (072, 073, 078 or 079) written with or without +250, spaces or dashes.
export const isRwandanPhone = (value: string) => /^(?:\+?250|0)7[2389]\d{7}$/.test(value.replace(/[\s().-]/g, ''));

export const isPin = (value: string) => /^\d{4,6}$/.test(value);
