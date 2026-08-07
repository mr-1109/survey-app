/**
 * Geographic authority, expressed as a list of grants.
 *
 * A grant is one path down the ladder, where each level holds a *set* of
 * values: `{ ward: ['38','40'], bhag: [] }` means "wards 38 and 40, every भाग
 * within them". An empty set at a level means no restriction there.
 *
 * A scope is a list of grants, ORed together. Two grants are what let someone
 * hold भाग 1 of वार्ड 38 *and* भाग 5 of वार्ड 40 without also being handed
 * भाग 5 of वार्ड 38 — the cross-product a single grant would imply. An empty
 * list means unrestricted.
 *
 * `column` is where a level's values come from in the roll. Levels with no
 * column, or whose column is NULL across the roll, offer no options and stay
 * blank rather than being dropped or guessed at.
 */

export const LEVELS = [
  { key: 'sambhag', label: 'संभाग', column: null },
  { key: 'district', label: 'जिला', column: 'DISTT' },
  { key: 'lok_sabha', label: 'लोकसभा', column: null },
  { key: 'assembly', label: 'विधानसभा', column: 'RESITYPE' },
  { key: 'tehsil', label: 'तहसील', column: 'TEHSIL' },
  { key: 'city', label: 'शहर / गाँव', column: 'CITY' },
  { key: 'ward', label: 'वार्ड', column: 'WARD' },
  { key: 'bhag', label: 'भाग', column: 'BHAG' },
];

export const LEVEL_KEYS = LEVELS.map((l) => l.key);

export function levelLabel(key) {
  return LEVELS.find((l) => l.key === key)?.label ?? key;
}

/** An empty grant — every level unrestricted. */
export function emptyGrant() {
  return Object.fromEntries(LEVEL_KEYS.map((k) => [k, []]));
}

/** Coerces anything (a single value, an array, null) into a clean value set. */
function toSet(raw) {
  const list = Array.isArray(raw) ? raw : [raw];
  const seen = new Set();
  for (const v of list) {
    if (v === null || v === undefined || v === '') continue;
    seen.add(String(v));
  }
  return [...seen];
}

/**
 * Normalises loose input into a grant list. Accepts a grant list, a single
 * grant, or a legacy flat `{ ward: '38' }` scope — so old stored rows and old
 * request bodies keep working.
 */
export function normaliseScope(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];

  const grants = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const grant = emptyGrant();
    let any = false;
    for (const key of LEVEL_KEYS) {
      grant[key] = toSet(item[key]);
      if (grant[key].length) any = true;
    }
    if (any) grants.push(grant);
  }
  return grants;
}

export function isUnrestricted(scope) {
  return normaliseScope(scope).length === 0;
}

/** Index of the narrowest level a grant pins, or -1 when it pins nothing. */
export function grantDepth(grant) {
  let found = -1;
  LEVEL_KEYS.forEach((key, i) => {
    if (grant?.[key]?.length) found = i;
  });
  return found;
}

/** Is every value in `inner` covered by `outer`, level by level? */
export function grantWithin(inner, outer) {
  return LEVEL_KEYS.every((key) => {
    const bound = outer?.[key] ?? [];
    if (!bound.length) return true; // outer unrestricted here
    const values = inner?.[key] ?? [];
    // Leaving a level open that the creator restricts is *wider*, not narrower.
    if (!values.length) return false;
    return values.every((v) => bound.includes(v));
  });
}

/**
 * True when `inner` sits inside `outer`: every grant of `inner` must fit inside
 * at least one grant of `outer`. "At least one" is deliberate — it lets a user
 * carve from either of their grants, but never mix halves of two.
 */
export function isWithin(inner, outer) {
  const outerGrants = normaliseScope(outer);
  if (!outerGrants.length) return true; // outer is unrestricted

  const innerGrants = normaliseScope(inner);
  if (!innerGrants.length) return false; // unrestricted is wider than any bound

  return innerGrants.every((g) => outerGrants.some((o) => grantWithin(g, o)));
}

/**
 * Levels fixed to the creator's own values — shown read-only in the form.
 * A level locks only when every grant agrees on one value for it; where grants
 * disagree the form offers the union instead.
 */
export function lockedValues(scope) {
  const grants = normaliseScope(scope);
  if (!grants.length) return {};

  const locked = {};
  for (const key of LEVEL_KEYS) {
    const values = new Set();
    for (const g of grants) for (const v of g[key]) values.add(v);
    if (values.size === 1 && grants.every((g) => g[key].length === 1)) {
      locked[key] = [...values][0];
    }
  }
  return locked;
}

/** Every value a scope allows at one level, across all its grants. */
export function valuesAtLevel(scope, key) {
  const out = new Set();
  for (const g of normaliseScope(scope)) for (const v of g[key] ?? []) out.add(v);
  return [...out];
}

function grantSummary(grant) {
  const parts = LEVEL_KEYS.map((key) => {
    const values = grant[key] ?? [];
    if (!values.length) return null;
    const joined = values.join(', ');
    if (key === 'ward') return `वार्ड ${joined}`;
    if (key === 'bhag') return `भाग ${joined}`;
    return joined;
  }).filter(Boolean);
  return parts.join(' › ');
}

/** "वार्ड 38 › भाग 1 + वार्ड 40", or a plain label when unrestricted. */
export function scopeSummary(scope, fallback = 'पूरा क्षेत्र') {
  const grants = normaliseScope(scope);
  if (!grants.length) return fallback;
  return grants.map(grantSummary).filter(Boolean).join('  +  ') || fallback;
}

/** Flattens a scope to `[{ grant_no, level, value }]` rows for storage. */
export function scopeToRows(scope) {
  const rows = [];
  normaliseScope(scope).forEach((grant, i) => {
    for (const key of LEVEL_KEYS) {
      for (const value of grant[key]) rows.push({ grant_no: i + 1, level: key, value });
    }
  });
  return rows;
}

/** Rebuilds a scope from stored `{ grant_no, level, value }` rows. */
export function scopeFromRows(rows = []) {
  const byGrant = new Map();
  for (const r of rows) {
    if (!LEVEL_KEYS.includes(r.level)) continue;
    const n = Number(r.grant_no) || 1;
    if (!byGrant.has(n)) byGrant.set(n, emptyGrant());
    byGrant.get(n)[r.level].push(String(r.value));
  }
  return [...byGrant.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);
}
