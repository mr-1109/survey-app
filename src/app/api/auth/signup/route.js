import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  accountExists,
  createAccount,
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@server/auth';
import { countAccounts } from '@server/db/accounts';
import { isPhoneValid, isPasswordValid, normalizePhone } from '@shared/validation/credentials';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  /**
   * Bootstrap only. The first account is the unrestricted super admin; every
   * later account must be created through नया उपयोगकर्ता so it inherits a scope
   * bounded by its creator. Leaving this open would mint unscoped accounts.
   */
  if ((await countAccounts()) > 0) {
    return NextResponse.json(
      { error: 'नया खाता केवल व्यवस्थापक द्वारा "उपयोगकर्ता जोड़ें" से बनाया जा सकता है' },
      { status: 403 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'अमान्य JSON' }, { status: 400 });
  }

  const phone = normalizePhone(body?.phone);
  if (!isPhoneValid(phone)) {
    return NextResponse.json({ error: 'मोबाइल नंबर 10 अंकों का हो' }, { status: 400 });
  }

  const password = String(body?.password ?? '');
  if (!isPasswordValid(password)) {
    return NextResponse.json(
      { error: 'पासवर्ड नियमों को पूरा नहीं करता' },
      { status: 400 },
    );
  }

  if (password !== String(body?.confirmPassword ?? '')) {
    return NextResponse.json({ error: 'दोनों पासवर्ड मेल नहीं खाते' }, { status: 400 });
  }

  if (await accountExists(phone)) {
    return NextResponse.json({ error: 'यह मोबाइल नंबर पहले से पंजीकृत है' }, { status: 409 });
  }

  try {
    const account = await createAccount(phone, password);
    // The bootstrap account is unrestricted and has no user row to read.
    const { token, expiresAt } = createSession(account, []);
    cookies().set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return NextResponse.json({ phone: account.phone }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/auth/signup]', error.message);
    return NextResponse.json({ error: 'खाता नहीं बन सका' }, { status: 500 });
  }
}
