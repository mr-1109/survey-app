import 'server-only';
import { NextResponse } from 'next/server';
import { forbidden } from './auth';
import { houseExists, houseInScope, houseIdForMember, houseIdForInfluencer } from './db/houses';

/**
 * Async route guards for anything addressed by id.
 * All functions return a NextResponse (to send back) or null (to continue).
 */

async function reject(houseId, viewer) {
  if (!(await houseExists(houseId))) {
    return NextResponse.json({ error: 'घर नहीं मिला' }, { status: 404 });
  }
  if (!(await houseInScope(houseId, viewer.scope))) return forbidden();
  return null;
}

export async function guardHouse(rawId, viewer) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'अमान्य id' }, { status: 400 });
  }
  return reject(id, viewer);
}

export async function guardMember(rawId, viewer) {
  // rawId format: "{houseId}:{memberKey}"
  const id    = String(rawId);
  const colon = id.indexOf(':');
  if (colon === -1) return NextResponse.json({ error: 'अमान्य id' }, { status: 400 });
  const houseId = parseInt(id.slice(0, colon));
  if (!houseId || houseId < 1) return NextResponse.json({ error: 'अमान्य id' }, { status: 400 });
  return reject(houseId, viewer);
}

export async function guardInfluencer(rawId, viewer) {
  // rawId format: "{houseId}:I{seq}"
  const id    = String(rawId);
  const colon = id.indexOf(':');
  if (colon === -1) return NextResponse.json({ error: 'अमान्य id' }, { status: 400 });
  const houseId = parseInt(id.slice(0, colon));
  if (!houseId || houseId < 1) return NextResponse.json({ error: 'अमान्य id' }, { status: 400 });
  return reject(houseId, viewer);
}
