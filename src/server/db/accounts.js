import 'server-only';
import crypto from 'node:crypto';
import { query } from './pool';

/**
 * Credential storage, in nndb. Pure database + crypto — no request context, so
 * any server module can use it. Cookies live in `@server/auth` and the session
 * rows themselves in `./sessions`, which stays local on purpose.
 *
 * Passwords are never stored or logged in the clear: each account gets a random
 * 16-byte salt and an scrypt hash, compared with timingSafeEqual.
 */

const KEYLEN = 64;

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, KEYLEN).toString('hex');
}

export async function accountExists(phone) {
  const [rows] = await query('SELECT 1 FROM accounts WHERE phone = ? LIMIT 1', [phone]);
  return rows.length > 0;
}

export async function countAccounts() {
  const [rows] = await query('SELECT COUNT(*) AS n FROM accounts');
  return Number(rows[0].n);
}

/**
 * The very first account bootstraps the system and is the only unrestricted
 * one; every later account is created through नया उपयोगकर्ता with a bounded
 * scope. `isSuper` is derived here, never taken from the request.
 */
export async function createAccount(phone, password, conn = null) {
  const run = conn ? (sql, params) => conn.execute(sql, params) : query;
  const salt = crypto.randomBytes(16).toString('hex');
  const isSuper = (await countAccounts()) === 0 ? 1 : 0;
  const [result] = await run(
    'INSERT INTO accounts (phone, password_hash, salt, is_super) VALUES (?, ?, ?, ?)',
    [phone, hashPassword(password, salt), salt, isSuper],
  );
  return { id: Number(result.insertId), phone, isSuper: Boolean(isSuper) };
}

export async function deleteAccountForPhone(phone, conn = null) {
  const run = conn ? (sql, params) => conn.execute(sql, params) : query;
  await run('DELETE FROM accounts WHERE phone = ?', [phone]);
}

/** Returns the account on success, null on bad phone *or* bad password. */
export async function verifyCredentials(phone, password) {
  const [rows] = await query(
    'SELECT id, phone, password_hash, salt, is_super FROM accounts WHERE phone = ?',
    [phone],
  );
  const row = rows[0];
  if (!row) {
    // Spend comparable time on unknown phones so the response does not reveal
    // whether the account exists.
    hashPassword(password, 'decoy-salt');
    return null;
  }

  const expected = Buffer.from(row.password_hash, 'hex');
  const actual = Buffer.from(hashPassword(password, row.salt), 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

  return { id: Number(row.id), phone: row.phone, isSuper: Boolean(row.is_super) };
}
