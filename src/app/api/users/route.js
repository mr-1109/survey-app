import { NextResponse } from 'next/server';
import { listUsers, createUser, ROLES, accountExists } from '@server/db/users';
import { isPasswordValid } from '@shared/validation/credentials';
import { apiViewer, unauthorized, forbidden } from '@server/auth';
import { filterUsersByScope, isFullAccess, materialiseScope } from '@server/scope';
import { normaliseScope, scopeSummary } from '@shared/scope';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const includeInactive = request.nextUrl.searchParams.get('all') === '1';
  try {
    const users = filterUsersByScope(await listUsers({ includeInactive }), viewer.scope);
    return NextResponse.json({
      users,
      viewerScope: isFullAccess(viewer.scope) ? [] : viewer.scope,
      viewerUnrestricted: isFullAccess(viewer.scope),
    });
  } catch (error) {
    console.error('[GET /api/users]', error);
    return NextResponse.json({ error: 'उपयोगकर्ता लोड नहीं हुए' }, { status: 500 });
  }
}

export async function POST(request) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'अमान्य JSON' }, { status: 400 });
  }

  const name = String(body?.name ?? '').trim();
  if (name.length < 2) {
    return NextResponse.json({ error: 'नाम कम से कम 2 अक्षर का हो' }, { status: 400 });
  }

  const mobile = String(body?.mobile ?? '').replace(/\D/g, '');
  if (mobile && mobile.length !== 10) {
    return NextResponse.json({ error: 'मोबाइल नंबर 10 अंकों का हो' }, { status: 400 });
  }

  const role = body?.role ?? 'karyakarta';
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: 'अमान्य भूमिका' }, { status: 400 });
  }

  /**
   * The hierarchy rule: a user may only create someone inside their own scope.
   * Every grant must fit inside one of the creator's, and levels left blank
   * inherit the creator's values. Enforced here, on the server — the form only
   * limits what can be picked.
   */
  const submitted = normaliseScope(body?.scope);
  if (submitted.some((g) => Object.values(g).flat().some((v) => v.length > 120))) {
    return NextResponse.json({ error: 'क्षेत्राधिकार का मान बहुत लंबा है' }, { status: 400 });
  }

  const resolved = materialiseScope(submitted, viewer.scope);
  if (!resolved.ok) {
    return forbidden(
      `आप केवल अपने क्षेत्र (${scopeSummary(viewer.scope)}) के भीतर ही उपयोगकर्ता जोड़ सकते हैं`,
    );
  }
  const scope = resolved.scope;

  // A password creates a login account for this user, keyed on their mobile.
  const password = String(body?.password ?? '');
  if (password) {
    if (mobile.length !== 10) {
      return NextResponse.json(
        { error: 'पासवर्ड के लिए 10 अंकों का मोबाइल नंबर आवश्यक है' },
        { status: 400 },
      );
    }
    if (!isPasswordValid(password)) {
      return NextResponse.json({ error: 'पासवर्ड नियमों को पूरा नहीं करता' }, { status: 400 });
    }
    if (await accountExists(mobile)) {
      return NextResponse.json(
        { error: 'इस मोबाइल नंबर से लॉगिन खाता पहले से मौजूद है' },
        { status: 409 },
      );
    }
  }

  try {
    return NextResponse.json(
      await createUser({ name, mobile, role, scope, password, createdBy: viewer.account.id }),
      { status: 201 },
    );
  } catch (error) {
    if (/UNIQUE|Duplicate entry/i.test(String(error.message))) {
      return NextResponse.json({ error: 'यह मोबाइल नंबर पहले से दर्ज है' }, { status: 409 });
    }
    console.error('[POST /api/users]', error);
    return NextResponse.json({ error: 'उपयोगकर्ता जोड़ा नहीं जा सका' }, { status: 500 });
  }
}
