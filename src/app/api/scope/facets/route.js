import { NextResponse } from 'next/server';
import { getScopeFacets } from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';
import { LEVEL_KEYS } from '@shared/scope';

export const dynamic = 'force-dynamic';

/**
 * Options for every scope level, narrowed by whatever the caller has already
 * picked. Levels the roll has no values for come back as empty arrays.
 */
export async function GET(request) {
  const viewer = apiViewer();
  if (!viewer) return unauthorized();

  try {
    // Repeated params (?ward=38&ward=40) express a multi-value selection.
    const params = request.nextUrl.searchParams;
    const selected = {};
    for (const key of LEVEL_KEYS) {
      const values = params.getAll(key).filter(Boolean);
      if (values.length) selected[key] = values;
    }
    return NextResponse.json(getScopeFacets(selected, viewer.scope));
  } catch (error) {
    console.error('[GET /api/scope/facets]', error);
    return NextResponse.json({ error: 'क्षेत्र सूची लोड नहीं हुई' }, { status: 500 });
  }
}
