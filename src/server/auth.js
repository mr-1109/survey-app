import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getAccountForToken } from './db/sessions';
import { scopeForAccount } from './scope';

/**
 * Cookie/session glue. Credentials live in db/accounts.js (nndb) and session
 * rows in db/sessions.js (local SQLite).
 *
 * Everything here stays synchronous: the session row already carries the
 * account's identity and scope, so a page or API route can resolve its viewer
 * without awaiting the remote database.
 */

export { accountExists, createAccount, verifyCredentials } from './db/accounts';
export { createSession, destroySession } from './db/sessions';

export const SESSION_COOKIE = 'rj188_session';

/** Auth can be disabled for local preview, per §7 of the spec — flag, not code edit. */
export function authDisabled() {
  return process.env.NEXT_PUBLIC_PREVIEW_NO_AUTH === '1';
}

export function currentAccount() {
  return getAccountForToken(cookies().get(SESSION_COOKIE)?.value);
}

/** Call at the top of every protected page. Redirects to the login screen. */
export function requireAccount() {
  if (authDisabled()) return { id: 0, phone: 'preview' };
  const account = currentAccount();
  if (!account) redirect('/');
  return account;
}

/**
 * For API routes: the account plus the scope it may act within. Returns null
 * when unauthenticated so the caller can answer 401.
 */
export function apiViewer() {
  if (authDisabled()) return { account: { id: 0, phone: 'preview', isSuper: true }, scope: null };
  const account = currentAccount();
  if (!account) return null;
  return { account, scope: scopeForAccount(account) };
}

export function unauthorized() {
  return NextResponse.json({ error: 'लॉगिन आवश्यक है' }, { status: 401 });
}

export function forbidden(message = 'इस क्षेत्र की अनुमति नहीं है') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function sessionCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  };
}
