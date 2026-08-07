async function toJson(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'सर्वर त्रुटि');
  return body;
}

export async function fetchDashboardStats(ward, part) {
  const params = new URLSearchParams();
  if (ward) params.set('ward', ward);
  if (part) params.set('part', part);
  return toJson(await fetch(`/api/houses/dashboard?${params.toString()}`));
}

export async function fetchHouses({ ward, part, status, q, limit, offset }) {
  const params = new URLSearchParams();
  if (ward)   params.set('ward', ward);
  if (part)   params.set('part', part);
  if (status) params.set('status', status);
  if (q)      params.set('q', q);
  if (limit)  params.set('limit', String(limit));
  if (offset) params.set('offset', String(offset));
  return toJson(await fetch(`/api/houses?${params.toString()}`));
}

export async function fetchWardFacets(ward) {
  const params = new URLSearchParams();
  if (ward && ward !== 'all') params.set('ward', ward);
  return toJson(await fetch(`/api/houses/facets?${params.toString()}`));
}

export async function fetchCasteFacets(caste) {
  const params = new URLSearchParams();
  if (caste) params.set('caste', caste);
  return toJson(await fetch(`/api/houses/castes?${params.toString()}`));
}

export async function fetchHouse(id) {
  return toJson(await fetch(`/api/houses/${id}`));
}

export async function createHouse(data) {
  return toJson(
    await fetch('/api/houses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  );
}

export async function updateHouse(id, patch) {
  return toJson(
    await fetch(`/api/houses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteHouse(id) {
  return toJson(await fetch(`/api/houses/${id}`, { method: 'DELETE' }));
}

export async function addMember(houseId, member) {
  return toJson(
    await fetch(`/api/houses/${houseId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    }),
  );
}

export async function updateMember(id, patch) {
  return toJson(
    await fetch(`/api/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteMember(id) {
  return toJson(await fetch(`/api/members/${id}`, { method: 'DELETE' }));
}

export async function saveSurvey(houseId, survey) {
  return toJson(
    await fetch(`/api/houses/${houseId}/survey`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(survey),
    }),
  );
}

export async function finalizeHouse(houseId) {
  return toJson(await fetch(`/api/houses/${houseId}/finalize`, { method: 'POST' }));
}

export async function fetchInfluencers(houseId) {
  return toJson(await fetch(`/api/houses/${houseId}/influencers`));
}

export async function addInfluencer(houseId, data) {
  return toJson(
    await fetch(`/api/houses/${houseId}/influencers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  );
}

export async function updateInfluencer(id, patch) {
  return toJson(
    await fetch(`/api/influencers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteInfluencer(id) {
  return toJson(await fetch(`/api/influencers/${id}`, { method: 'DELETE' }));
}

export async function fetchNeighborHouses(id) {
  return toJson(await fetch(`/api/houses/${id}/neighbors`));
}
