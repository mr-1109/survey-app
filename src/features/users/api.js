async function toJson(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'सर्वर त्रुटि');
  return body;
}

export async function fetchUsers() {
  return toJson(await fetch('/api/users'));
}

/** `payload.password` is optional; when present the server creates a login account. */
export async function createUser(payload) {
  return toJson(
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}