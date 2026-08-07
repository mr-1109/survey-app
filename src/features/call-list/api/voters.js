/** Client-side fetch wrappers. The only way client code reaches the database. */

async function toJson(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'सर्वर त्रुटि');
  return body;
}

export async function fetchFacets() {
  return toJson(await fetch('/api/voters/facets'));
}

export async function fetchVoters({ bhag, kshetra, feedback, q, limit }, signal) {
  const params = new URLSearchParams();
  if (bhag) params.set('bhag', String(bhag));
  if (kshetra) params.set('kshetra', kshetra);
  if (feedback) params.set('feedback', feedback);
  if (q) params.set('q', q);
  if (limit) params.set('limit', String(limit));

  return toJson(await fetch(`/api/voters?${params.toString()}`, { signal }));
}

export async function fetchSummary(bhag) {
  const suffix = bhag && bhag !== 'all' ? `?bhag=${bhag}` : '';
  return toJson(await fetch(`/api/voters/summary${suffix}`));
}

export async function patchFeedback(vlistid, feedback) {
  return toJson(
    await fetch(`/api/voters/${vlistid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    }),
  );
}
