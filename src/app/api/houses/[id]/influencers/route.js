import { NextResponse } from 'next/server';
import { listInfluencers, addInfluencer } from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';
import { guardHouse } from '@server/guards';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const denied = await guardHouse(params.id, viewer);
  if (denied) return denied;
  const houseId = Number(params.id);

  try {
    return NextResponse.json({ influencers: await listInfluencers(houseId) });
  } catch (error) {
    console.error('[GET /api/houses/:id/influencers]', error);
    return NextResponse.json({ error: 'सूची लोड नहीं हुई' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const denied = await guardHouse(params.id, viewer);
  if (denied) return denied;
  const houseId = Number(params.id);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'अमान्य JSON' }, { status: 400 });
  }

  const name        = String(body?.name        ?? '').trim();
  const party       = String(body?.party       ?? '').trim();
  const description = String(body?.description ?? '').trim();
  if (!name || !party || !description) {
    return NextResponse.json({ error: 'नाम, पार्टी और विवरण आवश्यक हैं' }, { status: 400 });
  }
  if (description.length > 250) {
    return NextResponse.json({ error: 'विवरण 250 अक्षर से अधिक नहीं हो सकता' }, { status: 400 });
  }

  const mobile = String(body?.mobile ?? '').replace(/\D/g, '');
  if (mobile && mobile.length !== 10) {
    return NextResponse.json({ error: 'मोबाइल नंबर 10 अंकों का हो' }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await addInfluencer(houseId, {
        name,
        party,
        position:    body?.position    || null,
        mobile:      mobile            || null,
        address:     body?.address     || null,
        description,
      }),
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/houses/:id/influencers]', error);
    return NextResponse.json({ error: 'जोड़ा नहीं गया' }, { status: 500 });
  }
}
