import 'server-only';
import { getLocalDb, getMeta } from './local';
import { housePredicate } from '../scope';
import { foldDigits } from '@shared/houseNumber';

/**
 * घर (house) survey data. Entirely local SQLite — seeded from EROLL_NN055,
 * relationship to the remote rj188db AC-188 voter table (different
 * constituency, different key space). See GHAR_SURVEY_PLAN.md.
 */

// Family-survey vocabulary (screens 8/9, GHAR_SURVEY_PLAN.md §0.10 / §3).
export const POLITICAL_PARTY_VALUES = ['bjp', 'congress', 'other', 'none'];
export const DEVELOPMENT_WORK_KEYS = ['road', 'electricity', 'cleanliness', 'water'];
export const CM_SATISFACTION_VALUES = [
  'very_satisfied',
  'satisfied',
  'neutral',
  'dissatisfied',
  'very_dissatisfied',
];

const PAGE_SIZE = 25;

function surveyStatus(house, survey) {
  const houseComplete = Boolean(house?.head_name && house?.mobile && house?.area);
  if (!survey) return houseComplete ? 'partial' : 'pending';

  const familyAnswered = [
    survey.political_party,
    survey.cm_satisfaction,
  ].filter(Boolean).length;
  const hasDevelopment = survey.development_works && survey.development_works !== '[]';
  const familyTotal = familyAnswered + (hasDevelopment ? 1 : 0);

  if (familyTotal === 0) return houseComplete ? 'partial' : 'pending';
  if (familyTotal >= 2 && houseComplete) return 'done';
  return 'partial';
}

export function listHouses({ ward = 'all', part = 'all', status = 'all', q = '', limit = PAGE_SIZE, offset = 0, scope } = {}) {
  const db = getLocalDb();
  const sc = housePredicate(scope, 'h');
  const where = [`h.is_deleted = 0 AND COALESCE(h.total_members, 0) >= 2${sc.sql}`];
  const params = { ...sc.params };

  if (ward !== 'all' && ward !== '') {
    where.push('h.ward_no = :ward');
    params.ward = ward;
  }
  if (part !== 'all' && part !== '') {
    where.push('h.part_no = :part');
    params.part = part;
  }
  if (status !== 'all' && status !== '') {
    where.push('h.survey_status = :status');
    params.status = status;
  }
  // Houses are stored with ASCII digits, so a worker typing "१७" must still
  // match house 17.
  const term = foldDigits(String(q ?? '').trim());
  if (term) {
    where.push(
      `(h.head_name LIKE :q OR h.house_no LIKE :q OR h.house_no_raw LIKE :q OR h.area LIKE :q OR EXISTS (
         SELECT 1 FROM house_members m
         WHERE m.house_id = h.id AND m.is_deleted = 0 AND (m.name LIKE :q OR m.mobile LIKE :q)
       ))`,
    );
    params.q = `%${term}%`;
  }

  const capped = Math.max(1, Math.min(Number(limit) || PAGE_SIZE, 200));
  params.limit = capped + 1;
  params.offset = Math.max(0, Number(offset) || 0);

  const rows = db
    .prepare(
      `SELECT h.*
       FROM houses h
       WHERE ${where.join(' AND ')}
       ORDER BY h.ward_no, h.part_no, h.page, CAST(h.house_no AS INTEGER), h.house_no
       LIMIT :limit OFFSET :offset`,
    )
    .all(params);

  const hasMore = rows.length > capped;
  const houses = hasMore ? rows.slice(0, capped) : rows;

  return { houses, hasMore };
}

/** Shared WHERE for the count queries: viewer scope first, then their filters. */
function statsWhere(ward, part, scope) {
  const sc = housePredicate(scope);
  const conds = [`is_deleted = 0 AND COALESCE(total_members, 0) >= 2${sc.sql}`];
  const params = { ...sc.params };
  if (ward !== 'all' && ward !== '') { conds.push('ward_no = :ward'); params.ward = ward; }
  if (part !== 'all' && part !== '') { conds.push('part_no = :part'); params.part = part; }
  return { where: `WHERE ${conds.join(' AND ')}`, params };
}

export function getHouseStats(ward = 'all', part = 'all', scope) {
  const { where, params } = statsWhere(ward, part, scope);

  const totals = getLocalDb()
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN survey_status = 'done' THEN 1 ELSE 0 END), 0) AS done
       FROM houses ${where}`,
    )
    .get(params);

  return { total: totals.total, surveyed: totals.done };
}

/** Screen 1 (डैशबोर्ड होम) tiles. */
export function getDashboardStats(ward = 'all', part = 'all', scope) {
  const db = getLocalDb();
  const { where, params } = statsWhere(ward, part, scope);

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN survey_status = 'done' THEN 1 ELSE 0 END), 0) AS done,
              COALESCE(SUM(CASE WHEN survey_status = 'partial' THEN 1 ELSE 0 END), 0) AS draft,
              COALESCE(SUM(CASE WHEN survey_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending
       FROM houses ${where}`,
    )
    .get(params);

  const today = db
    .prepare(`SELECT COUNT(*) AS n FROM houses ${where} AND date(updated_at) = date('now','localtime')`)
    .get(params);

  return {
    total: totals.total,
    done: totals.done,
    draft: totals.draft,
    remaining: totals.pending,
    todaySurveys: today.n,
    lastSync: getMeta('last_sync_at'),
  };
}

export function getWardFacets(scope) {
  const sc = housePredicate(scope);
  const rows = getLocalDb()
    .prepare(
      `SELECT ward_no, COUNT(*) AS n FROM houses
       WHERE is_deleted = 0${sc.sql}
       GROUP BY ward_no ORDER BY CAST(ward_no AS INTEGER), ward_no`,
    )
    .all(sc.params);
  return rows.map((r) => ({ ward: r.ward_no, houses: r.n }));
}

export function getBhagFacets(ward = 'all', scope) {
  const sc = housePredicate(scope);
  const conds = [`is_deleted = 0${sc.sql}`];
  const params = { ...sc.params };
  if (ward !== 'all' && ward !== '') { conds.push('ward_no = :ward'); params.ward = ward; }

  const rows = getLocalDb()
    .prepare(
      `SELECT part_no, COUNT(*) AS n FROM houses
       WHERE ${conds.join(' AND ')}
       GROUP BY part_no ORDER BY CAST(part_no AS INTEGER), part_no`,
    )
    .all(params);
  return rows.map((r) => ({ bhag: r.part_no, houses: r.n }));
}

/**
 * जाति / उपजाति pick-lists for the house edit form (screen 5), read from the
 * values the roll actually carries (MAINCAST / SUBCAST) rather than a
 * hard-coded list. SUBCAST is empty across the whole roll today, so subcastes
 * comes back empty until that column is populated — the form still accepts a
 * typed value.
 */
export function getCasteFacets(caste = '', scope) {
  const db = getLocalDb();
  const sc = housePredicate(scope);

  const castes = db
    .prepare(
      `SELECT caste AS value, COUNT(*) AS n FROM houses
       WHERE is_deleted = 0${sc.sql} AND caste IS NOT NULL AND TRIM(caste) <> ''
       GROUP BY caste ORDER BY n DESC`,
    )
    .all(sc.params);

  const picked = String(caste ?? '').trim();
  const subcastes = db
    .prepare(
      `SELECT subcaste AS value, COUNT(*) AS n FROM houses
       WHERE is_deleted = 0${sc.sql}
         ${picked ? 'AND caste = :caste' : ''}
         AND subcaste IS NOT NULL AND TRIM(subcaste) <> ''
       GROUP BY subcaste ORDER BY n DESC`,
    )
    .all(picked ? { ...sc.params, caste: picked } : sc.params);

  return {
    castes: castes.map((r) => r.value),
    subcastes: subcastes.map((r) => r.value),
  };
}

/**
 * Options for each scope level, read from the imported roll.
 *
 * Levels are cascading: each one is narrowed by every level above it that the
 * caller has already pinned. A level whose column is NULL across the roll — as
 * DISTT / TEHSIL / CITY are today — simply comes back empty, and the form
 * leaves it blank rather than inventing a value.
 */
const SCOPE_COLUMNS = {
  district: 'district',
  assembly: 'assembly',
  tehsil: 'tehsil',
  city: 'city',
  ward: 'ward_no',
  bhag: 'part_no',
};

// Numeric levels sort by value, not lexically ("2" before "10").
const NUMERIC_SCOPE_LEVELS = new Set(['ward', 'bhag']);

/**
 * `selected` holds the values already chosen at each level, as arrays. Several
 * values at one level widen the level below to the union of their children —
 * picking wards 38 and 40 offers every भाग belonging to either.
 */
export function getScopeFacets(selected = {}, scope) {
  const db = getLocalDb();
  const out = {};

  // Bounded by the viewer's own scope, so a ward-38 admin creating a user is
  // only ever offered ward 38 — the form cannot even express an escalation.
  const sc = housePredicate(scope);
  const conds = [`is_deleted = 0${sc.sql}`];
  const params = { ...sc.params };

  for (const [level, column] of Object.entries(SCOPE_COLUMNS)) {
    const order = NUMERIC_SCOPE_LEVELS.has(level)
      ? `CAST(${column} AS INTEGER), ${column}`
      : column;

    out[level] = db
      .prepare(
        `SELECT DISTINCT ${column} AS v FROM houses
         WHERE ${conds.join(' AND ')} AND ${column} IS NOT NULL AND TRIM(${column}) <> ''
         ORDER BY ${order}`,
      )
      .all(params)
      .map((r) => String(r.v));

    // Pin this level before computing the next, so levels cascade downward.
    const picked = (Array.isArray(selected[level]) ? selected[level] : [selected[level]])
      .filter((v) => v !== undefined && v !== null && v !== '' && v !== 'all')
      .map(String);

    if (picked.length) {
      const names = picked.map((value, i) => {
        params[`sel_${level}_${i}`] = value;
        return `:sel_${level}_${i}`;
      });
      conds.push(`${column} IN (${names.join(', ')})`);
    }
  }

  return out;
}

/**
 * Is this house inside the viewer's scope? Guards every /api/houses/[id] route,
 * because a house list filtered in the UI says nothing about what a hand-typed
 * URL can reach.
 */
export function houseExists(id) {
  return Boolean(getLocalDb().prepare('SELECT 1 AS ok FROM houses WHERE id = ?').get(Number(id)));
}

export function houseInScope(id, scope) {
  const sc = housePredicate(scope);
  const row = getLocalDb()
    .prepare(`SELECT 1 AS ok FROM houses WHERE id = :id${sc.sql}`)
    .get({ id: Number(id), ...sc.params });
  return Boolean(row);
}

/** Owning house of a member / influencer, for the same guard on their routes. */
export function houseIdForMember(id) {
  return getLocalDb().prepare('SELECT house_id FROM house_members WHERE id = ?').get(id)?.house_id ?? null;
}

export function houseIdForInfluencer(id) {
  return getLocalDb().prepare('SELECT house_id FROM influential_persons WHERE id = ?').get(id)?.house_id ?? null;
}

export function getHouse(id) {
  const db = getLocalDb();
  const house = db.prepare('SELECT * FROM houses WHERE id = ?').get(id);
  if (!house) return null;

  const members = db
    .prepare('SELECT * FROM house_members WHERE house_id = ? ORDER BY is_deleted, id')
    .all(id);
  const survey = db.prepare('SELECT * FROM house_surveys WHERE house_id = ?').get(id) ?? null;
  const influencers = db
    .prepare('SELECT * FROM influential_persons WHERE house_id = ? ORDER BY id')
    .all(id);

  return { house, members, survey, influencers };
}

// voter_count is normally derived from the roll (recountVoters, below) but is
// also a manual field on the edit form — a field worker's correction stands
// until the next add/delete member recomputes it from the roll again.
const HOUSE_EDITABLE = [
  'house_no',
  'head_name',
  'mobile',
  'area',
  'caste',
  'subcaste',
  'total_members',
  'voter_count',
  'note',
];

/** Numbers a worker types may be in either digit script — store ASCII. */
const NUMERIC_HOUSE_FIELDS = ['house_no', 'mobile', 'total_members', 'voter_count'];

function normaliseHouseFields(patch) {
  const out = { ...patch };
  for (const f of NUMERIC_HOUSE_FIELDS) {
    if (f in out) out[f] = foldDigits(out[f]);
  }
  return out;
}

export function updateHouse(id, patch) {
  const db = getLocalDb();
  const clean = normaliseHouseFields(patch);
  const fields = HOUSE_EDITABLE.filter((f) => f in clean);
  if (!fields.length) return getHouse(id);

  db.prepare(
    `UPDATE houses SET ${fields.map((f) => `${f} = ?`).join(', ')}, updated_at = datetime('now','localtime')
     WHERE id = ?`,
  ).run(...fields.map((f) => clean[f]), id);

  return getHouse(id);
}

/** "+ नया घर जोड़ें" (screen 2) — a house not present in the imported roll. */
export function createHouse(input) {
  const db = getLocalDb();
  const data = normaliseHouseFields(input);
  const info = db
    .prepare(
      `INSERT INTO houses
         (ward_no, part_no, page, house_no, house_no_raw, head_name, mobile, area,
          caste, subcaste, total_members, voter_count, note, source)
       VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'manual')`,
    )
    .run(
      data.ward_no || 'manual',
      data.part_no || '0',
      data.house_no || null,
      data.house_no || null,
      data.head_name || null,
      data.mobile || null,
      data.area || null,
      data.caste || null,
      data.subcaste || null,
      data.total_members ?? null,
      data.note || null,
    );
  return getHouse(info.lastInsertRowid);
}

export function softDeleteHouse(id) {
  const db = getLocalDb();
  const info = db
    .prepare("UPDATE houses SET is_deleted = 1, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(id);
  return info.changes > 0;
}

const MEMBER_EDITABLE = [
  'name',
  'relation',
  'relative_name',
  'age',
  'gender',
  'mobile',
  'occupation',
  'voter_category',
  'education',
  'marital_status',
  'note',
  'epic',
  'dependent_on',
  'is_head',
  'is_verified',
];

function recountVoters(db, houseId) {
  const { n } = db
    .prepare('SELECT COUNT(*) AS n FROM house_members WHERE house_id = ? AND is_deleted = 0')
    .get(houseId);
  db.prepare('UPDATE houses SET voter_count = ? WHERE id = ?').run(n, houseId);
}

const NUMERIC_MEMBER_FIELDS = ['age', 'mobile'];

function normaliseMemberFields(patch) {
  const out = { ...patch };
  for (const f of NUMERIC_MEMBER_FIELDS) {
    if (f in out) out[f] = foldDigits(out[f]);
  }
  return out;
}

export function addMember(houseId, input) {
  const db = getLocalDb();
  const member = normaliseMemberFields(input);
  const run = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO house_members
           (house_id, name, relation, relative_name, age, gender, mobile,
            occupation, voter_category, education, marital_status, note,
            epic, dependent_on, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')`,
      )
      .run(
        houseId,
        member.name,
        member.relation || null,
        member.relative_name || null,
        member.age ?? null,
        member.gender || null,
        member.mobile || null,
        member.occupation || null,
        member.voter_category || null,
        member.education || null,
        member.marital_status || null,
        member.note || null,
        member.epic || null,
        member.dependent_on || null,
      );
    recountVoters(db, houseId);
    return db.prepare('SELECT * FROM house_members WHERE id = ?').get(info.lastInsertRowid);
  });
  return run();
}

export function getMember(id) {
  return getLocalDb().prepare('SELECT * FROM house_members WHERE id = ?').get(id);
}

export function updateMember(id, patch) {
  const db = getLocalDb();
  const clean = normaliseMemberFields(patch);
  const fields = MEMBER_EDITABLE.filter((f) => f in clean);
  if (!fields.length) return getMember(id);

  db.prepare(
    `UPDATE house_members SET ${fields.map((f) => `${f} = ?`).join(', ')}, updated_at = datetime('now','localtime')
     WHERE id = ?`,
  ).run(...fields.map((f) => clean[f]), id);

  // Only one head per house — clearing every sibling keeps that true without
  // asking the caller to do it.
  if (patch.is_head) {
    const row = db.prepare('SELECT house_id FROM house_members WHERE id = ?').get(id);
    db.prepare('UPDATE house_members SET is_head = 0 WHERE house_id = ? AND id != ?').run(
      row.house_id,
      id,
    );
  }

  return getMember(id);
}

export function deleteMember(id) {
  const db = getLocalDb();
  const row = db.prepare('SELECT house_id FROM house_members WHERE id = ?').get(id);
  if (!row) return false;

  const run = db.transaction(() => {
    db.prepare("UPDATE house_members SET is_deleted = 1, updated_at = datetime('now','localtime') WHERE id = ?").run(id);
    recountVoters(db, row.house_id);
  });
  run();
  return true;
}

export function saveSurvey(houseId, survey, surveyedBy) {
  const db = getLocalDb();
  const development = JSON.stringify(survey.development_works ?? []);

  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO house_surveys
         (house_id, political_party, political_party_other, development_works, development_other,
          cm_satisfaction, colony_workers, block_workers, remarks, surveyed_by, surveyed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
       ON CONFLICT(house_id) DO UPDATE SET
         political_party = excluded.political_party,
         political_party_other = excluded.political_party_other,
         development_works = excluded.development_works,
         development_other = excluded.development_other,
         cm_satisfaction = excluded.cm_satisfaction,
         colony_workers = excluded.colony_workers,
         block_workers = excluded.block_workers,
         remarks = excluded.remarks,
         surveyed_by = excluded.surveyed_by,
         surveyed_at = datetime('now','localtime'),
         updated_at = datetime('now','localtime')`,
    ).run(
      houseId,
      survey.political_party || null,
      survey.political_party_other || null,
      development,
      survey.development_other || null,
      survey.cm_satisfaction || null,
      survey.colony_workers || null,
      survey.block_workers || null,
      survey.remarks || null,
      surveyedBy ?? null,
    );

    const saved = db.prepare('SELECT * FROM house_surveys WHERE house_id = ?').get(houseId);
    const house = db.prepare('SELECT * FROM houses WHERE id = ?').get(houseId);
    const status = surveyStatus(house, saved);
    db.prepare("UPDATE houses SET survey_status = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(
      status,
      houseId,
    );
    return { survey: saved, status };
  });

  return run();
}

/** सारांश "सहेजें और आगे बढ़ें" (screen 13 → 14) — recomputes final status. */
export function finalizeHouse(houseId) {
  const db = getLocalDb();
  const house = db.prepare('SELECT * FROM houses WHERE id = ?').get(houseId);
  if (!house) return null;
  const survey = db.prepare('SELECT * FROM house_surveys WHERE house_id = ?').get(houseId) ?? null;
  const status = surveyStatus(house, survey) === 'pending' ? 'partial' : surveyStatus(house, survey);
  db.prepare("UPDATE houses SET survey_status = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(
    status,
    houseId,
  );
  return { status };
}
