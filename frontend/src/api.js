// All calls to the backend live here, so every feature uses the same code.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Turn a failed response into a readable error message
async function handle(res) {
  if (res.ok) return res.json();
  let message = `Server error (${res.status}). Check the backend is running.`;
  try {
    const data = await res.json();
    if (typeof data.detail === "string") message = data.detail; // our HTTPException messages
  } catch {
    // response was not JSON, keep the default message
  }
  throw new Error(message);
}

// Send JSON (used by Mock Interview)
export async function postJson(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle(res);
}

// Send a form with a file (used by CV Reviewer).
// No Content-Type header: the browser sets it for FormData automatically.
export async function postForm(path, formData) {
  const res = await fetch(`${API_URL}${path}`, { method: "POST", body: formData });
  return handle(res);
}
