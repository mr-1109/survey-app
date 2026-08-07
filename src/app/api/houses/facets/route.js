import { NextResponse } from 'next/server';
import { getWardFacets, getBhagFacets } from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  try {
    const ward = request.nextUrl.searchParams.get('ward') || 'all';
    const [wards, bhags] = await Promise.all([
      getWardFacets(viewer.scope),
      getBhagFacets(ward, viewer.scope),
    ]);
    return NextResponse.json({ wards, bhags });
  } catch (error) {
    console.error('[GET /api/houses/facets]', error);
    return NextResponse.json({ error: 'फ़िल्टर सूची लोड नहीं हुई' }, { status: 500 });
  }
}
