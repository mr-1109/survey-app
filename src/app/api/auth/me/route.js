import { NextResponse } from 'next/server';
import { apiViewer, unauthorized } from '@server/auth';
import { isFullAccess } from '@server/scope';
import { scopeSummary } from '@shared/scope';

export const dynamic = 'force-dynamic';

/** Identity plus the scope the client should render its forms against. */
export async function GET() {
  const viewer = apiViewer();
  if (!viewer) return unauthorized();

  const unrestricted = isFullAccess(viewer.scope);
  return NextResponse.json({
    phone: viewer.account.phone,
    unrestricted,
    scope: unrestricted ? {} : viewer.scope,
    scopeLabel: unrestricted ? 'पूरा क्षेत्र' : scopeSummary(viewer.scope),
  });
}
