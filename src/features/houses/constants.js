export const STATUS_LABELS = {
  pending: 'नोट शुरू',
  partial: 'ड्राफ्ट',
  done: 'पूर्ण',
};

export const STATUS_TABS = [
  { value: 'all', label: 'सभी' },
  { value: 'pending', label: 'लंबित' },
  { value: 'partial', label: 'ड्राफ्ट' },
  { value: 'done', label: 'पूर्ण' },
];

export const RELATION_LABELS = {
  father: 'पिता का नाम',
  husband: 'पति का नाम',
  mother: 'माता का नाम',
  other: 'अन्य का नाम',
};

export function relationLabel(relation) {
  return RELATION_LABELS[relation] ?? 'अन्य का नाम';
}

export function genderLabel(g) {
  if (g === 'M') return 'पुरुष';
  if (g === 'F') return 'महिला';
  if (g === 'O') return 'अन्य';
  return '—';
}

export const GENDER_OPTIONS = [
  { value: 'M', label: 'पुरुष' },
  { value: 'F', label: 'महिला' },
  { value: 'O', label: 'अन्य' },
];

export const MARITAL_STATUS_OPTIONS = [
  { value: 'अविवाहित', label: 'अविवाहित' },
  { value: 'विवाहित', label: 'विवाहित' },
  { value: 'विधवा/विधुर', label: 'विधवा / विधुर' },
];

export const CASTE_OPTIONS = [
  { value: 'सामान्य', label: 'सामान्य' },
  { value: 'ओबीसी', label: 'ओबीसी' },
  { value: 'एससी', label: 'एससी' },
  { value: 'एसटी', label: 'एसटी' },
  { value: 'अन्य', label: 'अन्य' },
];

// परिवार सर्वेक्षण — screens 8/9 (GHAR_SURVEY_PLAN.md §0.10)
export const POLITICAL_PARTY_OPTIONS = [
  { value: 'bjp', label: 'भाजपा' },
  { value: 'congress', label: 'कांग्रेस' },
  { value: 'other', label: 'अन्य (पार्टी का नाम)' },
  { value: 'none', label: 'किसी भी पार्टी से नहीं' },
];

export const DEVELOPMENT_WORK_OPTIONS = [
  { value: 'road', label: 'सड़क अच्छी हुई है।' },
  { value: 'electricity', label: 'बिजली कटौती कम हुई है।' },
  { value: 'cleanliness', label: 'साफ-सफाई अच्छी हुई है।' },
  { value: 'water', label: 'पेयजल आपूर्ति में सुधार हुआ है।' },
];

export const CM_SATISFACTION_OPTIONS = [
  { value: 'very_satisfied', label: 'बहुत संतुष्ट' },
  { value: 'satisfied', label: 'संतुष्ट' },
  { value: 'neutral', label: 'सामान्य' },
  { value: 'dissatisfied', label: 'असंतुष्ट' },
  { value: 'very_dissatisfied', label: 'बहुत असंतुष्ट' },
];

export function politicalPartyLabel(v) {
  return POLITICAL_PARTY_OPTIONS.find((o) => o.value === v)?.label ?? '—';
}

export function cmSatisfactionLabel(v) {
  return CM_SATISFACTION_OPTIONS.find((o) => o.value === v)?.label ?? '—';
}

export function developmentSummary(json) {
  let arr = [];
  try {
    arr = JSON.parse(json || '[]');
  } catch {
    arr = [];
  }
  return `${arr.length} चयनित`;
}

export function parseJsonArray(json) {
  try {
    const arr = JSON.parse(json || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
