import { NextResponse } from 'next/server';
import { addMember } from '@server/db/houses';
import { apiViewer, unauthorized } from '@server/auth';
import { guardHouse } from '@server/guards';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const denied = await guardHouse(params.id, viewer);
  if (denied) return denied;
  const houseId = Number(params.id);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'अमान्य JSON' }, { status: 400 });
  }

  const name = String(body?.name ?? '').trim();
  if (name.length < 2) {
    return NextResponse.json({ error: 'नाम कम से कम 2 अक्षर का हो' }, { status: 400 });
  }

  const age = body?.age === '' || body?.age == null ? null : Number(body.age);
  if (age !== null && (!Number.isInteger(age) || age < 0 || age > 130)) {
    return NextResponse.json({ error: 'आयु 0 से 130 के बीच हो' }, { status: 400 });
  }

  const gender = body?.gender || null;
  if (gender && !['M', 'F', 'O'].includes(gender)) {
    return NextResponse.json({ error: 'अमान्य लिंग' }, { status: 400 });
  }

  const mobile = String(body?.mobile ?? '').replace(/\D/g, '');
  if (mobile && mobile.length !== 10) {
    return NextResponse.json({ error: 'मोबाइल नंबर 10 अंकों का हो' }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await addMember(houseId, {
        name,
        relation:      body?.relation,
        relative_name: body?.relative_name,
        age,
        gender,
        mobile,
        occupation:    body?.occupation,
        voter_category: body?.voter_category,
        education:     body?.education,
        marital_status: body?.marital_status,
        note:          body?.note,
        epic:          body?.epic,
        dependent_on:  body?.dependent_on,
      }),
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/houses/:id/members]', error);
    return NextResponse.json({ error: 'सदस्य जोड़ा नहीं गया' }, { status: 500 });
  }
}
