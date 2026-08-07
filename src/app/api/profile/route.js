import { NextResponse } from 'next/server';
import { listUsersCreatedBy, userForPhone } from '@server/db/users';
import { apiViewer, unauthorized } from '@server/auth';
import { isFullAccess } from '@server/scope';
import { scopeSummary } from '@shared/scope';

export const dynamic = 'force-dynamic';

/** The signed-in user's own record, plus everyone they onboarded. */
export async function GET() {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  try {
    const row = await userForPhone(viewer.account.phone);
    const unrestricted = isFullAccess(viewer.scope);

    const scope = row?.scope ?? [];

    const me = {
      name: row?.name ?? 'व्यवस्थापक',
      phone: viewer.account.phone,
      role: row?.role ?? 'admin',
      isSuper: Boolean(viewer.account.isSuper),
      createdAt: row?.created_at ?? null,
      scope,
      scopeLabel: unrestricted ? 'पूरा क्षेत्र' : scopeSummary(scope),
      hasKaryakartaRow: Boolean(row),
    };

    const created = (await listUsersCreatedBy(viewer.account.id)).map((u) => ({
      id: u.id,
      name: u.name,
      mobile: u.mobile,
      role: u.role,
      active: Boolean(u.active),
      createdAt: u.created_at,
      scope: u.scope,
      scopeLabel: scopeSummary(u.scope),
      hasLogin: Boolean(u.mobile),
    }));

    return NextResponse.json({ me, created });
  } catch (error) {
    console.error('[GET /api/profile]', error);
    return NextResponse.json({ error: 'प्रोफ़ाइल लोड नहीं हुई' }, { status: 500 });
  }
}
