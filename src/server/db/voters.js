import 'server-only';
import { query } from './pool';

/**
 * Every SQL string in the app lives in this file. Route handlers and components
 * must not build SQL. Every user-supplied value goes through a `?` placeholder;
 * the only interpolated fragments are picked from the whitelists below.
 */

const TABLE = 'SIR_RJ188_F';

const LIST_COLUMNS = `
  VLISTID, VOTERID, BHAG, VNAME, FNAME, RELATION, HNO, AREACOLONY,
  SECTION_NO, CITY, TEHSIL, GENERALNOTES, SEX, AGE, IDCARD_NO,
  FEEDBACK_STATUS, PHONE1, PHONE2
`;
// PHONE1/PHONE2 are NULL on all 201,002 rows today. They are selected so the
// call button lights up the moment numbers exist, rather than needing a code
// change then.

/** Stored FEEDBACK_STATUS values. Anything else is rejected with 400. */
export const FEEDBACK_VALUES = ['bjp', 'congress', 'other', 'not_found'];

/** ORDER BY cannot be parameterised — whitelist it instead. */
const SORTS = {
  booth: 'BHAG, VOTERID',
  name: 'VNAME, BHAG, VOTERID',
};
const DEFAULT_SORT = 'booth';

export const PAGE_SIZE = 25;
const MAX_LIMIT = 500;
const MIN_SEARCH_LENGTH = 2;

export function isFeedbackValue(value) {
  return FEEDBACK_VALUES.includes(value);
}

function clampLimit(limit) {
  const n = Number(limit);
  if (!Number.isInteger(n) || n < 1) return PAGE_SIZE;
  return Math.min(n, MAX_LIMIT);
}

/**
 * Booth-scoped voter list. Always returns at most `limit` rows — there is no
 * code path here that issues a query without a LIMIT.
 */
export async function listVoters({
  bhag = null,
  kshetra = null,
  feedback = 'all',
  q = '',
  epic = '',
  limit = PAGE_SIZE,
  sort = DEFAULT_SORT,
  // Predicate from the viewer's scope. Always applied — a caller that forgets
  // to pass it gets the unfiltered default, so every route must supply one.
  scope = { sql: '', params: [] },
} = {}) {
  const where = ['1=1'];
  const params = [];

  if (scope.sql) {
    where.push(scope.sql.replace(/^\s*AND\s+/i, ''));
    params.push(...scope.params);
  }

  // Exact EPIC match identifies one voter across all 266 booths. It is a full
  // scan (IDCARD_NO is unindexed) but returns ~1 row, so it needs no booth.
  const epicTerm = String(epic ?? '').trim();
  if (epicTerm) {
    where.push('IDCARD_NO = ?');
    params.push(epicTerm);
  }

  if (bhag !== null && bhag !== '' && bhag !== 'all') {
    where.push('BHAG = ?');
    params.push(Number(bhag));
  }

  if (kshetra) {
    where.push('GENERALNOTES = ?');
    params.push(kshetra);
  }

  if (feedback && feedback !== 'all') {
    if (feedback === 'not_found') {
      // 201,001 of 201,002 rows are NULL — the tab must catch both.
      where.push("(FEEDBACK_STATUS = 'not_found' OR FEEDBACK_STATUS IS NULL)");
    } else {
      where.push('FEEDBACK_STATUS = ?');
      params.push(feedback);
    }
  }

  const term = String(q ?? '').trim();
  if (term.length >= MIN_SEARCH_LENGTH) {
    where.push('(VNAME LIKE ? OR FNAME LIKE ?)');
    params.push(`%${term}%`, `%${term}%`);
  }

  const orderBy = SORTS[sort] ?? SORTS[DEFAULT_SORT];
  const capped = clampLimit(limit);

  const sql = `
    SELECT ${LIST_COLUMNS}
    FROM ${TABLE}
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ?
  `;

  // One extra row tells the UI whether "और देखें" has anything left to show.
  const [rows] = await query(sql, [...params, capped + 1]);
  const hasMore = rows.length > capped;

  return { voters: hasMore ? rows.slice(0, capped) : rows, hasMore };
}

/**
 * Filter options: 266 booths and the 3 GENERALNOTES zones.
 *
 * Both lists are fixed reference data — the app only ever writes
 * FEEDBACK_STATUS, so neither can change while it runs. Each round trip to
 * this host costs ~250ms and the GENERALNOTES scan reads 199k rows, so this
 * is a single query and the result is cached (on globalThis, to survive dev
 * hot reloads).
 */
const FACETS_TTL_MS = 10 * 60 * 1000;
const FACETS_SHAPE = 2; // bump when the payload shape changes, or dev serves a stale cache
const globalForFacets = globalThis;

export async function getFacets() {
  const cached = globalForFacets.__votersFacets;
  if (cached && cached.shape === FACETS_SHAPE && Date.now() - cached.at < FACETS_TTL_MS) {
    return cached.value;
  }

  // One row per (booth, zone). Verified against the table: every BHAG sits in
  // exactly one GENERALNOTES zone, so this is 266 rows and doubles as the
  // booth→zone map the filter bar needs to avoid offering empty combinations.
  const [rows] = await query(
    `SELECT BHAG, GENERALNOTES FROM ${TABLE}
     WHERE BHAG IS NOT NULL AND GENERALNOTES IS NOT NULL AND GENERALNOTES <> ''
     GROUP BY BHAG, GENERALNOTES
     ORDER BY BHAG`,
  );

  const bhagKshetra = {};
  for (const row of rows) bhagKshetra[row.BHAG] = row.GENERALNOTES;

  const value = {
    bhagList: rows.map((r) => r.BHAG),
    kshetraList: [...new Set(rows.map((r) => r.GENERALNOTES))].sort((a, b) =>
      a.localeCompare(b, 'hi'),
    ),
    bhagKshetra,
  };
  globalForFacets.__votersFacets = { at: Date.now(), shape: FACETS_SHAPE, value };
  return value;
}

/**
 * Voters per भाग — the denominator for every booth progress bar.
 * Index-only scan on idx_bhag (~315ms), 266 rows. Cached like the geo tree.
 */
const BOOTHS_TTL_MS = 10 * 60 * 1000;
const globalForBooths = globalThis;

export async function getBoothCounts() {
  const cached = globalForBooths.__votersBooths;
  if (cached && Date.now() - cached.at < BOOTHS_TTL_MS) return cached.value;

  const [rows] = await query(
    `SELECT BHAG, COUNT(*) AS n FROM ${TABLE}
     WHERE BHAG IS NOT NULL GROUP BY BHAG ORDER BY n DESC, BHAG`,
  );

  const value = {
    booths: rows.map((r) => ({ bhag: r.BHAG, voters: Number(r.n) })),
    total: rows.reduce((sum, r) => sum + Number(r.n), 0),
  };
  globalForBooths.__votersBooths = { at: Date.now(), value };
  return value;
}

/**
 * Recorded-feedback tally, for the whole AC or one booth. Index-only scan on
 * idx_feedback (~270ms, one round trip). NULL is folded into not_found to
 * match the पता नहीं tab.
 */
export async function getFeedbackSummary(bhag = null, scope = { sql: '', params: [] }) {
  const scoped = bhag !== null && bhag !== '' && bhag !== 'all';
  const where = ['1=1'];
  const params = [];
  if (scoped) {
    where.push('BHAG = ?');
    params.push(Number(bhag));
  }
  if (scope.sql) {
    where.push(scope.sql.replace(/^\s*AND\s+/i, ''));
    params.push(...scope.params);
  }

  const [rows] = await query(
    `SELECT FEEDBACK_STATUS, COUNT(*) AS n FROM ${TABLE}
     WHERE ${where.join(' AND ')}
     GROUP BY FEEDBACK_STATUS`,
    params,
  );

  const counts = { bjp: 0, congress: 0, other: 0, not_found: 0 };
  let total = 0;
  for (const row of rows) {
    const key = row.FEEDBACK_STATUS ?? 'not_found';
    const n = Number(row.n);
    total += n;
    if (key in counts) counts[key] += n;
    else counts.not_found += n; // any legacy value lands in पता नहीं
  }

  return { counts, total, recorded: total - counts.not_found };
}

/**
 * The app's only write. Caller must have validated `feedback` with
 * isFeedbackValue() first. Returns false when no such VLISTID exists.
 */
/** The भाग a voter belongs to, for scope checks before a write. */
export async function getVoterBhag(vlistid) {
  const [rows] = await query(`SELECT BHAG FROM ${TABLE} WHERE VLISTID = ?`, [Number(vlistid)]);
  return rows.length ? rows[0].BHAG : null;
}

export async function updateFeedback(vlistid, feedback) {
  const [result] = await query(
    `UPDATE ${TABLE} SET FEEDBACK_STATUS = ? WHERE VLISTID = ?`,
    [feedback, Number(vlistid)],
  );
  return result.affectedRows > 0;
}
