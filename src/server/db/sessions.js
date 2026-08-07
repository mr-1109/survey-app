import 'server-only';
import crypto from 'node:crypto';
import { query } from './pool';

/**
 * Session management — stored in nndb MySQL `sessions` table.
 * All functions are async. The table is created by scripts/populate-survey-data.mjs.
 */

const SESSION_DAYS = 7;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(account, scope) {
  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_DAYS * 86400000;

  await query(
    `INSERT INTO sessions (token_hash, account_id, phone, name, is_super, scope_json, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       account_id = VALUES(account_id),
       phone      = VALUES(phone),
       name       = VALUES(name),
       is_super   = VALUES(is_super),
       scope_json = VALUES(scope_json),
       expires_at = VALUES(expires_at)`,
    [
      hashToken(token),
      account.id,
      account.phone ?? null,
      account.name  ?? null,
      account.isSuper ? 1 : 0,
      scope === null ? null : JSON.stringify(scope),
      expiresAt,
    ],
  );

  return { token, expiresAt };
}

export async function destroySession(token) {
  if (!token) return;
  await query('DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
}

export async function revokeSessionsForPhone(phone) {
  if (!phone) return;
  await query('DELETE FROM sessions WHERE phone = ?', [String(phone)]);
}

/** mysql2 may auto-parse longtext that looks like JSON; handle both cases. */
function parseScope(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return raw; // already parsed as object/array by driver
  try { return JSON.parse(raw); } catch { return null; }
}

export async function getAccountForToken(token) {
  if (!token) return null;

  const [rows] = await query(
    'SELECT account_id, phone, name, is_super, scope_json, expires_at FROM sessions WHERE token_hash = ?',
    [hashToken(token)],
  );
  const row = rows[0];
  if (!row) return null;

  if (Number(row.expires_at) < Date.now()) {
    await query('DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
    return null;
  }

  return {
    id:      row.account_id,
    phone:   row.phone  ?? null,
    name:    row.name   ?? null,
    isSuper: Boolean(row.is_super),
    scope:   parseScope(row.scope_json),
  };
}
