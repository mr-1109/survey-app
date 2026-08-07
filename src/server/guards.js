import 'server-only';
import { NextResponse } from 'next/server';
import { forbidden } from './auth';
import {
  houseExists,
  houseInScope,
  houseIdForMember,
  houseIdForInfluencer,
} from './db/houses';

/**
 * Route guards for anything addressed by id.
 *
 * Filtering a list is not access control: /houses/12345 is reachable by typing
 * it, and the member and influencer routes are reachable by id alone. Every one
 * of them has to re-derive the owning house and check it against the session's
 * scope.
 *
 * Each guard returns a NextResponse to send back, or null to continue.
 */

function reject(houseId, viewer) {
  if (!houseExists(houseId)) {
    return NextResponse.json({ error: 'घर नहीं मिला' }, { status: 404 });
  }
  if (!houseInScope(houseId, viewer.scope)) return forbidden();
  return null;
}

export function guardHouse(rawId, viewer) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'अमान्य id' }, { status: 400 });
  }
  return reject(id, viewer);
}

export function guardMember(rawId, viewer) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'अमान्य id' }, { status: 400 });
  }
  const houseId = houseIdForMember(id);
  if (!houseId) return NextResponse.json({ error: 'सदस्य नहीं मिला' }, { status: 404 });
  return reject(houseId, viewer);
}

export function guardInfluencer(rawId, viewer) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'अमान्य id' }, { status: 400 });
  }
  const houseId = houseIdForInfluencer(id);
  if (!houseId) return NextResponse.json({ error: 'व्यक्ति नहीं मिला' }, { status: 404 });
  return reject(houseId, viewer);
}
