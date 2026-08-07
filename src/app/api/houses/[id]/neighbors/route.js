import { NextResponse } from 'next/server';
import { query } from '@server/db/pool';
import { apiViewer, unauthorized } from '@server/auth';
import { housePredicateMysql } from '@server/scope';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const viewer = await apiViewer();
  if (!viewer) return unauthorized();

  const id = Number(params.id);
  const { sql: scopeSql, params: scopeParams } = housePredicateMysql(viewer.scope, 'sd');

  try {
    const [prevRows] = await query(
      `SELECT sd.ID, sd.HNO FROM SURVEY_DATA sd
       WHERE sd.ID < ? ${scopeSql}
       ORDER BY sd.ID DESC LIMIT 1`,
      [id, ...scopeParams],
    );
    const [nextRows] = await query(
      `SELECT sd.ID, sd.HNO FROM SURVEY_DATA sd
       WHERE sd.ID > ? ${scopeSql}
       ORDER BY sd.ID ASC LIMIT 1`,
      [id, ...scopeParams],
    );

    const prev = prevRows[0] ?? null;
    const next = nextRows[0] ?? null;

    return NextResponse.json({
      prev: prev ? { id: prev.ID, house_no: prev.HNO } : null,
      next: next ? { id: next.ID, house_no: next.HNO } : null,
    });
  } catch (error) {
    console.error('[GET /api/houses/:id/neighbors]', error);
    return NextResponse.json({ prev: null, next: null });
  }
}
