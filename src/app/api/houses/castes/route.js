import { NextResponse } from 'next/server';
import { getCasteFacets } from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';

export const dynamic = 'force-dynamic';

/** जाति / उपजाति options for the house edit form, taken from MAINCAST / SUBCAST. */
export async function GET(request) {
  const viewer = apiViewer();
  if (!viewer) return unauthorized();

  try {
    const caste = request.nextUrl.searchParams.get('caste') || '';
    return NextResponse.json(getCasteFacets(caste, viewer.scope));
  } catch (error) {
    console.error('[GET /api/houses/castes]', error);
    return NextResponse.json({ error: 'जाति सूची लोड नहीं हुई' }, { status: 500 });
  }
}
