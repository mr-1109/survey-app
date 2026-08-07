import { NextResponse } from 'next/server';
import { updateInfluencer, deleteInfluencer } from '@server/db/influencers';
import { apiViewer, unauthorized } from '@server/auth';
import { guardInfluencer } from '@server/guards';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const viewer = apiViewer();
  if (!viewer) return unauthorized();

  const denied = guardInfluencer(params.id, viewer);
  if (denied) return denied;
  const id = Number(params.id);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'अमान्य JSON' }, { status: 400 });
  }

  const patch = {};
  if ('name' in body) {
    const v = String(body.name ?? '').trim();
    if (!v) return NextResponse.json({ error: 'नाम आवश्यक है' }, { status: 400 });
    patch.name = v;
  }
  if ('party' in body) {
    const v = String(body.party ?? '').trim();
    if (!v) return NextResponse.json({ error: 'पार्टी आवश्यक है' }, { status: 400 });
    patch.party = v;
  }
  if ('description' in body) {
    const v = String(body.description ?? '').trim();
    if (!v) return NextResponse.json({ error: 'विवरण आवश्यक है' }, { status: 400 });
    if (v.length > 250) return NextResponse.json({ error: 'विवरण 250 अक्षर से अधिक नहीं हो सकता' }, { status: 400 });
    patch.description = v;
  }
  if ('mobile' in body) {
    const mobile = String(body.mobile ?? '').replace(/\D/g, '');
    if (mobile && mobile.length !== 10) {
      return NextResponse.json({ error: 'मोबाइल नंबर 10 अंकों का हो' }, { status: 400 });
    }
    patch.mobile = mobile || null;
  }
  for (const field of ['position', 'address']) {
    if (field in body) patch[field] = String(body[field] ?? '').trim() || null;
  }

  try {
    return NextResponse.json(updateInfluencer(id, patch));
  } catch (error) {
    console.error('[PATCH /api/influencers/:id]', error);
    return NextResponse.json({ error: 'अपडेट नहीं हुआ' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const viewer = apiViewer();
  if (!viewer) return unauthorized();

  const denied = guardInfluencer(params.id, viewer);
  if (denied) return denied;
  const id = Number(params.id);

  try {
    deleteInfluencer(id);
    return NextResponse.json({ id, deleted: true });
  } catch (error) {
    console.error('[DELETE /api/influencers/:id]', error);
    return NextResponse.json({ error: 'हटाया नहीं गया' }, { status: 500 });
  }
}
