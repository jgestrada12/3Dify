// Talks to the backend server (backend/server.js). During local development
// that's http://localhost:4000 — change this if you deploy the backend
// somewhere else.
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
console.log("API_BASE is:", API_BASE);

export async function fetchStlFromPhoto(    throw new Error(`${message} (tried: ${API_BASE})`);
) {
  const res = await fetch(`${API_BASE}/api/photo-to-stl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl, targetSizeMm }),
  });

  if (!res.ok) {
    let message = "Failed to generate model from photo";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore — use default message
    }
    throw new Error(message);
  }

  return res.blob();
}

export async function fetchStlBlob(template, measurements) {
  const res = await fetch(`${API_BASE}/api/generate-stl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template, measurements }),
  });

  if (!res.ok) {
    let message = "Failed to generate STL file";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore — use default message
    }
    throw new Error(message);
  }

  return res.blob();
}
