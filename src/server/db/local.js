import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

/**
 * Local SQLite store for the survey data: घर, their सदस्य, influential people
 * and the family survey, all imported from nndb's EROLL_NN055.
 *
 * Users, their क्षेत्राधिकार and their credentials live in nndb instead, so one
 * roll-out of scope applies everywhere. The only user-shaped thing kept here is
 * `sessions`, which every request reads and so cannot afford a remote hop.
 */

const DB_PATH = process.env.LOCAL_DB_PATH || path.join(process.cwd(), 'data', 'app.db');
const globalForLocal = globalThis;

const SCHEMA = `
/* Users, their scope and their credentials live in nndb, not here. What stays
   local is the session, because every request resolves one and a remote
   round-trip per page load is too slow to pay. The account's identity and
   scope are snapshotted onto the row at login. */
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT    PRIMARY KEY,
  account_id  INTEGER NOT NULL,
  phone       TEXT,
  is_super    INTEGER NOT NULL DEFAULT 0,
  scope_json  TEXT,
  expires_at  INTEGER NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS houses (
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
  created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at     TEXT,
  UNIQUE (area_id, house_no_raw)
);

CREATE TABLE IF NOT EXISTS house_members (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  house_id       INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  serial         TEXT,
  epic           TEXT,
  name           TEXT    NOT NULL,
  relation       TEXT,
  relative_name  TEXT,
  age            INTEGER,
  gender         TEXT,
  mobile         TEXT,
  occupation     TEXT,
  voter_category TEXT,
  education      TEXT,
  marital_status TEXT,
  note           TEXT,
  is_head        INTEGER NOT NULL DEFAULT 0,
  is_verified    INTEGER NOT NULL DEFAULT 0,
  is_deleted     INTEGER NOT NULL DEFAULT 0,
  list_type      TEXT,
  source         TEXT    NOT NULL DEFAULT 'roll',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at     TEXT
);

CREATE TABLE IF NOT EXISTS house_surveys (
  house_id          INTEGER PRIMARY KEY REFERENCES houses(id) ON DELETE CASCADE,
  party_support     TEXT,
  kisan_benefits    TEXT,
  kisan_other       TEXT,
  cm_satisfaction   TEXT,
  remarks           TEXT,
  political_party        TEXT,
  political_party_other  TEXT,
  development_works      TEXT,
  development_other      TEXT,
  colony_workers          TEXT,
  block_workers           TEXT,
  surveyed_by       INTEGER REFERENCES users(id),
  surveyed_at       TEXT,
  updated_at        TEXT
);

CREATE TABLE IF NOT EXISTS influential_persons (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  house_id     INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  party        TEXT    NOT NULL,
  position     TEXT,
  mobile       TEXT,
  address      TEXT,
  description  TEXT    NOT NULL,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT
);

CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

`;

/**
 * Indexes are applied after `migrate`, never with the tables: an index on a
 * column that a migration is about to add would fail on an older database and
 * take the whole schema step down with it.
 */
const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_influencers_house ON influential_persons (house_id);
CREATE INDEX IF NOT EXISTS idx_houses_ward   ON houses (ward_no, part_no);
CREATE INDEX IF NOT EXISTS idx_houses_status ON houses (survey_status);
CREATE INDEX IF NOT EXISTS idx_members_house ON house_members (house_id);
CREATE INDEX IF NOT EXISTS idx_members_epic  ON house_members (epic);
CREATE INDEX IF NOT EXISTS idx_members_name  ON house_members (name);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions (account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_phone   ON sessions (phone);
`;

/**
 * Columns added after the first release. SQLite has no
 * `ADD COLUMN IF NOT EXISTS`, so check what is already there.
 */

/** निर्भरता — who this member depends on (usually the परिवार मुखिया). */
const HOUSE_MEMBER_COLUMNS = {
  dependent_on: 'TEXT',
};

/** Added for the new (screens 1–16) मकान flow — see GHAR_SURVEY_PLAN.md §0/§3. */
const HOUSE_COLUMNS = {
  caste: 'TEXT',
  subcaste: 'TEXT',
  source: "TEXT NOT NULL DEFAULT 'roll'",
  is_deleted: 'INTEGER NOT NULL DEFAULT 0',
  area_id: 'TEXT',
  // Upper scope levels, copied from the roll so the user-scope picker can offer
  // real values. DISTT / TEHSIL / CITY are NULL across EROLL_NN055 today, so
  // these stay empty until the source carries them.
  district: 'TEXT',
  tehsil: 'TEXT',
  city: 'TEXT',
  assembly: 'TEXT',
};

const HOUSE_SURVEY_COLUMNS = {
  political_party: 'TEXT',
  political_party_other: 'TEXT',
  development_works: 'TEXT',
  development_other: 'TEXT',
  colony_workers: 'TEXT',
  block_workers: 'TEXT',
};

function addMissing(db, table, columns) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  for (const [name, type] of Object.entries(columns)) {
    if (!existing.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
}

/**
 * The original houses UNIQUE was (ward_no, part_no, page, house_no).
 * Multiple AREA_IDs within the same ward/bhag share the same HNO numbers,
 * so INSERT OR IGNORE was silently dropping them. Change to (area_id, house_no_raw).
 */
function fixHousesUniqueConstraint(db) {
  const indexes = db.prepare("PRAGMA index_list(houses)").all();
  const hasOld = indexes.some(ix => {
    const cols = db.prepare(`PRAGMA index_info(${ix.name})`).all().map(c => c.name);
    return cols.includes('ward_no') && cols.includes('part_no') && cols.includes('page') && cols.includes('house_no');
  });
  if (!hasOld) return;

  // Modern SQLite rewrites references to a renamed table inside *other* tables'
  // FK clauses, so renaming `houses` would silently repoint house_members /
  // house_surveys / influential_persons at `houses_old` — which is dropped a
  // few statements later, breaking every write. legacy_alter_table leaves them
  // pointing at `houses`, which is what we recreate.
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
    INSERT OR IGNORE INTO houses
      (id, ward_no, part_no, page, house_no, house_no_raw, head_name, mobile, area,
       caste, subcaste, total_members, voter_count, note, survey_status, needs_review,
       source, is_deleted, area_id, created_at, updated_at)
    SELECT
      id, ward_no, part_no, page, house_no, house_no_raw, head_name, mobile, area,
      caste, subcaste, total_members, voter_count, note, survey_status, needs_review,
      source, is_deleted, area_id, created_at, updated_at
    FROM houses_old;
    DROP TABLE houses_old;
  `);
  db.pragma('legacy_alter_table = OFF');
}

/**
 * Repairs databases already damaged by the rename described above: their
 * child tables carry `REFERENCES "houses_old"`, a table that no longer exists,
 * so every survey/member/influencer write fails the FK check. Rebuild each
 * affected table from its own stored DDL with the reference pointed back at
 * `houses`, preserving rows.
 */
function repairHousesReferences(db) {
  const broken = db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND sql LIKE '%houses_old%'")
    .all();
  if (!broken.length) return;

  db.pragma('foreign_keys = OFF');
  db.pragma('legacy_alter_table = ON');

  db.transaction(() => {
    for (const { name, sql } of broken) {
      const tmp = `${name}__fixed`;
      const ddl = sql
        .replace(/"houses_old"|houses_old/g, 'houses')
        .replace(new RegExp(`CREATE TABLE\\s+"?${name}"?`), `CREATE TABLE ${tmp}`);
      db.exec(ddl);

      const cols = db
        .prepare(`PRAGMA table_info(${tmp})`)
        .all()
        .map((c) => `"${c.name}"`)
        .join(', ');
      db.exec(`INSERT INTO ${tmp} (${cols}) SELECT ${cols} FROM "${name}"`);
      db.exec(`DROP TABLE "${name}"`);
      db.exec(`ALTER TABLE ${tmp} RENAME TO "${name}"`);
    }
  })();

  db.pragma('legacy_alter_table = OFF');
  db.pragma('foreign_keys = ON');
}

/**
 * `surveyed_by` was originally declared `REFERENCES users(id)`, but callers
 * pass the signed-in *account* id (accounts.id), a different id space — the
 * FK could never be satisfied and every survey save failed. SQLite can't
 * drop a column constraint in place, so rebuild the table without it.
 */
function dropSurveyedByForeignKey(db) {
  const fks = db.prepare('PRAGMA foreign_key_list(house_surveys)').all();
  if (!fks.some((fk) => fk.table === 'users')) return;

  db.exec(`
    ALTER TABLE house_surveys RENAME TO house_surveys_old;
    CREATE TABLE house_surveys (
      house_id               INTEGER PRIMARY KEY REFERENCES houses(id) ON DELETE CASCADE,
      party_support          TEXT,
      kisan_benefits         TEXT,
      kisan_other            TEXT,
      cm_satisfaction        TEXT,
      remarks                TEXT,
      political_party        TEXT,
      political_party_other  TEXT,
      development_works      TEXT,
      development_other      TEXT,
      colony_workers         TEXT,
      block_workers          TEXT,
      surveyed_by            INTEGER,
      surveyed_at            TEXT,
      updated_at             TEXT
    );
    INSERT INTO house_surveys
      (house_id, party_support, kisan_benefits, kisan_other, cm_satisfaction, remarks,
       political_party, political_party_other, development_works, development_other,
       colony_workers, block_workers, surveyed_by, surveyed_at, updated_at)
    SELECT
      house_id, party_support, kisan_benefits, kisan_other, cm_satisfaction, remarks,
      political_party, political_party_other, development_works, development_other,
      colony_workers, block_workers, surveyed_by, surveyed_at, updated_at
    FROM house_surveys_old;
    DROP TABLE house_surveys_old;
  `);
}

/** Snapshot columns added when users moved to nndb. */
const SESSION_COLUMNS = {
  phone: 'TEXT',
  is_super: 'INTEGER NOT NULL DEFAULT 0',
  scope_json: 'TEXT',
};

/**
 * Users, their scope and their credentials now live in nndb. The local copies
 * are dropped rather than left to rot, so there is one answer to "who may see
 * what" instead of two that can disagree.
 *
 * `sessions` is rebuilt first: it carried `REFERENCES accounts(id)`, and with
 * `accounts` gone every login would fail the FK check. Existing sessions are
 * not carried over — they hold no scope snapshot, so their owners must sign in
 * again to get one.
 */
function moveUsersToRemote(db) {
  const tables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name),
  );
  if (!tables.has('users') && !tables.has('accounts') && !tables.has('user_scope')) return;

  db.pragma('foreign_keys = OFF');
  db.transaction(() => {
    db.exec(`
      DROP TABLE IF EXISTS sessions;
      CREATE TABLE sessions (
        token_hash  TEXT    PRIMARY KEY,
        account_id  INTEGER NOT NULL,
        phone       TEXT,
        is_super    INTEGER NOT NULL DEFAULT 0,
        scope_json  TEXT,
        expires_at  INTEGER NOT NULL,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
      );
      DROP TABLE IF EXISTS user_scope;
      DROP TABLE IF EXISTS accounts;
      DROP TABLE IF EXISTS followups;
      DROP TABLE IF EXISTS survey_entries;
      DROP TABLE IF EXISTS users;
    `);
  })();
  db.pragma('foreign_keys = ON');
}

function migrate(db) {
  moveUsersToRemote(db);
  addMissing(db, 'sessions', SESSION_COLUMNS);
  addMissing(db, 'house_members', HOUSE_MEMBER_COLUMNS);
  addMissing(db, 'houses', HOUSE_COLUMNS);
  addMissing(db, 'house_surveys', HOUSE_SURVEY_COLUMNS);
  fixHousesUniqueConstraint(db);
  repairHousesReferences(db);
  dropSurveyedByForeignKey(db);
  // A rebuilt table loses anything SCHEMA had created for it; the caller
  // re-applies SCHEMA's indexes right after this returns.
  db.exec(SCHEMA);
}

/**
 * Bump when SCHEMA or USER_COLUMNS changes. The handle is cached on globalThis
 * to survive hot reloads, so without a version check a schema change would be
 * skipped entirely on an already-open connection.
 */
const SCHEMA_VERSION = 13;

export function getLocalDb() {
  if (!globalForLocal.__localDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    globalForLocal.__localDb = db;
    globalForLocal.__localDbVersion = null;
  }

  if (globalForLocal.__localDbVersion !== SCHEMA_VERSION) {
    globalForLocal.__localDb.exec(SCHEMA);
    migrate(globalForLocal.__localDb);
    globalForLocal.__localDb.exec(INDEXES);
    globalForLocal.__localDbVersion = SCHEMA_VERSION;
  }

  return globalForLocal.__localDb;
}

export function getMeta(key) {
  const row = getLocalDb().prepare('SELECT value FROM app_meta WHERE key = ?').get(key);
  return row?.value ?? null;
}

export function setMeta(key, value) {
  getLocalDb()
    .prepare('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value);
}

/** YYYY-MM-DD in local time — follow-up dates are calendar days, not instants. */
export function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
