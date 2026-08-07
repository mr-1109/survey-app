/**
 * One-time script: creates AREA_ID+HNO indexes on EROLL_NN055, then
 * pre-populates SURVEY_DATA with every house that has 2+ voters in the roll.
 *
 * Safe to re-run – INSERT IGNORE skips rows that already exist.
 *
 *   node --env-file=.env.local scripts/populate-survey-data.mjs
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host:     process.env.MYSQL_HOST,
  user:     process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  multipleStatements: true,
});

console.log('Connected to MySQL:', process.env.MYSQL_DATABASE);

// --- Step 1: ensure critical indexes on EROLL_NN055 ---
const EROLL_INDEXES = [
  ['idx_eroll_area',     'CREATE INDEX idx_eroll_area ON EROLL_NN055 (AREA_ID)'],
  ['idx_eroll_area_hno', 'CREATE INDEX idx_eroll_area_hno ON EROLL_NN055 (AREA_ID, HNO(64))'],
];
for (const [name, ddl] of EROLL_INDEXES) {
  const [rows] = await conn.execute(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'EROLL_NN055' AND INDEX_NAME = ?`,
    [process.env.MYSQL_DATABASE, name],
  );
  if (rows.length === 0) {
    console.log(`Creating index ${name}…`);
    await conn.execute(ddl);
    console.log(`  ✓ ${name}`);
  } else {
    console.log(`  · ${name} already exists`);
  }
}

// --- Step 2: ensure sessions table ---
await conn.execute(`
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash  VARCHAR(64) PRIMARY KEY,
    account_id  INT         NOT NULL,
    phone       VARCHAR(20),
    name        VARCHAR(100),
    is_super    TINYINT(1)  NOT NULL DEFAULT 0,
    scope_json  TEXT,
    expires_at  BIGINT      NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sess_phone   (phone),
    INDEX idx_sess_expires (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`);
console.log('sessions table ready');

// --- Step 3: count what EROLL has vs what SURVEY_DATA already has ---
const [[{ erollHouses }]] = await conn.execute(`
  SELECT COUNT(*) AS erollHouses FROM (
    SELECT AREA_ID, HNO FROM EROLL_NN055
    WHERE AREA_ID IS NOT NULL AND HNO IS NOT NULL
      AND TRIM(HNO) != '' AND TRIM(HNO) != '0'
    GROUP BY AREA_ID, HNO
    HAVING COUNT(*) >= 2
  ) t
`);
const [[{ existing }]] = await conn.execute('SELECT COUNT(*) AS existing FROM SURVEY_DATA');
console.log(`EROLL houses (2+ voters): ${erollHouses}`);
console.log(`SURVEY_DATA rows already: ${existing}`);

// --- Step 4: batch INSERT IGNORE ---
const BATCH = 5000;
let offset = 0;
let inserted = 0;

const EMPTY_JSON = JSON.stringify({
  version:    2,
  isDeleted:  false,
  familyEdits: {},
  memberEdits: {},
  addedMembers: [],
  influential: [],
  politics: {},
  development: {},
  schemes: [],
  knownWorkers: {},
  remarks: null,
});

console.log('Inserting missing houses into SURVEY_DATA…');
while (true) {
  const [houses] = await conn.execute(
    `SELECT AREA_ID, HNO FROM EROLL_NN055
     WHERE AREA_ID IS NOT NULL AND HNO IS NOT NULL
       AND TRIM(HNO) != '' AND TRIM(HNO) != '0'
     GROUP BY AREA_ID, HNO
     HAVING COUNT(*) >= 2
     ORDER BY AREA_ID, HNO
     LIMIT ? OFFSET ?`,
    [BATCH, offset],
  );
  if (!houses.length) break;

  // Build bulk INSERT with VALUES tuples
  const values = houses.map(() => '(?, ?, ?, 0)').join(', ');
  const flat   = houses.flatMap(h => [h.AREA_ID, h.HNO, EMPTY_JSON]);

  const [res] = await conn.execute(
    `INSERT IGNORE INTO SURVEY_DATA (AREA_ID, HNO, JSON_DATA, STATUS) VALUES ${values}`,
    flat,
  );
  inserted += res.affectedRows;
  offset   += houses.length;
  process.stdout.write(`\r  processed ${offset}/${erollHouses} (inserted ${inserted})`);
}
console.log('\nDone.');

const [[{ total }]] = await conn.execute('SELECT COUNT(*) AS total FROM SURVEY_DATA');
console.log(`SURVEY_DATA total rows: ${total}`);

await conn.end();
