const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function handle(res) {
  if (!res.ok) {
    let detail = "Request failed";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // response wasn't JSON; fall back to the default message
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  listUsers: () => fetch(`${BASE_URL}/api/users`).then(handle),

  listDocuments: (userId) =>
    fetch(`${BASE_URL}/api/documents?user_id=${userId}`).then(handle),

  getDocument: (docId, userId) =>
    fetch(`${BASE_URL}/api/documents/${docId}?user_id=${userId}`).then(handle),

  createDocument: (userId, title = "Untitled Document") =>
    fetch(`${BASE_URL}/api/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, owner_id: userId }),
    }).then(handle),

  updateDocument: (docId, userId, payload) =>
    fetch(`${BASE_URL}/api/documents/${docId}?user_id=${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  deleteDocument: (docId, userId) =>
    fetch(`${BASE_URL}/api/documents/${docId}?user_id=${userId}`, {
      method: "DELETE",
    }).then(handle),

  shareDocument: (docId, ownerId, targetEmail) =>
    fetch(`${BASE_URL}/api/documents/${docId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_id: ownerId, target_email: targetEmail }),
    }).then(handle),

  uploadDocument: (userId, file) => {
    const form = new FormData();
    form.append("owner_id", userId);
    form.append("file", file);
    return fetch(`${BASE_URL}/api/documents/upload`, {
      method: "POST",
      body: form,
    }).then(handle);
  },
};
