import 'server-only';
import { getLocalDb } from './local';
import { foldDigits } from '@shared/houseNumber';

/** प्रभावशाली व्यक्ति — screens 6/7. Local SQLite only, scoped to a house. */

export function listInfluencers(houseId) {
  return getLocalDb()
    .prepare('SELECT * FROM influential_persons WHERE house_id = ? ORDER BY id')
    .all(houseId);
}

export function getInfluencer(id) {
  return getLocalDb().prepare('SELECT * FROM influential_persons WHERE id = ?').get(id);
}

export function addInfluencer(houseId, data) {
  const db = getLocalDb();
  const info = db
    .prepare(
      `INSERT INTO influential_persons (house_id, name, party, position, mobile, address, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      houseId,
      data.name,
      data.party,
      data.position || null,
      foldDigits(data.mobile) || null,
      data.address || null,
      data.description,
    );
  return getInfluencer(info.lastInsertRowid);
}

const EDITABLE = ['name', 'party', 'position', 'mobile', 'address', 'description'];

export function updateInfluencer(id, patch) {
  const db = getLocalDb();
  const clean = 'mobile' in patch ? { ...patch, mobile: foldDigits(patch.mobile) } : patch;
  const fields = EDITABLE.filter((f) => f in clean);
  if (!fields.length) return getInfluencer(id);

  db.prepare(
    `UPDATE influential_persons SET ${fields.map((f) => `${f} = ?`).join(', ')}, updated_at = datetime('now','localtime')
     WHERE id = ?`,
  ).run(...fields.map((f) => clean[f]), id);

  return getInfluencer(id);
}

export function deleteInfluencer(id) {
  const info = getLocalDb().prepare('DELETE FROM influential_persons WHERE id = ?').run(id);
  return info.changes > 0;
}
