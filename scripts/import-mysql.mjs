/**
 * Imports EROLL_NN055 from remote MySQL into the local SQLite survey store.
 *
 *   npm run import:mysql
 *
 * Groups rows by (AREA_ID, HNO) — exactly the same key used by SURVEY_DATA —
 * so every house in SQLite maps 1-to-1 with a potential SURVEY_DATA row.
 * Idempotent: wipes houses / house_members / house_surveys / influential_persons
 * and rebuilds fresh on every run.
 */

import path from 'node:path';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { foldDigits } from '../src/shared/houseNumber.js';

// ---- load .env.local --------------------------------------------------------
function loadEnv() {
  try {
    const raw = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* rely on pre-set env */ }
}
loadEnv();

const require = createRequire(import.meta.url);
const mysql    = require('mysql2/promise');
const Database = require('better-sqlite3');

const DB_PATH = process.env.LOCAL_DB_PATH || path.join(process.cwd(), 'data', 'app.db');

// ---- helpers ----------------------------------------------------------------
const GENDER_MAP = { 'पुरूष': 'M', 'पुरुष': 'M', 'स्त्री': 'F', 'F': 'F', 'M': 'M' };

function toAge(v) {
  const n = Number(foldDigits(String(v ?? '')).trim());
  return Number.isFinite(n) && n > 0 && n < 130 ? n : null;
}
function clean(v)  { if (!v) return null; const s = String(v).trim(); return s || null; }
function phone(v)  { if (!v) return null; const s = foldDigits(String(v)).replace(/\D/g, ''); return s.length >= 8 ? s : null; }
function stripLeadingZeros(s) {
  if (!s) return null;
  const stripped = String(s).replace(/^0+/, '');
  return stripped || String(s); // keep original if all zeros
}

// ---- main -------------------------------------------------------------------
async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.MYSQL_HOST,
    port:     Number(process.env.MYSQL_PORT ?? 3306),
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    charset:  'utf8mb4',
  });

  console.log(`Connected → ${process.env.MYSQL_HOST}/${process.env.MYSQL_DATABASE}`);

  // Fetch in batches of 20 000 to avoid shared-host connection timeout
  const BATCH = 20000;
  const rows  = [];
  let offset  = 0;
  process.stdout.write('Fetching EROLL_NN055 ');
  while (true) {
    const [batch] = await conn.query(`
      SELECT AREA_ID, WARD, BHAG, SECTION_NO, HNO, AREACOLONY,
             VNAME, FNAME, MAINCAST, SUBCAST,
             SEX, AGE, PHONE1, PHONE2, IDCARD_NO, RELATION,
             DISTT, TEHSIL, CITY, RESITYPE
      FROM EROLL_NN055
      LIMIT ${BATCH} OFFSET ${offset}
    `);
    rows.push(...batch);
    process.stdout.write('.');
    if (batch.length < BATCH) break;
    offset += BATCH;
  }
  await conn.end();
  process.stdout.write('\n');
  console.log(`  ${rows.length.toLocaleString()} rows fetched`);

  // ---- group by (AREA_ID, HNO) — same key as SURVEY_DATA ------------------
  // Key: `${area_id}|||${hno_raw}`
  const houseMap = new Map();

  for (const r of rows) {
    const areaId = clean(r.AREA_ID);
    const hnoRaw = foldDigits(clean(r.HNO));
    if (!areaId || !hnoRaw || hnoRaw === '0') continue; // skip rows with no house number

    const key = `${areaId}|||${hnoRaw}`;
    if (!houseMap.has(key)) {
      houseMap.set(key, {
        area_id:  areaId,
        ward:     String(r.WARD  ?? ''),
        part:     String(r.BHAG  ?? ''),
        page:     r.SECTION_NO ?? 0,
        hno_raw:  hnoRaw,
        area:     clean(r.AREACOLONY),
        caste:    clean(r.MAINCAST),
        subcaste: clean(r.SUBCAST),
        district: clean(r.DISTT),
        tehsil:   clean(r.TEHSIL),
        city:     clean(r.CITY),
        assembly: clean(r.RESITYPE),
        members:  [],
      });
    }
    const h = houseMap.get(key);
    if (!h.caste)    h.caste    = clean(r.MAINCAST);
    if (!h.subcaste) h.subcaste = clean(r.SUBCAST);
    if (!h.area)     h.area     = clean(r.AREACOLONY);
    if (!h.district) h.district = clean(r.DISTT);
    if (!h.tehsil)   h.tehsil   = clean(r.TEHSIL);
    if (!h.city)     h.city     = clean(r.CITY);
    if (!h.assembly) h.assembly = clean(r.RESITYPE);

    h.members.push({
      name:          clean(r.VNAME) ?? '—',
      relative_name: clean(r.FNAME),
      relation:      clean(r.RELATION),
      gender:        GENDER_MAP[String(r.SEX ?? '').trim()] ?? null,
      age:           toAge(r.AGE),
      mobile:        phone(r.PHONE1) ?? phone(r.PHONE2),
      epic:          clean(r.IDCARD_NO),
    });
  }

  console.log(`  ${houseMap.size.toLocaleString()} houses grouped`);

  // ---- open SQLite ----------------------------------------------------------
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF');

  // Fix unique constraint: old DBs have UNIQUE(ward_no, part_no, page, house_no)
  // which causes silent data loss when multiple AREA_IDs share the same HNO.
  // Correct key is UNIQUE(area_id, house_no_raw) — same as SURVEY_DATA primary key.
  const indexes = db.prepare('PRAGMA index_list(houses)').all();
  const hasOldUnique = indexes.some(ix => {
    const ixCols = db.prepare(`PRAGMA index_info(${ix.name})`).all().map(c => c.name);
    return ixCols.includes('ward_no') && ixCols.includes('house_no');
  });
  if (hasOldUnique) {
    console.log('  Migrating houses UNIQUE constraint …');
    // Without this, SQLite repoints other tables' FK clauses at houses_old,
    // which is dropped below — breaking every later write to those tables.
    db.pragma('legacy_alter_table = ON');
    db.exec(`
      ALTER TABLE houses RENAME TO houses_old;
      CREATE TABLE houses (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        ward_no        TEXT    NOT NULL,
        part_no        TEXT    NOT NULL,
        page           INTEGER NOT NULL,
        house_no       TEXT,
        house_no_raw   TEXT,
        head_name      TEXT,
        mobile         TEXT,
        area           TEXT,
        caste          TEXT,
        subcaste       TEXT,
        total_members  INTEGER,
        voter_count    INTEGER NOT NULL DEFAULT 0,
        note           TEXT,
        survey_status  TEXT    NOT NULL DEFAULT 'pending',
        needs_review   INTEGER NOT NULL DEFAULT 0,
        source         TEXT    NOT NULL DEFAULT 'roll',
        is_deleted     INTEGER NOT NULL DEFAULT 0,
        area_id        TEXT,
        created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at     TEXT,
        UNIQUE (area_id, house_no_raw)
      );
      DROP TABLE houses_old;
    `);
    db.pragma('legacy_alter_table = OFF');
    console.log('  Done.');
  }

  // Columns added after the first release. Runs *after* any table rebuild above,
  // which would otherwise drop them.
  const cols = new Set(db.prepare('PRAGMA table_info(houses)').all().map(c => c.name));
  for (const [name, type] of Object.entries({
    area_id: 'TEXT', district: 'TEXT', tehsil: 'TEXT', city: 'TEXT', assembly: 'TEXT',
  })) {
    if (!cols.has(name)) db.exec(`ALTER TABLE houses ADD COLUMN ${name} ${type}`);
  }

  db.exec(`
    DELETE FROM influential_persons;
    DELETE FROM house_surveys;
    DELETE FROM house_members;
    DELETE FROM houses;
  `);
  console.log('Cleared existing data. Inserting …');

  const insMember = db.prepare(`
    INSERT INTO house_members
      (house_id, name, relation, relative_name, gender, age, mobile, epic, is_head, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'roll')
  `);

  const insertAll = db.transaction((entries) => {
    let houseCount = 0, memberCount = 0;

    for (const [, h] of entries) {
      const members    = h.members;
      const voterCount = members.length;

      // Head: oldest male, fallback oldest person
      const sorted = [...members].sort((a, b) => (b.age ?? 0) - (a.age ?? 0));
      const head   = sorted.find(m => m.gender === 'M') ?? sorted[0];

      const hnoNorm = stripLeadingZeros(h.hno_raw);

      const info = db.prepare(`
        INSERT INTO houses
          (area_id, ward_no, part_no, page,
           house_no, house_no_raw, head_name, mobile,
           area, caste, subcaste, district, tehsil, city, assembly,
           voter_count, total_members, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'roll')
      `).run(
        h.area_id, h.ward, h.part, h.page,
        hnoNorm, h.hno_raw,
        head?.name ?? null, head?.mobile ?? null,
        h.area, h.caste, h.subcaste,
        h.district, h.tehsil, h.city, h.assembly,
        voterCount, voterCount
      );

      const houseId = info.lastInsertRowid;
      houseCount++;

      for (const m of members) {
        insMember.run(
          houseId, m.name, m.relation, m.relative_name,
          m.gender, m.age, m.mobile, m.epic,
          m === head ? 1 : 0
        );
        memberCount++;
      }
    }
    return { houseCount, memberCount };
  });

  const { houseCount, memberCount } = insertAll(houseMap);
  db.pragma('foreign_keys = ON');
  db.close();

  console.log(`\n✓ Import complete`);
  console.log(`  Houses  : ${houseCount.toLocaleString()}`);
  console.log(`  Members : ${memberCount.toLocaleString()}`);
}

main().catch(err => { console.error('Import failed:', err.message); process.exit(1); });
