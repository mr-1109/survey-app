import { NextResponse } from 'next/server';
import {
  getHouse,
  saveSurvey,
  POLITICAL_PARTY_VALUES,
  DEVELOPMENT_WORK_KEYS,
  CM_SATISFACTION_VALUES,
} from '@server/db/houses';
import { buildJsonData, saveRemoteSurvey } from '@server/db/survey-remote';
import { apiViewer, unauthorized } from '@server/auth';
import { guardHouse } from '@server/guards';

export const dynamic = 'force-dynamic';

const MAX_TEXT = 250;

export async function PUT(request, { params }) {
  const viewer = apiViewer();
  if (!viewer) return unauthorized();

  const denied = guardHouse(params.id, viewer);
  if (denied) return denied;
  const houseId = Number(params.id);
  const full = getHouse(houseId);

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
    colony_workers:        String(body.colony_workers ?? '').trim() || null,
    block_workers:         String(body.block_workers ?? '').trim() || null,
    remarks:               String(body.remarks ?? '').trim() || null,
  };

  try {
    // 1. Save to local SQLite (draft cache)
    const result = saveSurvey(houseId, surveyPatch, viewer.account.id);

    // 2. Write partial JSON to MySQL SURVEY_DATA (STATUS=1 Partial)
    if (full.house.area_id && full.house.house_no_raw) {
      const mergedSurvey = { ...(full.survey ?? {}), ...surveyPatch };
      const jsonData = buildJsonData({
        house:       full.house,
        members:     full.members,
        survey:      mergedSurvey,
        influencers: full.influencers,
      });
      await saveRemoteSurvey({
        areaId:   full.house.area_id,
        hno:      full.house.house_no_raw,
        jsonData,
        status:   1,
        surveyBy: viewer.account.id,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PUT /api/houses/:id/survey]', error);
    return NextResponse.json({ error: 'सर्वेक्षण सहेजा नहीं गया' }, { status: 500 });
  }
}
