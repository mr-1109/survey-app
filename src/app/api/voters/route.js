import { NextResponse } from 'next/server';
import { listVoters, PAGE_SIZE, isFeedbackValue } from '@server/db/voters';
import { isTransient } from '@server/db/pool';
import { apiViewer, unauthorized } from '@server/auth';
import { voterPredicate } from '@server/scope';

export const dynamic = 'force-dynamic';

const MIN_SEARCH_LENGTH = 2;

export async function GET(request) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const params = request.nextUrl.searchParams;

  const bhagRaw = params.get('bhag') ?? 'all';
  const bhag = bhagRaw === 'all' || bhagRaw === '' ? 'all' : Number(bhagRaw);
  if (bhag !== 'all' && (!Number.isInteger(bhag) || bhag < 1)) {
    return NextResponse.json({ error: 'अमान्य भाग' }, { status: 400 });
  }

  const feedback = params.get('feedback') ?? 'all';
  if (feedback !== 'all' && !isFeedbackValue(feedback)) {
    return NextResponse.json({ error: 'अमान्य फीडबैक फ़िल्टर' }, { status: 400 });
  }

  const epic = (params.get('epic') ?? '').trim();
  const q = (params.get('q') ?? '').trim();
  if (q.length > 0 && q.length < MIN_SEARCH_LENGTH) {
    return NextResponse.json(
      { error: 'खोज के लिए कम से कम 2 अक्षर आवश्यक हैं' },
      { status: 400 },
    );
  }
  // A LIKE search without a booth filter scans all 201,002 rows. An exact EPIC
  // match is allowed unscoped — it returns a single row.
  if (q.length >= MIN_SEARCH_LENGTH && bhag === 'all' && !epic) {
    return NextResponse.json({ error: 'खोज से पहले भाग चुनें' }, { status: 400 });
  }

  const limitRaw = params.get('limit');
  const limit = limitRaw === null ? PAGE_SIZE : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1) {
    return NextResponse.json({ error: 'अमान्य limit' }, { status: 400 });
  }

  try {
    const { voters, hasMore } = await listVoters({
      bhag,
      kshetra: params.get('kshetra') || null,
      feedback,
      q,
      epic,
      limit,
      sort: params.get('sort') ?? 'booth',
      scope: voterPredicate(viewer.scope),
    });
    return NextResponse.json({ voters, hasMore, pageSize: PAGE_SIZE });
  } catch (error) {
    console.error('[GET /api/voters]', error);
    return isTransient(error)
      ? NextResponse.json({ error: 'डेटाबेस से संपर्क नहीं हो सका' }, { status: 503 })
      : NextResponse.json({ error: 'डेटाबेस त्रुटि' }, { status: 500 });
  }
}
