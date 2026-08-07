import { NextResponse } from 'next/server';
import { getFeedbackSummary } from '@server/db/voters';
import { isTransient } from '@server/db/pool';
import { apiViewer, unauthorized, forbidden } from '@server/auth';
import { voterPredicate, isBhagInScope } from '@server/scope';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const bhagRaw = request.nextUrl.searchParams.get('bhag') ?? 'all';
  const bhag = bhagRaw === 'all' || bhagRaw === '' ? 'all' : Number(bhagRaw);
  if (bhag !== 'all' && (!Number.isInteger(bhag) || bhag < 1)) {
    return NextResponse.json({ error: 'अमान्य भाग' }, { status: 400 });
  }

  try {
    if (bhag !== 'all' && !(await isBhagInScope(viewer.scope, bhag))) return forbidden();
    return NextResponse.json(await getFeedbackSummary(bhag, voterPredicate(viewer.scope)));
  } catch (error) {
    console.error('[GET /api/voters/summary]', error);
    return isTransient(error)
      ? NextResponse.json({ error: 'डेटाबेस से संपर्क नहीं हो सका' }, { status: 503 })
      : NextResponse.json({ error: 'डेटाबेस त्रुटि' }, { status: 500 });
  }
}
