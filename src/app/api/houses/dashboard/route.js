import { NextResponse } from 'next/server';
import { getDashboardStats } from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';

export const dynamic = 'force-dynamic';

/** Screen 1 — डैशबोर्ड (होम) tiles. */
export async function GET(request) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const ward = request.nextUrl.searchParams.get('ward') || 'all';
  const part = request.nextUrl.searchParams.get('part') || 'all';

  try {
    return NextResponse.json(await getDashboardStats(ward, part, viewer.scope));
  } catch (error) {
    console.error('[GET /api/houses/dashboard]', error);
    return NextResponse.json({ error: 'डैशबोर्ड लोड नहीं हुआ' }, { status: 500 });
  }
}
