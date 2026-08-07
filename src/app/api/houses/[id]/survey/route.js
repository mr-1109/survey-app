import { NextResponse } from 'next/server';
import {
  saveSurvey,
  POLITICAL_PARTY_VALUES,
  DEVELOPMENT_WORK_KEYS,
  CM_SATISFACTION_VALUES,
} from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';
import { guardHouse } from '@server/guards';

export const dynamic = 'force-dynamic';

const MAX_TEXT = 250;

export async function PUT(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const denied = await guardHouse(params.id, viewer);
  if (denied) return denied;
  const houseId = Number(params.id);

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'अमान्य JSON' }, { status: 400 }); }

  if (body.political_party && !POLITICAL_PARTY_VALUES.includes(body.political_party))
    return NextResponse.json({ error: 'अमान्य राजनीतिक झुकाव विकल्प' }, { status: 400 });
  if (body.cm_satisfaction && !CM_SATISFACTION_VALUES.includes(body.cm_satisfaction))
    return NextResponse.json({ error: 'अमान्य संतुष्टि विकल्प' }, { status: 400 });

  const development = Array.isArray(body.development_works) ? body.development_works : [];
  if (development.some((k) => !DEVELOPMENT_WORK_KEYS.includes(k)))
    return NextResponse.json({ error: 'अमान्य विकास कार्य विकल्प' }, { status: 400 });

  for (const field of ['political_party_other', 'development_other', 'colony_workers', 'block_workers', 'remarks']) {
    if (body[field] && String(body[field]).length > MAX_TEXT)
      return NextResponse.json({ error: `${field} 250 अक्षर से अधिक नहीं हो सकता` }, { status: 400 });
  }

  const surveyPatch = {
    political_party:       body.political_party || null,
    political_party_other: String(body.political_party_other ?? '').trim() || null,
    development_works:     development,
    development_other:     String(body.development_other ?? '').trim() || null,
    cm_satisfaction:       body.cm_satisfaction || null,
    colony_workers:        String(body.colony_workers  ?? '').trim() || null,
    block_workers:         String(body.block_workers   ?? '').trim() || null,
    remarks:               String(body.remarks ?? '').trim() || null,
  };

  try {
    const result = await saveSurvey(houseId, surveyPatch, viewer.account.phone);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[PUT /api/houses/:id/survey]', error);
    return NextResponse.json({ error: 'सर्वेक्षण सहेजा नहीं गया' }, { status: 500 });
  }
}
