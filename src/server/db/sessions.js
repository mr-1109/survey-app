import 'server-only';
import crypto from 'node:crypto';
import { getLocalDb } from './local';

/**
 * Login sessions, kept in local SQLite even though the accounts they point at
 * live in nndb.
 *
 * Every request resolves a session, and a round-trip to the remote host costs
 * 150–450ms — paying that on each page load would make the whole app feel slow.
 * So the account's identity and scope are snapshotted onto the row at login and
 * request handling never leaves the process.
 *
 * The cost of a snapshot is staleness, which is settled by revoking sessions
 * whenever the user behind them changes: edit, pause or delete all force a
 * fresh login rather than letting an old scope linger.
 *
 * Only the SHA-256 of the token is stored, so a copy of this file hands over no
 * usable cookies.
 */

const SESSION_DAYS = 7;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * `scope` is the grant list to remember for this login, or null when the
 * account has no active `users` row — which must deny everything rather than
 * fall open to unrestricted.
 */
export function createSession(account, scope) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_DAYS * 86400000;
  getLocalDb()
    .prepare(
      `INSERT INTO sessions (token_hash, account_id, phone, name, is_super, scope_json, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      hashToken(token),
      account.id,
      account.phone,
      account.name ?? null,
      account.isSuper ? 1 : 0,
      scope === null ? null : JSON.stringify(scope),
      expiresAt,
    );
  return { token, expiresAt };
}

export function destroySession(token) {
  if (!token) return;
  getLocalDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

/** Forces re-login for one mobile number, after their user record changed. */
export function revokeSessionsForPhone(phone) {
  if (!phone) return;
  getLocalDb().prepare('DELETE FROM sessions WHERE phone = ?').run(String(phone));
}

/** Resolves a token to an account, clearing the row once it has expired. */
export function getAccountForToken(token) {
  if (!token) return null;
  const db = getLocalDb();
  const row = db
    .prepare('SELECT account_id, phone, name, is_super, scope_json, expires_at FROM sessions WHERE token_hash = ?')
    .get(hashToken(token));

  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    return null;
  }

  return {
    id:      row.account_id,
    phone:   row.phone,
    name:    row.name ?? null,
    isSuper: Boolean(row.is_super),
    // null means "no users row behind this account" — kept distinct from [],
    // which means a user with no limits.
    scope: row.scope_json === null ? null : JSON.parse(row.scope_json),
  };
}
