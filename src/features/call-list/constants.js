/** Stored FEEDBACK_STATUS value → Hindi label. Mirrors the server whitelist. */
export const FEEDBACK_OPTIONS = [
  { value: 'bjp', label: 'बीजेपी' },
  { value: 'congress', label: 'कांग्रेस' },
  { value: 'other', label: 'अन्य' },
  { value: 'not_found', label: 'पता नहीं' },
];

/** Tab strip: सभी + the four feedback values. */
export const FEEDBACK_TABS = [{ value: 'all', label: 'सभी' }, ...FEEDBACK_OPTIONS];

export const PAGE_SIZE = 25;

export function feedbackLabel(value) {
  return FEEDBACK_OPTIONS.find((o) => o.value === value)?.label ?? 'पता नहीं';
}

export function relationLabel(relation) {
  if (relation === 'H') return 'पति का नाम';
  if (relation === 'F') return 'पिता का नाम';
  if (relation === 'M') return 'माता का नाम';
  return 'अन्य का नाम';
}

export function sexLabel(sex) {
  if (sex === 'M') return 'पुरुष';
  if (sex === 'F') return 'महिला';
  return 'अन्य';
}
