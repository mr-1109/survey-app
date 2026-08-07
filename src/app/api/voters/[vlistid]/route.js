import { NextResponse } from 'next/server';
import { updateFeedback, isFeedbackValue, getVoterBhag } from '@server/db/voters';
import { isTransient } from '@server/db/pool';
import { apiViewer, unauthorized, forbidden } from '@server/auth';
import { isBhagInScope } from '@server/scope';

export const dynamic = 'force-dynamic';

/** PATCH /api/voters/:vlistid  { "feedback": "bjp" } — the app's only write. */
export async function PATCH(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const vlistid = Number(params.vlistid);
  if (!Number.isInteger(vlistid) || vlistid < 1) {
    return NextResponse.json({ error: 'अमान्य VLISTID' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'अमान्य JSON' }, { status: 400 });
  }

  const feedback = body?.feedback;
  if (!isFeedbackValue(feedback)) {
    return NextResponse.json({ error: 'अमान्य फीडबैक मान' }, { status: 400 });
  }

  try {
    // The voter must sit inside the viewer's scope before anything is written.
    const bhag = await getVoterBhag(vlistid);
    if (bhag === null) {
      return NextResponse.json({ error: 'मतदाता नहीं मिला' }, { status: 404 });
    }
    if (!(await isBhagInScope(viewer.scope, bhag))) return forbidden();

    const updated = await updateFeedback(vlistid, feedback);
    if (!updated) {
      return NextResponse.json({ error: 'मतदाता नहीं मिला' }, { status: 404 });
    }
    return NextResponse.json({ vlistid, feedback });
  } catch (error) {
    console.error('[PATCH /api/voters/:vlistid]', error);
    return isTransient(error)
      ? NextResponse.json({ error: 'डेटाबेस से संपर्क नहीं हो सका' }, { status: 503 })
      : NextResponse.json({ error: 'डेटाबेस त्रुटि' }, { status: 500 });
  }
}
