// Same check as backend/src/modules/auth/phone.js.
export const isRwandanPhone = (value: string) => /^(?:\+?250|0)7[2389]\d{7}$/.test(value.replace(/[\s().-]/g, ''));

export const isPin = (value: string) => /^\d{4,6}$/.test(value);
