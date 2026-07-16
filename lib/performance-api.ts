// SERVER-SIDE ONLY — non importare da componenti client
const SOURCES: { url: string; envKey: string; label: string }[] = [
  { url: "https://cremonese-app.vercel.app/api/v1",      envKey: "CREMONESE_API_KEY", label: "Performance" },
  { url: "https://u19-player-portal.onrender.com/api/v1", envKey: "U19_API_KEY",       label: "U19 Portal"  },
];

async function perfFetch(baseUrl: string, key: string, path: string, init?: RequestInit) {
  const res = await fetch(`${baseUrl}${path}`, {
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

// Usa la prima sorgente disponibile per le chiamate singole (GPS, RPE, ecc.)
function primaryFetch(path: string, init?: RequestInit) {
  const src = SOURCES[0];
  const key = process.env[src.envKey];
  if (!key) throw Object.assign(new Error(`${src.envKey} non configurata`), { status: 503 });
  return perfFetch(src.url, key, path, init);
}

const qs = (p?: Record<string, string>) => p && Object.keys(p).length ? "?" + new URLSearchParams(p) : "";

// Recupera atleti da tutte le sorgenti configurate e li unisce in un'unica lista
export async function perfGetAthletes() {
  const results = await Promise.allSettled(
    SOURCES.map(async (src) => {
      const key = process.env[src.envKey];
      if (!key) return [];
      const data = await perfFetch(src.url, key, "/athletes");
      const list: any[] = data.athletes ?? data ?? [];
      return list.map((a) => ({ ...a, _source: src.label }));
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

export const perfGetGPS      = (p?: Record<string, string>) => primaryFetch(`/gps${qs(p)}`);
export const perfGetRPE      = (p?: Record<string, string>) => primaryFetch(`/rpe${qs(p)}`);
export const perfGetWellness = (p?: Record<string, string>) => primaryFetch(`/wellness${qs(p)}`);
export const perfGetTests    = (p?: Record<string, string>) => primaryFetch(`/tests${qs(p)}`);
export const perfGetInjuries = (p?: Record<string, string>) => primaryFetch(`/injuries${qs(p)}`);
export const perfPostInjury  = (body: object)               => primaryFetch("/injuries", { method: "POST", body: JSON.stringify(body) });
