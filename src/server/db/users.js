import 'server-only';
import { query, withTransaction } from './pool';
import { createAccount, accountExists, deleteAccountForPhone } from './accounts';
import { revokeSessionsForPhone } from './sessions';
import { scopeFromRows, scopeToRows } from '@shared/scope';

/**
 * Users and their क्षेत्राधिकार, in nndb. The survey data itself is read from
 * local SQLite, but who may see it is decided here, so that one roll-out of
 * scope applies to every device rather than per phone.
 *
 * Every function is async — mysql2 has no synchronous API. Request-time auth
 * deliberately does not call into this module; it reads the snapshot on the
 * session row instead (see ./sessions).
 */

export const ROLES = ['karyakarta', 'booth_incharge', 'admin'];

/**
 * Attaches each user's grant list. One query for the whole page rather than one
 * per user, since every screen that lists users also shows their scope.
 */
async function withScopes(rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const [grants] = await query(
    `SELECT user_id, grant_no, level, value FROM user_scope
     WHERE user_id IN (${ids.map(() => '?').join(', ')})
     ORDER BY user_id, grant_no`,
    ids,
  );

  const byUser = new Map();
  for (const g of grants) {
    if (!byUser.has(g.user_id)) byUser.set(g.user_id, []);
    byUser.get(g.user_id).push(g);
  }
  return rows.map((r) => ({ ...r, scope: scopeFromRows(byUser.get(r.id) ?? []) }));
}

export async function listUsers({ includeInactive = false } = {}) {
  const [rows] = await query(
    `SELECT u.* FROM users u
     ${includeInactive ? '' : 'WHERE u.active = 1'}
     ORDER BY u.active DESC, u.name`,
  );
  return withScopes(rows);
}

/** Replaces a user's grants wholesale — scope edits are never partial. */
async function writeScope(conn, userId, scope) {
  await conn.execute('DELETE FROM user_scope WHERE user_id = ?', [userId]);
  for (const row of scopeToRows(scope)) {
    await conn.execute(
      'INSERT IGNORE INTO user_scope (user_id, grant_no, level, value) VALUES (?, ?, ?, ?)',
      [userId, row.grant_no, row.level, row.value],
    );
  }
}

export { accountExists };

/**
 * Creates the user row, and — when a password is supplied — the login account
 * that lets them sign in with the same mobile number. Both happen in one
 * transaction so a failed account never leaves a half-made user behind.
 *
 * The password itself is never stored on `users`; it goes to `accounts` as a
 * salted scrypt hash like every other credential.
 */
export async function createUser({
  name,
  mobile,
  role,
  scope = [],
  password = '',
  createdBy = null,
}) {
  const id = await withTransaction(async (conn) => {
    // created_by holds the creator's *account* id, so "users I onboarded" works
    // even for a super admin who has no user row of their own.
    const [info] = await conn.execute(
      'INSERT INTO users (name, mobile, role, created_by) VALUES (?, ?, ?, ?)',
      [name, mobile || null, role, createdBy ?? null],
    );
    const newId = Number(info.insertId);
    await writeScope(conn, newId, scope);
    if (password) await createAccount(mobile, password, conn);
    return newId;
  });

  return getUser(id);
}

/** Users this account personally onboarded, newest first. */
export async function listUsersCreatedBy(accountId) {
  const [rows] = await query('SELECT u.* FROM users u WHERE u.created_by = ? ORDER BY u.id DESC', [
    accountId,
  ]);
  return withScopes(rows);
}

/** The user row behind a login, matched on mobile number. */
export async function userForPhone(phone) {
  const [rows] = await query('SELECT * FROM users WHERE mobile = ? AND active = 1', [phone]);
  return rows.length ? (await withScopes(rows))[0] : undefined;
}

export async function getUser(id) {
  const [rows] = await query('SELECT * FROM users WHERE id = ?', [id]);
  return rows.length ? (await withScopes(rows))[0] : undefined;
}

/**
 * Edit a user's details and scope. Callers must have checked both old and new
 * scope. Their sessions are dropped, so a widened or narrowed क्षेत्राधिकार
 * takes effect at their next login instead of trailing the old snapshot.
 */
export async function updateUser(id, { name, mobile, role, scope = [] }) {
  const previous = await getUser(id);

  await withTransaction(async (conn) => {
    await conn.execute('UPDATE users SET name = ?, mobile = ?, role = ? WHERE id = ?', [
      name,
      mobile || null,
      role,
      id,
    ]);
    await writeScope(conn, id, scope);
  });

  await revokeSessionsForPhone(previous?.mobile);
  if (mobile && mobile !== previous?.mobile) await revokeSessionsForPhone(mobile);
  return getUser(id);
}

/**
 * Removes the user, their scope grants, their login account, and any sessions
 * it held.
 */
export async function deleteUser(id) {
  const row = await getUser(id);
  if (!row) return false;

  await withTransaction(async (conn) => {
    // user_scope cascades from users via ON DELETE CASCADE.
    if (row.mobile) await deleteAccountForPhone(row.mobile, conn);
    await conn.execute('DELETE FROM users WHERE id = ?', [id]);
  });

  await revokeSessionsForPhone(row.mobile);
  return true;
}

export async function setUserActive(id, active) {
  const row = await getUser(id);
  if (!row) return false;

  const [info] = await query('UPDATE users SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
  // A paused user must stop being able to act, not merely stop being listed.
  if (!active) await revokeSessionsForPhone(row.mobile);
  return info.affectedRows > 0;
}

export async function countUsers() {
  const [rows] = await query('SELECT COUNT(*) AS n FROM users WHERE active = 1');
  return Number(rows[0].n);
}

/** The grant list stored for one user id. */
export async function scopeRowsForUser(userId) {
  const [rows] = await query(
    'SELECT grant_no, level, value FROM user_scope WHERE user_id = ? ORDER BY grant_no',
    [userId],
  );
  return scopeFromRows(rows);
}
