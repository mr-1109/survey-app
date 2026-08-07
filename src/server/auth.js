import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getAccountForToken } from './db/sessions';
import { scopeForAccount } from './scope';

/**
 * Cookie / session glue.
 * Sessions live in MySQL (`sessions` table in nndb).
 * All auth functions are async.
 */

export { accountExists, createAccount, verifyCredentials } from './db/accounts';
export { createSession, destroySession } from './db/sessions';

export const SESSION_COOKIE = 'rj188_session';

export function authDisabled() {
  return process.env.NEXT_PUBLIC_PREVIEW_NO_AUTH === '1';
}

export async function currentAccount() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getAccountForToken(token);
}

/** Call at the top of every protected page. Redirects to the login screen. */
export async function requireAccount() {
  if (authDisabled()) return { id: 0, phone: 'preview' };
  const account = await currentAccount();
  if (!account) redirect('/');
  return account;
}

/**
 * For API routes: the account plus the scope it may act within.
 * Returns null when unauthenticated.
 */
export async function apiViewer() {
  if (authDisabled()) {
    return { account: { id: 0, phone: 'preview', isSuper: true }, scope: null };
  }
  const account = await currentAccount();
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
    secure:   process.env.NODE_ENV === 'production',
    path:     '/',
    expires:  new Date(expiresAt),
  };
}
