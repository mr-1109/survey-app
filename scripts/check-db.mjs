/**
 * Build-order step 2: prove the connection returns Devanagari, not `??????`.
 *   npm run db:check
 */
import mysql from 'mysql2/promise';
import { loadEnv, poolConfig } from './env.mjs';

loadEnv();

const pool = mysql.createPool(poolConfig());

try {
  const [[counts]] = await pool.query(
    `SELECT COUNT(*) AS rows_total, COUNT(PHONE1) AS phones, COUNT(MAINCAST) AS castes,
            COUNT(DISTINCT BHAG) AS booths, COUNT(FEEDBACK_STATUS) AS feedback_set
     FROM SIR_RJ188_F`,
  );
  console.log('row counts:', counts);

  const [sample] = await pool.query(
    'SELECT VLISTID, VNAME, FNAME, AREACOLONY FROM SIR_RJ188_F LIMIT 3',
  );
  console.log('\nDevanagari sample (must not be ??????):');
  console.table(sample);

  const [zones] = await pool.query(
    'SELECT DISTINCT GENERALNOTES FROM SIR_RJ188_F ORDER BY GENERALNOTES',
  );
  console.log('\nक्षेत्र (GENERALNOTES):', zones.map((z) => z.GENERALNOTES));

  const [indexes] = await pool.query('SHOW INDEX FROM SIR_RJ188_F');
  console.log('\nindexes:', [...new Set(indexes.map((i) => i.Key_name))]);
} catch (error) {
  console.error('\nDB check failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
