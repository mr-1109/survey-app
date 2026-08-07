import { NextResponse } from 'next/server';
import { finalizeHouse } from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';
import { guardHouse } from '@server/guards';

export const dynamic = 'force-dynamic';

/** सारांश (screen 13) "सहेजें और आगे बढ़ें" → marks STATUS=2 in SURVEY_DATA. */
export async function POST(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const denied = await guardHouse(params.id, viewer);
  if (denied) return denied;
  const houseId = Number(params.id);

  try {
    const result = await finalizeHouse(houseId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/houses/:id/finalize]', error);
    return NextResponse.json({ error: 'सहेजा नहीं गया' }, { status: 500 });
  }
}
