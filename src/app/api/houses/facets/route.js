import { NextResponse } from 'next/server';
import { getWardFacets, getBhagFacets } from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const viewer = apiViewer();
  if (!viewer) return unauthorized();

  try {
    const ward = request.nextUrl.searchParams.get('ward') || 'all';
    return NextResponse.json({
      wards: getWardFacets(viewer.scope),
      bhags: getBhagFacets(ward, viewer.scope),
    });
  } catch (error) {
    console.error('[GET /api/houses/facets]', error);
    return NextResponse.json({ error: 'फ़िल्टर सूची लोड नहीं हुई' }, { status: 500 });
  }
}
