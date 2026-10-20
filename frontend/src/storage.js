// Save small things in the browser (localStorage), so they survive a page refresh.
// Only for harmless data like saved jobs or ticked tasks. NEVER for secrets (API keys, passwords):
// any JavaScript on the page can read localStorage.
// try/catch: localStorage can be blocked (e.g. private mode), then we just do not save.

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: the app still works, it just does not remember
  }
}
