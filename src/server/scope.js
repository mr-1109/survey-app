import 'server-only';
import { getLocalDb } from './db/local';
import {
  LEVEL_KEYS,
  emptyGrant,
  grantWithin,
  isUnrestricted,
  isWithin,
  normaliseScope,
} from '@shared/scope';

/**
 * Turns the signed-in account into the scope it may act within, and turns that
 * scope into concrete filters.
 *
 * The scope is stored in nndb's `user_scope`, but it is read here off the
 * snapshot taken when the session was created, so no request has to reach the
 * remote host. The bootstrap account (accounts.is_super) carries none and sees
 * everything. An account with no active user row is treated as seeing nothing,
 * so a hole can never fail open.
 */

export const UNRESTRICTED = null;
export const NOTHING = Object.freeze({ __denyAll: true });

export function scopeForAccount(account) {
  if (!account) return NOTHING;
  if (account.isSuper) return UNRESTRICTED;
  // null — as opposed to [] — means the login has no user row behind it.
  if (account.scope === null || account.scope === undefined) return NOTHING;

  const scope = normaliseScope(account.scope);
  return isUnrestricted(scope) ? UNRESTRICTED : scope;
}

export function deniesEverything(scope) {
  return scope === NOTHING;
}

export function isFullAccess(scope) {
  return scope === UNRESTRICTED || (scope !== NOTHING && isUnrestricted(scope));
}

/** Can this viewer create/manage a user carrying `target` scope? */
export function canAssign(viewerScope, target) {
  if (deniesEverything(viewerScope)) return false;
  if (isFullAccess(viewerScope)) return true;
  return isWithin(target, viewerScope);
}

/**
 * Fills levels the admin left blank with the creator's own values, then checks
 * the result is inside the creator's scope.
 *
 * Inheritance is resolved here, at save time, rather than when the scope is
 * read. A scope that quietly re-derives from its creator would shift under
 * everyone the day that creator changes, with no record of what a user could
 * reach at the time they reached it.
 *
 * A submitted grant may match more than one of the creator's grants — a
 * creator holding वार्ड 38 and वार्ड 40 who leaves वार्ड blank means both — so
 * each match yields its own filled grant.
 *
 * Returns { ok: true, scope } or { ok: false, reason }.
 */
export function materialiseScope(submitted, creatorScope) {
  if (deniesEverything(creatorScope)) return { ok: false, reason: 'no_scope' };

  const grants = normaliseScope(submitted);
  if (isFullAccess(creatorScope)) return { ok: true, scope: grants };

  const creatorGrants = normaliseScope(creatorScope);
  // Nothing chosen at all means "everything the creator has".
  if (!grants.length) return { ok: true, scope: creatorGrants.map((g) => ({ ...g })) };

  const filled = [];
  for (const grant of grants) {
    // Compatible = agrees with the creator everywhere both sides pin a value.
    const matches = creatorGrants.filter((c) =>
      LEVEL_KEYS.every((key) => {
        const bound = c[key] ?? [];
        const values = grant[key] ?? [];
        if (!bound.length || !values.length) return true;
        return values.every((v) => bound.includes(v));
      }),
    );
    if (!matches.length) return { ok: false, reason: 'outside' };

    for (const match of matches) {
      const out = emptyGrant();
      for (const key of LEVEL_KEYS) {
        const values = grant[key] ?? [];
        out[key] = values.length ? [...values] : [...(match[key] ?? [])];
      }
      if (!grantWithin(out, match)) return { ok: false, reason: 'outside' };
      const signature = JSON.stringify(out);
      if (!filled.some((f) => JSON.stringify(f) === signature)) filled.push(out);
    }
  }

  return { ok: true, scope: filled };
}

/**
 * Builds `(A AND B) OR (C)` style SQL from a grant list.
 *
 * `columns` maps a level key to its column name; levels absent from the map
 * have no counterpart in the table and cannot narrow rows. Named parameters are
 * returned so callers can merge them into their own bindings.
 */
function buildPredicate(scope, columns, { alias = '', cast = false } = {}) {
  if (isFullAccess(scope)) return { sql: '', params: {} };
  if (deniesEverything(scope)) return { sql: ' AND 1=0', params: {} };

  const prefix = alias ? `${alias}.` : '';
  const params = {};
  const groups = [];
  let n = 0;

  for (const grant of normaliseScope(scope)) {
    const clauses = [];
    for (const [level, column] of Object.entries(columns)) {
      const values = grant[level] ?? [];
      if (!values.length) continue;
      const names = values.map((value) => {
        const key = `sc${n++}`;
        params[key] = cast ? Number(value) : String(value);
        return `:${key}`;
      });
      clauses.push(
        names.length === 1
          ? `${prefix}${column} = ${names[0]}`
          : `${prefix}${column} IN (${names.join(', ')})`,
      );
    }
    // A grant that pins nothing this table understands allows everything.
    if (!clauses.length) return { sql: '', params: {} };
    groups.push(clauses.length === 1 ? clauses[0] : `(${clauses.join(' AND ')})`);
  }

  if (!groups.length) return { sql: '', params: {} };
  return {
    sql: ` AND ${groups.length === 1 ? groups[0] : `(${groups.join(' OR ')})`}`,
    params,
  };
}

/**
 * Roll-table columns. संभाग and लोकसभा have no column at all, so they bound
 * *assignment* rather than data — and DISTT / TEHSIL / CITY contribute nothing
 * while they are NULL, since a scope can only carry a value there once the roll
 * does.
 */
const ROLL_COLUMNS = {
  district: 'DISTT',
  assembly: 'RESITYPE',
  tehsil: 'TEHSIL',
  city: 'CITY',
  ward: 'WARD',
  bhag: 'BHAG',
};

export function voterPredicate(scope) {
  return buildPredicate(scope, ROLL_COLUMNS);
}

/** Local `houses` columns for each level that narrows the imported roll. */
const HOUSE_COLUMNS = {
  district: 'district',
  assembly: 'assembly',
  tehsil: 'tehsil',
  city: 'city',
  ward: 'ward_no',
  bhag: 'part_no',
};

/**
 * `houses` predicate for a scope — the survey app's counterpart to
 * voterPredicate, since every screen reads local SQLite rather than the roll.
 *
 * It is always ANDed on top of the caller's own filters, which is what makes a
 * widening request harmless: a ward-38 user asking for ward 45 gets
 * `ward_no = '45' AND ward_no = '38'` and sees nothing.
 */
export function housePredicate(scope, alias = '') {
  return buildPredicate(scope, HOUSE_COLUMNS, { alias });
}

/**
 * The भाग numbers a scope covers, or null for unrestricted. Read from the
 * imported roll in local SQLite rather than the remote table, so it costs one
 * indexed query and works offline.
 */
export function allowedBhags(scope) {
  if (isFullAccess(scope)) return null;
  if (deniesEverything(scope)) return new Set();

  const sc = housePredicate(scope);
  if (!sc.sql) return null;

  const rows = getLocalDb()
    .prepare(`SELECT DISTINCT part_no AS b FROM houses WHERE is_deleted = 0${sc.sql}`)
    .all(sc.params);
  return new Set(rows.map((r) => Number(r.b)));
}

export function isBhagInScope(scope, bhag) {
  const allowed = allowedBhags(scope);
  return allowed === null || allowed.has(Number(bhag));
}

/** Only users whose scope sits inside the viewer's. */
export function filterUsersByScope(rows, viewerScope) {
  if (isFullAccess(viewerScope)) return rows;
  if (deniesEverything(viewerScope)) return [];
  return rows.filter((row) => isWithin(row.scope, viewerScope));
}

export { LEVEL_KEYS };
