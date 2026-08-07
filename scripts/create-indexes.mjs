/**
 * Build-order step 3: add the three indexes from §3.5 to the live table, then
 * prove the booth query uses idx_bhag.  Writes DDL to production — run once.
 *   npm run db:indexes
 */
import mysql from 'mysql2/promise';
import { loadEnv, poolConfig } from './env.mjs';

loadEnv();

const WANTED = [
  ['idx_bhag', 'CREATE INDEX idx_bhag ON SIR_RJ188_F (BHAG)'],
  ['idx_bhag_voter', 'CREATE INDEX idx_bhag_voter ON SIR_RJ188_F (BHAG, VOTERID)'],
  ['idx_feedback', 'CREATE INDEX idx_feedback ON SIR_RJ188_F (FEEDBACK_STATUS)'],
];

const pool = mysql.createPool(poolConfig());

try {
  const [rows] = await pool.query('SHOW INDEX FROM SIR_RJ188_F');
  const existing = new Set(rows.map((r) => r.Key_name));

  for (const [name, ddl] of WANTED) {
    if (existing.has(name)) {
      console.log(`skip  ${name} — already present`);
      continue;
    }
    process.stdout.write(`create ${name} … `);
    const started = Date.now();
    await pool.query(ddl);
    console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }

  const [plan] = await pool.query('EXPLAIN SELECT VLISTID FROM SIR_RJ188_F WHERE BHAG = 7');
  console.log('\nEXPLAIN WHERE BHAG = 7:');
  console.table(plan);
} catch (error) {
  console.error('\nIndex creation failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
