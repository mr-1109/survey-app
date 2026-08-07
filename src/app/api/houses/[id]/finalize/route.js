import { NextResponse } from 'next/server';
import { getHouse, finalizeHouse } from '@server/db/houses';
import { buildJsonData, saveRemoteSurvey } from '@server/db/survey-remote';
import { apiViewer, unauthorized } from '@server/auth';
import { guardHouse } from '@server/guards';

export const dynamic = 'force-dynamic';

/** सारांश (screen 13) "सहेजें और आगे बढ़ें" → ड्राफ्ट सहेजा गया (screen 14).
 *  Writes STATUS=2 (Completed) full JSON to MySQL SURVEY_DATA. */
export async function POST(request, { params }) {
  const viewer = apiViewer();
  if (!viewer) return unauthorized();

  const denied = guardHouse(params.id, viewer);
  if (denied) return denied;
  const houseId = Number(params.id);
  const full = getHouse(houseId);

  try {
    // 1. Mark done in local SQLite
    const result = finalizeHouse(houseId);

    // 2. Write complete JSON to MySQL SURVEY_DATA (STATUS=2 Completed)
    if (full.house.area_id && full.house.house_no_raw) {
      const jsonData = buildJsonData({
        house:       full.house,
        members:     full.members,
        survey:      full.survey,
        influencers: full.influencers,
      });
      await saveRemoteSurvey({
        areaId:   full.house.area_id,
        hno:      full.house.house_no_raw,
        jsonData,
        status:   2,
        surveyBy: viewer.account.id,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/houses/:id/finalize]', error);
    return NextResponse.json({ error: 'सहेजा नहीं गया' }, { status: 500 });
  }
}
