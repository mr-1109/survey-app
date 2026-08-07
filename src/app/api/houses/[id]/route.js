import { NextResponse } from 'next/server';
import { getHouse, updateHouse, softDeleteHouse } from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';
import { guardHouse } from '@server/guards';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const denied = await guardHouse(params.id, viewer);
  if (denied) return denied;
  const id = Number(params.id);

  try {
    return NextResponse.json(await getHouse(id));
  } catch (error) {
    console.error('[GET /api/houses/:id]', error);
    return NextResponse.json({ error: 'घर विवरण लोड नहीं हुआ' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const denied = await guardHouse(params.id, viewer);
  if (denied) return denied;
  const id = Number(params.id);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'अमान्य JSON' }, { status: 400 });
  }

  const patch = {};
  if ('house_no'  in body) patch.house_no  = String(body.house_no  ?? '').trim() || null;
  if ('head_name' in body) patch.head_name = String(body.head_name ?? '').trim() || null;
  if ('area'      in body) patch.area      = String(body.area      ?? '').trim() || null;
  if ('caste'     in body) patch.caste     = String(body.caste     ?? '').trim() || null;
  if ('subcaste'  in body) patch.subcaste  = String(body.subcaste  ?? '').trim() || null;
  if ('note'      in body) patch.note      = String(body.note      ?? '').trim() || null;

  if ('mobile' in body) {
    const mobile = String(body.mobile ?? '').replace(/\D/g, '');
    if (mobile && mobile.length !== 10) {
      return NextResponse.json({ error: 'मोबाइल नंबर 10 अंकों का हो' }, { status: 400 });
    }
    patch.mobile = mobile || null;
  }

  if ('total_members' in body) {
    const n = body.total_members === '' || body.total_members === null ? null : Number(body.total_members);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 99)) {
      return NextResponse.json({ error: 'परिवार के सदस्य 0 से 99 के बीच हों' }, { status: 400 });
    }
    patch.total_members = n;
  }

  if ('voter_count' in body) {
    const n = Number(body.voter_count);
    if (!Number.isInteger(n) || n < 0 || n > 99) {
      return NextResponse.json({ error: 'कुल मतदाता 0 से 99 के बीच हो' }, { status: 400 });
    }
    patch.voter_count = n;
  }

  try {
    return NextResponse.json(await updateHouse(id, patch));
  } catch (error) {
    console.error('[PATCH /api/houses/:id]', error);
    return NextResponse.json({ error: 'घर अपडेट नहीं हुआ' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const denied = await guardHouse(params.id, viewer);
  if (denied) return denied;
  const id = Number(params.id);

  try {
    await softDeleteHouse(id);
    return NextResponse.json({ id, deleted: true });
  } catch (error) {
    console.error('[DELETE /api/houses/:id]', error);
    return NextResponse.json({ error: 'घर हटाया नहीं गया' }, { status: 500 });
  }
}
