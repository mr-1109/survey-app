import { NextResponse } from 'next/server';
import {
  setUserActive,
  getUser,
  updateUser,
  deleteUser,
  accountExists,
  ROLES,
} from '@server/db/users';
import { apiViewer, unauthorized, forbidden } from '@server/auth';
import { canAssign, materialiseScope } from '@server/scope';
import { normaliseScope } from '@shared/scope';

export const dynamic = 'force-dynamic';

function parseId(params) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Resolves the target and checks the viewer may act on it. Returns either
 * `{ error }` to return straight to the client, or `{ target }`.
 */
async function authorize(params) {
  const viewer = await apiViewer();
  if (!viewer) return { error: unauthorized() };

  const id = parseId(params);
  if (!id) return { error: NextResponse.json({ error: 'अमान्य id' }, { status: 400 }) };

  const target = await getUser(id);
  if (!target) {
    return { error: NextResponse.json({ error: 'उपयोगकर्ता नहीं मिला' }, { status: 404 }) };
  }
  if (!canAssign(viewer.scope, target.scope)) return { error: forbidden() };

  return { viewer, id, target };
}

/** Pause/resume with `{ active }`, or edit by sending the other fields. */
export async function PATCH(request, { params }) {
  const auth = await authorize(params);
  if (auth.error) return auth.error;
  const { viewer, id } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'अमान्य JSON' }, { status: 400 });
  }

  // Pause / resume.
  if (typeof body?.active === 'boolean' && body.name === undefined) {
    if (!(await setUserActive(id, body.active))) {
      return NextResponse.json({ error: 'उपयोगकर्ता नहीं मिला' }, { status: 404 });
    }
    return NextResponse.json({ id, active: body.active });
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

  // The *new* scope must also sit inside the viewer's — no promoting someone
  // out of your own area.
  const submitted = normaliseScope(body?.scope);
  if (submitted.some((g) => Object.values(g).flat().some((v) => v.length > 120))) {
    return NextResponse.json({ error: 'क्षेत्राधिकार का मान बहुत लंबा है' }, { status: 400 });
  }

  const resolved = materialiseScope(submitted, viewer.scope);
  if (!resolved.ok) return forbidden();
  const scope = resolved.scope;

  // Changing the mobile would orphan an existing login on the old number.
  if (mobile && mobile !== (auth.target.mobile ?? '') && (await accountExists(mobile))) {
    return NextResponse.json(
      { error: 'इस मोबाइल नंबर से लॉगिन खाता पहले से मौजूद है' },
      { status: 409 },
    );
  }

  try {
    return NextResponse.json(await updateUser(id, { name, mobile, role, scope }));
  } catch (error) {
    if (/UNIQUE|Duplicate entry/i.test(String(error.message))) {
      return NextResponse.json({ error: 'यह मोबाइल नंबर पहले से दर्ज है' }, { status: 409 });
    }
    console.error('[PATCH /api/users/:id]', error);
    return NextResponse.json({ error: 'उपयोगकर्ता अपडेट नहीं हुआ' }, { status: 500 });
  }
}

/** Removes the user and their login. Follow-ups survive, unassigned. */
export async function DELETE(request, { params }) {
  const auth = await authorize(params);
  if (auth.error) return auth.error;

  try {
    if (!(await deleteUser(auth.id))) {
      return NextResponse.json({ error: 'उपयोगकर्ता नहीं मिला' }, { status: 404 });
    }
    return NextResponse.json({ id: auth.id, deleted: true });
  } catch (error) {
    console.error('[DELETE /api/users/:id]', error);
    return NextResponse.json({ error: 'उपयोगकर्ता हटाया नहीं जा सका' }, { status: 500 });
  }
}
