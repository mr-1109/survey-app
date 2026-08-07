import 'server-only';
import mysql from 'mysql2/promise';

/**
 * Hot reload throws this module away and a new pool would re-do the TCP +
 * auth handshake (~1s to this host) on the next request. Park it on
 * globalThis in dev so reloads keep the open connections.
 */
const globalForPool = globalThis;

export function getPool() {
  if (!globalForPool.__votersPool) {
    globalForPool.__votersPool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      charset: 'utf8mb4', // required — Devanagari breaks without it
      waitForConnections: true,
      connectionLimit: 5, // shared host; keep this small
      enableKeepAlive: true,
      connectTimeout: 8000, // fail fast instead of hanging on a dead host
    });
  }
  return globalForPool.__votersPool;
}

/** Host-level blips, not query errors — worth one retry. */
const TRANSIENT = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'PROTOCOL_CONNECTION_LOST',
]);

export function isTransient(error) {
  return TRANSIENT.has(error?.code);
}

/**
 * The shared host intermittently refuses connections for a few seconds. Without
 * a retry that surfaces as an empty voter list, which reads like "no data"
 * rather than "not connected".
 */
export async function query(sql, params = []) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await getPool().execute(sql, params);
    } catch (error) {
      if (attempt >= 1 || !isTransient(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

/**
 * Runs `fn` on one connection inside a transaction. Needed wherever a write
 * spans tables — creating a user touches `users`, `user_scope` and `accounts`,
 * and a half-made user with no scope would be worse than no user at all.
 * Not retried: a transaction that died mid-way cannot be safely replayed.
 */
export async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  } finally {
    conn.release();
  }
}
