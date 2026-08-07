import { NextResponse } from 'next/server';
import { getBoothCounts } from '@server/db/voters';
import { isTransient } from '@server/db/pool';
import { apiViewer, unauthorized } from '@server/auth';
import { allowedBhags } from '@server/scope';

export const dynamic = 'force-dynamic';

/** Voters per भाग, biggest first, limited to the viewer's scope. */
export async function GET() {
  const viewer = apiViewer();
  if (!viewer) return unauthorized();

  try {
    const { booths } = await getBoothCounts();
    const allowed = await allowedBhags(viewer.scope);
    const shown = allowed === null ? booths : booths.filter((b) => allowed.has(b.bhag));
    return NextResponse.json({
      booths: shown,
      total: shown.reduce((sum, b) => sum + b.voters, 0),
    });
  } catch (error) {
    console.error('[GET /api/voters/booths]', error);
    return isTransient(error)
      ? NextResponse.json({ error: 'डेटाबेस से संपर्क नहीं हो सका' }, { status: 503 })
      : NextResponse.json({ error: 'डेटाबेस त्रुटि' }, { status: 500 });
  }
}
