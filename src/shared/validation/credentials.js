/** Shared by the signup form and the API route, so both agree exactly. */

export const PASSWORD_RULES = [
  { key: 'length', label: 'कम से कम 8 अक्षर', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'एक बड़ा अक्षर (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'एक छोटा अक्षर (a-z)', test: (v) => /[a-z]/.test(v) },
  { key: 'digit', label: 'एक अंक (0-9)', test: (v) => /\d/.test(v) },
  {
    key: 'special',
    label: 'एक विशेष चिह्न (!@#$…)',
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

export function checkPassword(value = '') {
  return PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(value) }));
}

export function isPasswordValid(value = '') {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

/** Exactly 10 digits. Strips non-digits first so pasted numbers still work. */
export function normalizePhone(value = '') {
  return String(value).replace(/\D/g, '');
}

export function isPhoneValid(value = '') {
  return /^\d{10}$/.test(normalizePhone(value));
}
