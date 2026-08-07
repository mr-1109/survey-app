import { NextResponse } from 'next/server';
import { listHouses, getHouseStats, createHouse } from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export async function GET(request) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const params = request.nextUrl.searchParams;
  const ward   = params.get('ward')   || 'all';
  const part   = params.get('part')   || 'all';
  const status = params.get('status') || 'all';
  const q      = (params.get('q') ?? '').trim();
  const limit  = Number(params.get('limit'))  || PAGE_SIZE;
  const offset = Number(params.get('offset')) || 0;

  try {
    const [{ houses, hasMore }, stats] = await Promise.all([
      listHouses({ ward, part, status, q, limit, offset, scope: viewer.scope }),
      getHouseStats(ward, part, viewer.scope),
    ]);
    return NextResponse.json({ houses, hasMore, stats });
  } catch (error) {
    console.error('[GET /api/houses]', error);
    return NextResponse.json({ error: 'घर सूची लोड नहीं हुई' }, { status: 500 });
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

  const house_no  = String(body?.house_no  ?? '').trim();
  const head_name = String(body?.head_name ?? '').trim();
  const area      = String(body?.area      ?? '').trim();
  if (!house_no || !head_name || !area) {
    return NextResponse.json({ error: 'घर संख्या, परिवार प्रमुख और पता आवश्यक हैं' }, { status: 400 });
  }

  const mobile = String(body?.mobile ?? '').replace(/\D/g, '');
  if (mobile && mobile.length !== 10) {
    return NextResponse.json({ error: 'मोबाइल नंबर 10 अंकों का हो' }, { status: 400 });
  }

  const scope = viewer.scope ?? {};

  try {
    const data = await createHouse({
      ward_no:       scope.ward || body?.ward_no || 'manual',
      part_no:       scope.bhag || body?.part_no || '0',
      house_no,
      head_name,
      mobile:        mobile || null,
      area,
      caste:         body?.caste    || null,
      subcaste:      body?.subcaste || null,
      total_members: body?.total_members === '' || body?.total_members == null ? null : Number(body.total_members),
      note:          body?.note     || null,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[POST /api/houses]', error);
    return NextResponse.json({ error: 'घर जोड़ा नहीं गया' }, { status: 500 });
  }
}
