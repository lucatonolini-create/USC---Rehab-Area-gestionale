// SERVER-SIDE ONLY — non importare da componenti client
const BASE = "https://u19-player-portal.onrender.com/api/v1";

async function perfFetch(path: string, init?: RequestInit) {
  const key = process.env.CREMONESE_API_KEY;
  if (!key) throw Object.assign(new Error("CREMONESE_API_KEY non configurata"), { status: 503 });
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "x-api-key": key, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Object.assign(new Error(`${res.status}: ${text}`), { status: res.status });
  }
  return res.json();
}

const qs = (p?: Record<string, string>) => p && Object.keys(p).length ? "?" + new URLSearchParams(p) : "";

export const perfGetAthletes   = ()                            => perfFetch("/athletes");
export const perfGetGPS        = (p?: Record<string, string>) => perfFetch(`/gps${qs(p)}`);
export const perfGetRPE        = (p?: Record<string, string>) => perfFetch(`/rpe${qs(p)}`);
export const perfGetWellness   = (p?: Record<string, string>) => perfFetch(`/wellness${qs(p)}`);
export const perfGetTests      = (p?: Record<string, string>) => perfFetch(`/tests${qs(p)}`);
export const perfGetInjuries   = (p?: Record<string, string>) => perfFetch(`/injuries${qs(p)}`);
export const perfPostInjury    = (body: object)               => perfFetch("/injuries", { method: "POST", body: JSON.stringify(body) });
