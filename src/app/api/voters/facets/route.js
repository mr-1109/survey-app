import { NextResponse } from 'next/server';
import { getFacets } from '@server/db/voters';
import { isTransient } from '@server/db/pool';
import { apiViewer, unauthorized } from '@server/auth';
import { allowedBhags } from '@server/scope';

export const dynamic = 'force-dynamic';

export async function GET() {
  const viewer = apiViewer();
  if (!viewer) return unauthorized();

  try {
    const facets = await getFacets();
    const allowed = await allowedBhags(viewer.scope);
    if (allowed === null) return NextResponse.json(facets);

    // Narrow the dropdowns to the viewer's भाग, then rebuild the zone list and
    // booth→zone map from what survives.
    const bhagList = facets.bhagList.filter((b) => allowed.has(b));
    const bhagKshetra = {};
    for (const b of bhagList) bhagKshetra[b] = facets.bhagKshetra[b];

    return NextResponse.json({
      bhagList,
      kshetraList: [...new Set(bhagList.map((b) => facets.bhagKshetra[b]).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, 'hi'),
      ),
      bhagKshetra,
    });
  } catch (error) {
    console.error('[GET /api/voters/facets]', error);
    return isTransient(error)
      ? NextResponse.json({ error: 'डेटाबेस से संपर्क नहीं हो सका' }, { status: 503 })
      : NextResponse.json({ error: 'डेटाबेस त्रुटि' }, { status: 500 });
  }
}
