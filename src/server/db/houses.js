import 'server-only';
import { query } from './pool';
import { foldDigits } from '@shared/houseNumber';
import { housePredicateMysql } from '../scope';

/**
 * All house / member / influencer / survey data lives in two MySQL tables:
 *   EROLL_NN055   — master voter roll, read-only
 *   SURVEY_DATA   — one row per house; JSON_DATA carries every writable field
 *
 * House IDs = SURVEY_DATA.ID  (auto-increment integer, same URL shape as before)
 * Member IDs = "{houseId}:{VLISTID}"   for roll members
 *              "{houseId}:M{seq}"       for field-added members
 * Influencer IDs = "{houseId}:I{seq}"
 */

// ── Vocabulary ──────────────────────────────────────────────────────────────

export const POLITICAL_PARTY_VALUES  = ['bjp', 'congress', 'other', 'none'];
export const DEVELOPMENT_WORK_KEYS   = ['road', 'electricity', 'cleanliness', 'water'];
export const CM_SATISFACTION_VALUES  = [
  'very_satisfied', 'satisfied', 'neutral', 'dissatisfied', 'very_dissatisfied',
];

const PAGE_SIZE = 25;

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseAreaId(areaId) {
  // 'NN055_38_1_46' → { ward: '38', bhag: '1' }
  if (!areaId) return { ward: null, bhag: null };
  const parts = String(areaId).split('_');
  return { ward: parts[1] ?? null, bhag: parts[2] ?? null };
}

function mapGender(sex) {
  if (sex === 'पुरुष') return 'M';
  if (sex === 'स्त्री') return 'F';
  return sex ?? null;
}

function parseJsonData(raw) {
  if (raw == null) return {};
  if (typeof raw !== 'string') return raw;   // mysql2 already parsed it
  try { return JSON.parse(raw); } catch { return {}; }
}

// STATUS codes: 0 = pending, 1 = partial/draft, 2 = done, 3 = verified
function statusToLabel(code) {
  if (code === 2 || code === 3) return 'done';
  if (code === 1) return 'partial';
  return 'pending';
}

function computeNewStatus(jd, currentStatus) {
  if (currentStatus >= 2) return currentStatus;
  const p = jd.politics ?? {};
  const d = jd.development ?? {};
  const hasSurvey = p.party || p.cmSatisfaction ||
    (Array.isArray(d.works) && d.works.length > 0);
  return hasSurvey ? 1 : 0;
}

// Build survey row from JSON_DATA (shape the frontend and summary page expect)
function buildSurveyRow(jd, houseId) {
  const p  = jd.politics     ?? {};
  const d  = jd.development  ?? {};
  const kw = jd.knownWorkers ?? {};
  // Backward-compat: old JSON_DATA used development_works at root level
  const works = Array.isArray(d.works) ? d.works
    : (jd.development_works
        ? (typeof jd.development_works === 'string'
            ? JSON.parse(jd.development_works)
            : jd.development_works)
        : []);
  const surveyed = p.party || p.cmSatisfaction || works.length > 0 ||
    kw.bjp || kw.congress || jd.remarks;
  if (!surveyed) return null;
  return {
    house_id:              houseId,
    political_party:       p.party           ?? null,
    political_party_other: p.partyOther      ?? null,
    development_works:     JSON.stringify(works),
    development_other:     d.other           ?? null,
    cm_satisfaction:       p.cmSatisfaction  ?? null,
    colony_workers:        kw.bjp            ?? null,
    block_workers:         kw.congress       ?? null,
    remarks:               jd.remarks        ?? null,
  };
}

// Build the house object returned by API routes
function buildHouse(sd, extraFields = {}) {
  const jd  = parseJsonData(sd.JSON_DATA);
  const { ward, bhag } = parseAreaId(sd.AREA_ID);
  const fe  = jd.familyEdits ?? {};
  const fam = jd.family       ?? {};   // v1 compat

  const headName  = fe.headName  ?? fam.headName  ?? extraFields.eroll_head  ?? null;
  const area      = fe.area      ?? fam.area      ?? extraFields.eroll_area  ?? null;
  const caste     = fe.caste     ?? fam.caste     ?? extraFields.eroll_caste ?? null;

  const addedActive = (jd.addedMembers ?? []).filter(m => !m.isDeleted).length;
  const voterCount  = extraFields.voter_count != null ? Number(extraFields.voter_count) : 0;
  const totalMembers = voterCount + addedActive;

  return {
    id:            sd.ID,
    area_id:       sd.AREA_ID,
    house_no:      foldDigits(sd.HNO ?? ''),
    house_no_raw:  sd.HNO,
    ward_no:       ward,
    part_no:       bhag,
    head_name:     headName,
    mobile:        fe.mobile    ?? fam.mobile    ?? null,
    area,
    caste,
    subcaste:      fe.subcaste  ?? fam.subcaste  ?? null,
    note:          fe.note      ?? fam.note      ?? null,
    total_members: totalMembers,
    voter_count:   voterCount,
    survey_status: statusToLabel(Number(sd.STATUS)),
    is_deleted:    (jd.isDeleted ?? false) ? 1 : 0,
    source:        String(sd.AREA_ID ?? '').startsWith('NN055') ? 'roll' : 'manual',
  };
}

// ── WHERE builder ────────────────────────────────────────────────────────────

function buildWhere(scope, ward, bhag, status, q, params) {
  const conds = [];

  const sc = housePredicateMysql(scope);
  if (sc.sql) {
    conds.push(sc.sql.replace(/^\s*AND\s*/i, ''));
    params.push(...sc.params);
  }

  // Explicit ward / bhag filter from UI
  if (ward && ward !== 'all') {
    if (bhag && bhag !== 'all') {
      conds.push('sd.AREA_ID LIKE ?');
      params.push(`NN055_${foldDigits(String(ward))}_${foldDigits(String(bhag))}_%`);
    } else {
      conds.push('sd.AREA_ID LIKE ?');
      params.push(`NN055_${foldDigits(String(ward))}_%`);
    }
  }

  // Deleted filter
  conds.push(
    "(JSON_UNQUOTE(JSON_EXTRACT(sd.JSON_DATA,'$.isDeleted')) IS NULL" +
    " OR JSON_UNQUOTE(JSON_EXTRACT(sd.JSON_DATA,'$.isDeleted')) != 'true')",
  );

  // Status filter
  if (status && status !== 'all') {
    const code = { pending: 0, partial: 1, done: 2 }[status];
    if (code !== undefined) { conds.push('sd.STATUS = ?'); params.push(code); }
  }

  // Search
  const term = foldDigits(String(q ?? '').trim());
  if (term) {
    const like = `%${term}%`;
    conds.push(`(
      sd.HNO LIKE ? OR
      JSON_UNQUOTE(JSON_EXTRACT(sd.JSON_DATA,'$.familyEdits.headName')) LIKE ? OR
      JSON_UNQUOTE(JSON_EXTRACT(sd.JSON_DATA,'$.family.headName')) LIKE ? OR
      EXISTS (
        SELECT 1 FROM EROLL_NN055 e2
        WHERE e2.AREA_ID = sd.AREA_ID AND e2.HNO = sd.HNO
          AND (e2.VNAME LIKE ? OR e2.PHONE1 LIKE ?)
      )
    )`);
    params.push(like, like, like, like, like);
  }

  return conds.length ? `WHERE ${conds.join(' AND ')}` : '';
}

// ── Stats WHERE (no JOIN) ─────────────────────────────────────────────────────

function buildStatsWhere(scope, ward, bhag, params) {
  const conds = [];
  const sc = housePredicateMysql(scope);
  if (sc.sql) {
    conds.push(sc.sql.replace(/^\s*AND\s*/i, '').replace(/sd\./g, ''));
    params.push(...sc.params);
  }
  if (ward && ward !== 'all') {
    if (bhag && bhag !== 'all') {
      conds.push('AREA_ID LIKE ?');
      params.push(`NN055_${foldDigits(String(ward))}_${foldDigits(String(bhag))}_%`);
    } else {
      conds.push('AREA_ID LIKE ?');
      params.push(`NN055_${foldDigits(String(ward))}_%`);
    }
  }
  conds.push(
    "(JSON_UNQUOTE(JSON_EXTRACT(JSON_DATA,'$.isDeleted')) IS NULL" +
    " OR JSON_UNQUOTE(JSON_EXTRACT(JSON_DATA,'$.isDeleted')) != 'true')",
  );
  return conds.length ? `WHERE ${conds.join(' AND ')}` : '';
}

// ── House list ────────────────────────────────────────────────────────────────

export async function listHouses({
  ward   = 'all',
  part   = 'all',
  status = 'all',
  q      = '',
  limit  = PAGE_SIZE,
  offset = 0,
  scope,
} = {}) {
  const params  = [];
  const whereClause = buildWhere(scope, ward, part, status, q, params);
  const capped  = Math.max(1, Math.min(Number(limit) || PAGE_SIZE, 200));

  const sql = `
    SELECT
      sd.ID, sd.AREA_ID, sd.HNO, sd.STATUS, sd.JSON_DATA,
      COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(sd.JSON_DATA,'$.familyEdits.headName')),
        JSON_UNQUOTE(JSON_EXTRACT(sd.JSON_DATA,'$.family.headName')),
        MAX(CASE WHEN (e.RELATION IS NULL OR e.RELATION = '') THEN e.VNAME ELSE NULL END),
        MIN(e.VNAME)
      ) AS eroll_head,
      COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(sd.JSON_DATA,'$.familyEdits.area')),
        JSON_UNQUOTE(JSON_EXTRACT(sd.JSON_DATA,'$.family.area')),
        MAX(e.AREACOLONY)
      ) AS eroll_area,
      COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(sd.JSON_DATA,'$.familyEdits.caste')),
        MAX(e.MAINCAST)
      ) AS eroll_caste,
      COUNT(e.VLISTID) AS voter_count
    FROM SURVEY_DATA sd
    LEFT JOIN EROLL_NN055 e ON e.AREA_ID = sd.AREA_ID AND e.HNO = sd.HNO
    ${whereClause}
    GROUP BY sd.ID
    ORDER BY sd.AREA_ID ASC, CAST(sd.HNO AS UNSIGNED), sd.HNO
    LIMIT ? OFFSET ?
  `;
  params.push(capped + 1, Math.max(0, Number(offset) || 0));

  const [rows] = await query(sql, params);
  const hasMore = rows.length > capped;
  const houses  = (hasMore ? rows.slice(0, capped) : rows).map(r =>
    buildHouse(r, { eroll_head: r.eroll_head, eroll_area: r.eroll_area, eroll_caste: r.eroll_caste, voter_count: r.voter_count }),
  );
  return { houses, hasMore };
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getHouseStats(ward = 'all', part = 'all', scope) {
  const params = [];
  const where  = buildStatsWhere(scope, ward, part, params);
  const [[row]] = await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN STATUS >= 2 THEN 1 ELSE 0 END) AS done
     FROM SURVEY_DATA ${where}`,
    params,
  );
  return { total: Number(row.total), surveyed: Number(row.done) };
}

export async function getDashboardStats(ward = 'all', part = 'all', scope) {
  const params = [];
  const where  = buildStatsWhere(scope, ward, part, params);
  const [[row]] = await query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN STATUS >= 2 THEN 1 ELSE 0 END) AS done,
       SUM(CASE WHEN STATUS  = 1 THEN 1 ELSE 0 END) AS draft,
       SUM(CASE WHEN STATUS  = 0 THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN DATE(UPDATED_AT) = CURDATE() THEN 1 ELSE 0 END) AS today
     FROM SURVEY_DATA ${where}`,
    params,
  );
  return {
    total:       Number(row.total),
    done:        Number(row.done),
    draft:       Number(row.draft),
    remaining:   Number(row.pending),
    todaySurveys: Number(row.today),
    lastSync:    null,
  };
}

// ── Facets ────────────────────────────────────────────────────────────────────

export async function getWardFacets(scope) {
  const params = [];
  const sc = housePredicateMysql(scope);
  const cond = sc.sql ? sc.sql.replace(/^\s*AND\s*/i, '').replace(/sd\./g, '') : null;
  const where = cond ? `WHERE ${cond}` : '';
  const [rows] = await query(
    `SELECT
       SUBSTRING_INDEX(SUBSTRING_INDEX(AREA_ID,'_',2),'_',-1) AS ward,
       COUNT(*) AS n
     FROM SURVEY_DATA ${where}
     GROUP BY ward
     ORDER BY CAST(ward AS UNSIGNED), ward`,
    sc.params,
  );
  return rows.map(r => ({ ward: r.ward, houses: Number(r.n) }));
}

export async function getBhagFacets(ward = 'all', scope) {
  const params = [];
  const sc = housePredicateMysql(scope);
  if (sc.sql) {
    params.push(...sc.params);
  }
  const conds = [];
  if (sc.sql) conds.push(sc.sql.replace(/^\s*AND\s*/i, '').replace(/sd\./g, ''));
  if (ward && ward !== 'all') {
    conds.push('AREA_ID LIKE ?');
    params.push(`NN055_${foldDigits(String(ward))}_%`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const [rows] = await query(
    `SELECT
       SUBSTRING_INDEX(SUBSTRING_INDEX(AREA_ID,'_',3),'_',-1) AS bhag,
       COUNT(*) AS n
     FROM SURVEY_DATA ${where}
     GROUP BY bhag
     ORDER BY CAST(bhag AS UNSIGNED), bhag`,
    params,
  );
  return rows.map(r => ({ bhag: r.bhag, houses: Number(r.n) }));
}

export async function getCasteFacets(caste = '', scope) {
  const params = [];
  const sc = housePredicateMysql(scope);
  if (sc.sql) params.push(...sc.params);
  const cond = sc.sql ? sc.sql.replace(/^\s*AND\s*/i, '').replace(/sd\./g, '').replace(/AREA_ID/g, 'e.AREA_ID') : null;
  const where = cond ? `WHERE ${cond}` : '';

  const [castes] = await query(
    `SELECT MAINCAST AS value, COUNT(*) AS n
     FROM EROLL_NN055 e ${where}
     GROUP BY MAINCAST ORDER BY n DESC`,
    [...sc.params],
  );

  const picked = String(caste ?? '').trim();
  const casteCond = picked ? `AND e.MAINCAST = ?` : '';
  const [subcastes] = await query(
    `SELECT SUBCAST AS value, COUNT(*) AS n
     FROM EROLL_NN055 e ${where} ${casteCond}
     AND SUBCAST IS NOT NULL AND TRIM(SUBCAST) != ''
     GROUP BY SUBCAST ORDER BY n DESC`,
    picked ? [...sc.params, picked] : [...sc.params],
  );

  return {
    castes:    castes.map(r => r.value).filter(Boolean),
    subcastes: subcastes.map(r => r.value).filter(Boolean),
  };
}

// Cascading scope options (for the user-add form's क्षेत्राधिकार section)
const SCOPE_COLUMNS = { ward: 'WARD', bhag: 'BHAG' };

export async function getScopeFacets(selected = {}, scope) {
  const out   = {};
  const conds = ['AREA_ID IS NOT NULL'];
  const params = [];

  const sc = housePredicateMysql(scope);
  if (sc.sql) {
    // Convert AREA_ID LIKE conditions to WARD/BHAG conditions for EROLL_NN055
    // Simpler: just query EROLL with WARD/BHAG from scope grants
  }

  for (const [level, col] of Object.entries(SCOPE_COLUMNS)) {
    const [rows] = await query(
      `SELECT DISTINCT ${col} AS v FROM EROLL_NN055
       WHERE ${[...conds, `${col} IS NOT NULL`].join(' AND ')}
       ORDER BY CAST(${col} AS UNSIGNED), ${col}`,
      [...params],
    );
    out[level] = rows.map(r => String(r.v));

    const picked = (Array.isArray(selected[level]) ? selected[level] : [selected[level]])
      .filter(v => v != null && v !== '' && v !== 'all').map(String);
    if (picked.length) {
      const placeholders = picked.map(() => '?').join(', ');
      conds.push(`${col} IN (${placeholders})`);
      params.push(...picked);
    }
  }

  // Higher levels — return empty (data not available in EROLL_NN055)
  for (const level of ['sambhag', 'district', 'lok_sabha', 'assembly', 'tehsil', 'city']) {
    out[level] = [];
  }

  return out;
}

// ── Guards ────────────────────────────────────────────────────────────────────

export async function houseExists(id) {
  const [[row]] = await query(
    'SELECT 1 AS ok FROM SURVEY_DATA WHERE ID = ?',
    [Number(id)],
  );
  return Boolean(row?.ok);
}

export async function houseInScope(id, scope) {
  if (scope === null || (scope && !scope.__denyAll && Array.isArray(scope) && scope.length === 0)) {
    // unrestricted
    return houseExists(id);
  }
  const sc = housePredicateMysql(scope);
  if (!sc.sql) return houseExists(id);

  const params = [Number(id), ...sc.params];
  const cond   = sc.sql.replace(/^\s*AND\s*/i, '').replace(/sd\./g, '');
  const [[row]] = await query(
    `SELECT 1 AS ok FROM SURVEY_DATA WHERE ID = ? AND ${cond}`,
    params,
  );
  return Boolean(row?.ok);
}

/** Parse composite member/influencer id: "{houseId}:{key}" → [houseId, key] */
function splitCompositeId(rawId) {
  const s = String(rawId);
  const colon = s.indexOf(':');
  if (colon === -1) return [null, null];
  return [parseInt(s.slice(0, colon)), s.slice(colon + 1)];
}

export function houseIdForMember(rawId) {
  const [houseId] = splitCompositeId(rawId);
  return houseId;
}

export function houseIdForInfluencer(rawId) {
  const [houseId] = splitCompositeId(rawId);
  return houseId;
}

// ── Get house detail ──────────────────────────────────────────────────────────

export async function getHouse(id) {
  const [[sd]] = await query('SELECT * FROM SURVEY_DATA WHERE ID = ?', [Number(id)]);
  if (!sd) return null;

  const jd = parseJsonData(sd.JSON_DATA);

  // Fetch EROLL members for this house (source of truth)
  const [erollRows] = await query(
    `SELECT VLISTID, VNAME, FNAME, RELATION, SEX, AGE, PHONE1, IDCARD_NO
     FROM EROLL_NN055
     WHERE AREA_ID = ? AND HNO = ?
     ORDER BY VLISTID`,
    [sd.AREA_ID, sd.HNO],
  );

  // Determine head from EROLL: first member with no RELATION, else first member
  const erollHead  = erollRows.find(r => !r.RELATION || !r.RELATION.trim()) ?? erollRows[0];
  const erollArea  = erollRows.length ? erollRows[0] : null;

  const [areaRow] = await query(
    'SELECT MAX(AREACOLONY) AS area, MAX(MAINCAST) AS caste FROM EROLL_NN055 WHERE AREA_ID = ? AND HNO = ?',
    [sd.AREA_ID, sd.HNO],
  );

  const house = buildHouse(sd, {
    eroll_head:  erollHead?.VNAME ?? null,
    eroll_area:  areaRow?.[0]?.area ?? null,
    eroll_caste: areaRow?.[0]?.caste ?? null,
    voter_count: erollRows.length,
  });

  // Build members list: EROLL members + manually added members
  const memberEdits  = jd.memberEdits    ?? {};
  const addedMembers = jd.addedMembers   ?? [];

  const headVlistid  = jd.familyEdits?.headVlistid ?? erollHead?.VLISTID ?? null;

  const members = [
    ...erollRows.map(r => {
      const edits   = memberEdits[String(r.VLISTID)] ?? {};
      const isDeleted = edits.is_deleted ? 1 : 0;
      return {
        id:            `${id}:${r.VLISTID}`,
        house_id:      id,
        name:          edits.name          ?? r.VNAME,
        gender:        edits.gender        ?? mapGender(r.SEX),
        age:           edits.age           ?? r.AGE,
        relation:      edits.relation      ?? r.RELATION ?? null,
        relative_name: edits.relative_name ?? r.FNAME,
        mobile:        edits.mobile        ?? r.PHONE1   ?? null,
        epic:          edits.epic          ?? r.IDCARD_NO ?? null,
        education:     edits.education     ?? null,
        marital_status: edits.marital_status ?? null,
        occupation:    edits.occupation    ?? null,
        note:          edits.note          ?? null,
        is_head:       (headVlistid != null ? headVlistid === r.VLISTID : (!r.RELATION || !r.RELATION.trim())) ? 1 : 0,
        is_verified:   0,
        is_deleted:    isDeleted,
        source:        'eroll',
      };
    }),
    ...addedMembers.filter(m => !m.isDeleted).map(m => ({
      id:            `${id}:M${m._seq}`,
      house_id:      id,
      name:          m.name,
      gender:        m.gender        ?? null,
      age:           m.age           ?? null,
      relation:      m.relation      ?? null,
      relative_name: m.relativeName  ?? null,
      mobile:        m.mobile        ?? null,
      epic:          m.epic          ?? null,
      education:     m.education     ?? null,
      marital_status: m.maritalStatus ?? null,
      occupation:    m.occupation    ?? null,
      note:          m.note          ?? null,
      is_head:       0,
      is_verified:   0,
      is_deleted:    0,
      source:        'manual',
    })),
  ];

  const survey      = buildSurveyRow(jd, id);
  const influencers = (jd.influential ?? []).map(inf => ({
    id:          `${id}:I${inf._seq ?? 1}`,
    house_id:    id,
    name:        inf.name,
    party:       inf.party       ?? null,
    position:    inf.position    ?? null,
    mobile:      inf.mobile      ?? null,
    address:     inf.address     ?? null,
    description: inf.description ?? null,
  }));

  return { house, members, survey, influencers };
}

// ── House CRUD ────────────────────────────────────────────────────────────────

const HOUSE_EDITABLE = [
  'headName', 'mobile', 'area', 'caste', 'subcaste', 'note',
  'headVlistid', // which member is the head
];

const NUMERIC_HOUSE_FIELDS = ['mobile'];

export async function updateHouse(id, patch) {
  const [[sd]] = await query('SELECT JSON_DATA FROM SURVEY_DATA WHERE ID = ?', [Number(id)]);
  if (!sd) return getHouse(id);

  const jd = parseJsonData(sd.JSON_DATA);
  jd.version = 2;
  jd.familyEdits = jd.familyEdits ?? {};

  // Map API fields to JSON_DATA.familyEdits keys
  const fieldMap = {
    head_name:     'headName',
    mobile:        'mobile',
    area:          'area',
    caste:         'caste',
    subcaste:      'subcaste',
    note:          'note',
    house_no:      null, // HNO is not editable (part of pk)
    total_members: null, // derived
    voter_count:   null, // derived
  };

  for (const [apiKey, jsonKey] of Object.entries(fieldMap)) {
    if (apiKey in patch && jsonKey) {
      let v = patch[apiKey];
      if (NUMERIC_HOUSE_FIELDS.includes(jsonKey)) v = foldDigits(String(v ?? ''));
      jd.familyEdits[jsonKey] = v ?? null;
    }
  }

  await query(
    'UPDATE SURVEY_DATA SET JSON_DATA = ?, UPDATED_AT = NOW() WHERE ID = ?',
    [JSON.stringify(jd), Number(id)],
  );
  return getHouse(id);
}

export async function createHouse(input) {
  const data  = input;
  const ward  = String(data.ward_no  ?? '').trim() || 'manual';
  const bhag  = String(data.part_no  ?? '').trim() || '0';
  const hno   = foldDigits(String(data.house_no ?? '').trim()) || null;

  // Build an AREA_ID that the LIKE filter will catch
  const areaId = `NN055_${ward}_${bhag}_MANUAL_${Date.now()}`;

  const jd = {
    version:     2,
    isDeleted:   false,
    familyEdits: {
      headName: data.head_name  ?? null,
      mobile:   foldDigits(data.mobile ?? '') || null,
      area:     data.area       ?? null,
      caste:    data.caste      ?? null,
      subcaste: data.subcaste   ?? null,
      note:     data.note       ?? null,
    },
    memberEdits:  {},
    addedMembers: [],
    influential:  [],
    politics:     {},
    development:  {},
    schemes:      [],
    knownWorkers: {},
    remarks:      null,
  };

  const [res] = await query(
    `INSERT INTO SURVEY_DATA (AREA_ID, HNO, JSON_DATA, STATUS) VALUES (?, ?, ?, 0)`,
    [areaId, hno, JSON.stringify(jd)],
  );
  return getHouse(res.insertId);
}

export async function softDeleteHouse(id) {
  const [[sd]] = await query('SELECT JSON_DATA FROM SURVEY_DATA WHERE ID = ?', [Number(id)]);
  if (!sd) return false;
  const jd = parseJsonData(sd.JSON_DATA);
  jd.isDeleted = true;
  await query(
    'UPDATE SURVEY_DATA SET JSON_DATA = ?, UPDATED_AT = NOW() WHERE ID = ?',
    [JSON.stringify(jd), Number(id)],
  );
  return true;
}

// ── Survey ────────────────────────────────────────────────────────────────────

export async function saveSurvey(houseId, patch, surveyedBy) {
  const [[sd]] = await query(
    'SELECT JSON_DATA, STATUS FROM SURVEY_DATA WHERE ID = ?',
    [Number(houseId)],
  );
  if (!sd) return null;

  const jd = parseJsonData(sd.JSON_DATA);
  jd.version = 2;

  jd.politics = {
    party:          patch.political_party       ?? null,
    partyOther:     patch.political_party_other ?? null,
    cmSatisfaction: patch.cm_satisfaction       ?? null,
  };
  jd.development = {
    works: Array.isArray(patch.development_works) ? patch.development_works : [],
    other: patch.development_other ?? null,
  };
  jd.knownWorkers = {
    bjp:     patch.colony_workers ?? null,
    congress: patch.block_workers ?? null,
  };
  jd.remarks = patch.remarks ?? null;

  const newStatus = computeNewStatus(jd, Number(sd.STATUS));

  await query(
    `UPDATE SURVEY_DATA
     SET JSON_DATA = ?, STATUS = ?, SURVEY_BY = ?, SURVEY_DATE = NOW(), UPDATED_AT = NOW()
     WHERE ID = ?`,
    [JSON.stringify(jd), newStatus, String(surveyedBy ?? 'SYSTEM'), Number(houseId)],
  );

  const survey = buildSurveyRow(jd, houseId);
  return { survey, status: statusToLabel(newStatus) };
}

export async function finalizeHouse(houseId) {
  const [[sd]] = await query(
    'SELECT JSON_DATA, STATUS FROM SURVEY_DATA WHERE ID = ?',
    [Number(houseId)],
  );
  if (!sd) return null;

  const jd        = parseJsonData(sd.JSON_DATA);
  const curStatus = Number(sd.STATUS);
  const newStatus = curStatus >= 2 ? curStatus : (buildSurveyRow(jd, houseId) ? 2 : 1);

  await query(
    `UPDATE SURVEY_DATA SET STATUS = ?, UPDATED_AT = NOW() WHERE ID = ?`,
    [newStatus, Number(houseId)],
  );
  return { status: statusToLabel(newStatus) };
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function getMember(compositeId) {
  const [houseId, key] = splitCompositeId(compositeId);
  if (!houseId) return null;
  const full = await getHouse(houseId);
  return full?.members.find(m => m.id === String(compositeId)) ?? null;
}

export async function addMember(houseId, input) {
  const [[sd]] = await query('SELECT JSON_DATA FROM SURVEY_DATA WHERE ID = ?', [Number(houseId)]);
  if (!sd) return null;

  const jd = parseJsonData(sd.JSON_DATA);
  jd.addedMembers = jd.addedMembers ?? [];
  const maxSeq = jd.addedMembers.reduce((m, a) => Math.max(m, a._seq ?? 0), 0);
  const m = {
    _seq:          maxSeq + 1,
    name:          input.name,
    gender:        input.gender       ?? null,
    age:           input.age          ? Number(foldDigits(String(input.age))) : null,
    relation:      input.relation     ?? null,
    relativeName:  input.relative_name ?? null,
    mobile:        foldDigits(input.mobile ?? '') || null,
    epic:          input.epic         ?? null,
    education:     input.education    ?? null,
    maritalStatus: input.marital_status ?? null,
    occupation:    input.occupation   ?? null,
    note:          input.note         ?? null,
    isDeleted:     false,
  };
  jd.addedMembers.push(m);
  await query('UPDATE SURVEY_DATA SET JSON_DATA = ?, UPDATED_AT = NOW() WHERE ID = ?', [JSON.stringify(jd), Number(houseId)]);
  return getMember(`${houseId}:M${m._seq}`);
}

export async function updateMember(compositeId, patch) {
  const [houseId, key] = splitCompositeId(compositeId);
  if (!houseId) return null;

  const [[sd]] = await query('SELECT JSON_DATA FROM SURVEY_DATA WHERE ID = ?', [houseId]);
  if (!sd) return null;
  const jd = parseJsonData(sd.JSON_DATA);

  if (key.startsWith('M')) {
    // Manually added member
    const seq = parseInt(key.slice(1));
    const idx = (jd.addedMembers ?? []).findIndex(m => m._seq === seq);
    if (idx === -1) return null;
    const m = jd.addedMembers[idx];
    if ('name'          in patch) m.name          = patch.name;
    if ('gender'        in patch) m.gender        = patch.gender;
    if ('age'           in patch) m.age           = patch.age ? Number(foldDigits(String(patch.age))) : null;
    if ('relation'      in patch) m.relation      = patch.relation      ?? null;
    if ('relative_name' in patch) m.relativeName  = patch.relative_name ?? null;
    if ('mobile'        in patch) m.mobile        = foldDigits(patch.mobile ?? '') || null;
    if ('epic'          in patch) m.epic          = patch.epic          ?? null;
    if ('education'     in patch) m.education     = patch.education     ?? null;
    if ('marital_status' in patch) m.maritalStatus = patch.marital_status ?? null;
    if ('occupation'    in patch) m.occupation    = patch.occupation    ?? null;
    if ('note'          in patch) m.note          = patch.note          ?? null;
  } else {
    // EROLL member — store delta in memberEdits
    const vlistid = key;
    jd.memberEdits = jd.memberEdits ?? {};
    const existing = jd.memberEdits[vlistid] ?? {};
    const EDITABLE_MAP = {
      name:          'name',
      gender:        'gender',
      age:           'age',
      relation:      'relation',
      relative_name: 'relative_name',
      mobile:        'mobile',
      epic:          'epic',
      education:     'education',
      marital_status: 'marital_status',
      occupation:    'occupation',
      note:          'note',
      is_head:       'is_head',
    };
    for (const [apiField, jsonField] of Object.entries(EDITABLE_MAP)) {
      if (apiField in patch) {
        let v = patch[apiField];
        if (apiField === 'age') v = v ? Number(foldDigits(String(v))) : null;
        if (apiField === 'mobile') v = foldDigits(v ?? '') || null;
        existing[jsonField] = v;
      }
    }
    jd.memberEdits[vlistid] = existing;

    // If marking as head, update headVlistid
    if (patch.is_head) {
      jd.familyEdits = jd.familyEdits ?? {};
      jd.familyEdits.headVlistid = parseInt(vlistid);
    }
  }

  await query('UPDATE SURVEY_DATA SET JSON_DATA = ?, UPDATED_AT = NOW() WHERE ID = ?', [JSON.stringify(jd), houseId]);
  return getMember(compositeId);
}

export async function deleteMember(compositeId) {
  const [houseId, key] = splitCompositeId(compositeId);
  if (!houseId) return false;

  const [[sd]] = await query('SELECT JSON_DATA FROM SURVEY_DATA WHERE ID = ?', [houseId]);
  if (!sd) return false;
  const jd = parseJsonData(sd.JSON_DATA);

  if (key.startsWith('M')) {
    const seq = parseInt(key.slice(1));
    const idx = (jd.addedMembers ?? []).findIndex(m => m._seq === seq);
    if (idx === -1) return false;
    jd.addedMembers[idx].isDeleted = true;
  } else {
    jd.memberEdits = jd.memberEdits ?? {};
    jd.memberEdits[key] = { ...(jd.memberEdits[key] ?? {}), is_deleted: 1 };
  }

  await query('UPDATE SURVEY_DATA SET JSON_DATA = ?, UPDATED_AT = NOW() WHERE ID = ?', [JSON.stringify(jd), houseId]);
  return true;
}

// ── Influencers ───────────────────────────────────────────────────────────────

async function readInfluencers(houseId) {
  const [[sd]] = await query('SELECT JSON_DATA FROM SURVEY_DATA WHERE ID = ?', [Number(houseId)]);
  if (!sd) return { jd: null, list: [] };
  const jd   = parseJsonData(sd.JSON_DATA);
  const list = (jd.influential ?? []).map(inf => ({
    id:          `${houseId}:I${inf._seq ?? 1}`,
    house_id:    houseId,
    name:        inf.name,
    party:       inf.party       ?? null,
    position:    inf.position    ?? null,
    mobile:      inf.mobile      ?? null,
    address:     inf.address     ?? null,
    description: inf.description ?? null,
  }));
  return { jd, list };
}

export async function listInfluencers(houseId) {
  return (await readInfluencers(houseId)).list;
}

export async function getInfluencer(compositeId) {
  const houseId = houseIdForInfluencer(compositeId);
  if (!houseId) return null;
  const { list } = await readInfluencers(houseId);
  return list.find(i => i.id === String(compositeId)) ?? null;
}

export async function addInfluencer(houseId, data) {
  const [[sd]] = await query('SELECT JSON_DATA FROM SURVEY_DATA WHERE ID = ?', [Number(houseId)]);
  if (!sd) return null;
  const jd = parseJsonData(sd.JSON_DATA);
  jd.influential = jd.influential ?? [];
  const maxSeq = jd.influential.reduce((m, i) => Math.max(m, i._seq ?? 0), 0);
  const inf = {
    _seq:        maxSeq + 1,
    name:        data.name,
    party:       data.party       ?? null,
    position:    data.position    ?? null,
    mobile:      foldDigits(data.mobile ?? '') || null,
    address:     data.address     ?? null,
    description: data.description ?? null,
  };
  jd.influential.push(inf);
  await query('UPDATE SURVEY_DATA SET JSON_DATA = ?, UPDATED_AT = NOW() WHERE ID = ?', [JSON.stringify(jd), Number(houseId)]);
  return getInfluencer(`${houseId}:I${inf._seq}`);
}

export async function updateInfluencer(compositeId, patch) {
  const [houseId] = splitCompositeId(compositeId);
  const seq       = parseInt(String(compositeId).split(':I')[1]);
  if (!houseId || !seq) return null;

  const [[sd]] = await query('SELECT JSON_DATA FROM SURVEY_DATA WHERE ID = ?', [houseId]);
  if (!sd) return null;
  const jd  = parseJsonData(sd.JSON_DATA);
  const idx = (jd.influential ?? []).findIndex(i => (i._seq ?? 0) === seq);
  if (idx === -1) return null;

  const inf = jd.influential[idx];
  for (const f of ['name', 'party', 'position', 'address', 'description']) {
    if (f in patch) inf[f] = patch[f] ?? null;
  }
  if ('mobile' in patch) inf.mobile = foldDigits(patch.mobile ?? '') || null;

  await query('UPDATE SURVEY_DATA SET JSON_DATA = ?, UPDATED_AT = NOW() WHERE ID = ?', [JSON.stringify(jd), houseId]);
  return getInfluencer(compositeId);
}

export async function deleteInfluencer(compositeId) {
  const [houseId] = splitCompositeId(compositeId);
  const seq       = parseInt(String(compositeId).split(':I')[1]);
  if (!houseId || !seq) return false;

  const [[sd]] = await query('SELECT JSON_DATA FROM SURVEY_DATA WHERE ID = ?', [houseId]);
  if (!sd) return false;
  const jd  = parseJsonData(sd.JSON_DATA);
  const idx = (jd.influential ?? []).findIndex(i => (i._seq ?? 0) === seq);
  if (idx === -1) return false;

  jd.influential.splice(idx, 1);
  await query('UPDATE SURVEY_DATA SET JSON_DATA = ?, UPDATED_AT = NOW() WHERE ID = ?', [JSON.stringify(jd), houseId]);
  return true;
}
