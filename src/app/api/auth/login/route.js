import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyCredentials,
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@server/auth';
import { userForPhone } from '@server/db/users';
import { normalizePhone } from '@shared/validation/credentials';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'अमान्य JSON' }, { status: 400 });
  }

  const phone = normalizePhone(body?.phone);
  const password = String(body?.password ?? '');

  try {
    // One message for both failure modes — never reveal whether the phone exists.
    const account = phone && password ? await verifyCredentials(phone, password) : null;
    if (!account) {
      return NextResponse.json({ error: 'मोबाइल नंबर या पासवर्ड गलत है' }, { status: 401 });
    }

    // The scope is read once, here, and snapshotted onto the session, so that
    // no later request has to reach nndb. A super admin needs no lookup; anyone
    // else with no user row gets null, which denies everything.
    const user = account.isSuper ? null : await userForPhone(phone);
    const scope = account.isSuper ? [] : (user?.scope ?? null);

    const { token, expiresAt } = createSession(account, scope);
    cookies().set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return NextResponse.json({ phone: account.phone });
  } catch (error) {
    console.error('[POST /api/auth/login]', error.message);
    return NextResponse.json({ error: 'लॉगिन नहीं हो सका' }, { status: 500 });
  }
}
