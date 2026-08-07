import 'server-only';
import { query } from './pool';

/**
 * Remote MySQL SURVEY_DATA helpers.
 *
 * STATUS codes:
 *   0 = Pending    (no survey started)
 *   1 = Partial    (draft / in progress)
 *   2 = Completed  (finalized by field worker)
 *   3 = Verified   (admin-verified)
 */

/**
 * Build the canonical JSON_DATA object from the parts collected by the app.
 * This is the single source-of-truth for the structure stored in MySQL.
 */
export function buildJsonData({ house, members = [], survey, influencers = [] }) {
  const sv = survey ?? {};
  return {
    version: 1,
    family: {
      headName:     house.head_name    ?? null,
      mobile:       house.mobile       ?? null,
      caste:        house.caste        ?? null,
      subcaste:     house.subcaste     ?? null,
      totalMembers: house.total_members ?? house.voter_count ?? null,
      voterCount:   house.voter_count  ?? null,
      area:         house.area         ?? null,
    },
    members: members
      .filter(m => !m.is_deleted)
      .map(m => ({
        name:         m.name,
        gender:       m.gender       ?? null,
        age:          m.age          ?? null,
        relation:     m.relation     ?? null,
        relativeName: m.relative_name ?? null,
        mobile:       m.mobile       ?? null,
        epic:         m.epic         ?? null,
        isHead:       m.is_head === 1,
      })),
    politics: {
      party:          sv.political_party        ?? null,
      partyOther:     sv.political_party_other  ?? null,
      cmSatisfaction: sv.cm_satisfaction        ?? null,
    },
    development: {
      works: (() => {
        try { return JSON.parse(sv.development_works || '[]'); } catch { return []; }
      })(),
      other: sv.development_other ?? null,
    },
    schemes: [],
    knownWorkers: {
      colony:   sv.colony_workers ?? null,
      block:    sv.block_workers  ?? null,
      bjp:      [],
      congress: [],
    },
    influential: influencers.map(p => ({
      name:        p.name,
      party:       p.party        ?? null,
      position:    p.position     ?? null,
      mobile:      p.mobile       ?? null,
      address:     p.address      ?? null,
      description: p.description  ?? null,
    })),
    remarks: sv.remarks ?? null,
  };
}

/**
 * Read one survey row from MySQL.
 * Returns null when no matching row exists yet (STATUS=0 / pre-survey state).
 */
export async function getRemoteSurvey(areaId, hno) {
  if (!areaId || !hno) return null;
  const [rows] = await query(
    'SELECT ID, STATUS, JSON_DATA, SURVEY_BY, SURVEY_DATE FROM SURVEY_DATA WHERE AREA_ID = ? AND HNO = ?',
    [areaId, String(hno)]
  );
  return rows[0] ?? null;
}

/**
 * UPSERT a survey row.
 * On duplicate (AREA_ID, HNO), updates JSON_DATA, STATUS, SURVEY_BY, SURVEY_DATE.
 */
export async function saveRemoteSurvey({ areaId, hno, jsonData, status, surveyBy }) {
  const now    = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const json   = JSON.stringify(jsonData);
  const byStr  = String(surveyBy ?? 'SYSTEM');

  await query(
    `INSERT INTO SURVEY_DATA (AREA_ID, HNO, JSON_DATA, STATUS, SURVEY_BY, SURVEY_DATE)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       JSON_DATA   = VALUES(JSON_DATA),
       STATUS      = VALUES(STATUS),
       SURVEY_BY   = VALUES(SURVEY_BY),
       SURVEY_DATE = VALUES(SURVEY_DATE)`,
    [areaId, String(hno), json, status, byStr, now]
  );
}
