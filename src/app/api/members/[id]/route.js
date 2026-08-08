import { NextResponse } from 'next/server';
import { updateMember, deleteMember } from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';
import { guardMember } from '@server/guards';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const denied = await guardMember(params.id, viewer);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'अमान्य JSON' }, { status: 400 });
  }

  const patch = {};

  if ('name' in body) {
    const name = String(body.name ?? '').trim();
    if (name.length < 2) return NextResponse.json({ error: 'नाम कम से कम 2 अक्षर का हो' }, { status: 400 });
    patch.name = name;
  }

  if ('age' in body) {
    const age = body.age === '' || body.age == null ? null : Number(body.age);
    if (age !== null && (!Number.isInteger(age) || age < 0 || age > 130))
      return NextResponse.json({ error: 'आयु 0 से 130 के बीच हो' }, { status: 400 });
    patch.age = age;
  }

  if ('gender' in body) {
    if (body.gender && !['M', 'F', 'O'].includes(body.gender))
      return NextResponse.json({ error: 'अमान्य लिंग' }, { status: 400 });
    patch.gender = body.gender || null;
  }

  if ('mobile' in body) {
    const mobile = String(body.mobile ?? '').replace(/\D/g, '');
    if (mobile && mobile.length !== 10)
      return NextResponse.json({ error: 'मोबाइल नंबर 10 अंकों का हो' }, { status: 400 });
    patch.mobile = mobile || null;
  }

  for (const field of ['relation', 'relative_name', 'caste', 'occupation', 'voter_category', 'education', 'marital_status', 'note', 'epic', 'dependent_on']) {
    if (field in body) patch[field] = String(body[field] ?? '').trim() || null;
  }
  if ('is_head'     in body) patch.is_head     = body.is_head     ? 1 : 0;
  if ('is_verified' in body) patch.is_verified = body.is_verified ? 1 : 0;

  try {
    return NextResponse.json(await updateMember(params.id, patch));
  } catch (error) {
    console.error('[PATCH /api/members/:id]', error);
    return NextResponse.json({ error: 'सदस्य अपडेट नहीं हुआ' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const denied = await guardMember(params.id, viewer);
  if (denied) return denied;

  try {
    await deleteMember(params.id);
    return NextResponse.json({ id: params.id, deleted: true });
  } catch (error) {
    console.error('[DELETE /api/members/:id]', error);
    return NextResponse.json({ error: 'सदस्य हटाया नहीं गया' }, { status: 500 });
  }
}
