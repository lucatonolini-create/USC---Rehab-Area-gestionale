"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, Link2, Zap, Heart, FlaskConical, Gauge, RefreshCw, AlertCircle } from "lucide-react";
import { loadAtleti, type Atleta } from "@/lib/store";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PerfAthlete {
  id: string;
  name: string;
  position: string;
  birth_date: string;
  jersey_number: number;
  vmax_kmh: number;
}

interface GPSRow {
  date: string;
  session_type: string;
  athlete_id: string;
  athlete_name: string;
  total_distance_m: number;
  distance_hsr_m: number;
  distance_vhsr_m: number;
  distance_sprint_m: number;
  accelerations: number;
  decelerations: number;
  metabolic_energy: number;
}

interface RPERow {
  date: string;
  athlete_id: string;
  athlete_name: string;
  session: string;
  rpe: number;
  duration_min: number;
  srpe: number;
}

interface WellnessRow {
  date: string;
  athlete_id: string;
  cmj_height_cm: number;
  body_weight_kg: number;
  energy: number;
  fatigue: number;
  sleep_hours: number;
  sleep_quality: number;
}

type Tab = "panoramica" | "gps" | "rpe" | "wellness" | "test" | "collegamento";

const MAPPING_KEY = "perf_athlete_mapping"; // localStorage key: { [rehabId]: perfId }

function getMapping(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(MAPPING_KEY) ?? "{}"); } catch { return {}; }
}
function saveMapping(m: Record<string, string>) {
  localStorage.setItem(MAPPING_KEY, JSON.stringify(m));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtN = (n: number | undefined, dec = 0) =>
  n == null ? "—" : n.toLocaleString("it-IT", { maximumFractionDigits: dec });

const fmtD = (d: string) =>
  d ? new Date(d + "T12:00").toLocaleDateString("it-IT") : "—";

async function fetchPerf(endpoint: string, params?: Record<string, string>) {
  const url = `/api/performance/${endpoint}${params ? "?" + new URLSearchParams(params) : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? `Errore ${res.status}`);
  }
  return res.json();
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 first:rounded-tl-2xl last:rounded-tr-2xl whitespace-nowrap">{children}</th>;
}

function Td({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return <td className={`px-4 py-3 text-gray-700 whitespace-nowrap border-t border-gray-50 ${bold ? "font-semibold text-gray-900" : ""}`}>{children}</td>;
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="py-16 text-center text-gray-400">
      <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}

function ErrBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {msg}
    </div>
  );
}

// ─── Tab: Collegamento ───────────────────────────────────────────────────────

function TabCollegamento({
  rehab,
  perf,
}: {
  rehab: Atleta[];
  perf: PerfAthlete[];
}) {
  const [mapping, setMapping] = useState<Record<string, string>>(getMapping);

  const u17 = rehab.filter((a) => a.categoria === "U17");

  const update = (rehabId: string, perfId: string) => {
    const next = { ...mapping };
    if (perfId) next[rehabId] = perfId;
    else delete next[rehabId];
    setMapping(next);
    saveMapping(next);
  };

  if (perf.length === 0)
    return <EmptyState msg="Nessun atleta trovato nell'app Performance. Verifica la connessione." />;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
        Collega gli atleti U17 della tua app con i giocatori dell'app Performance. Il collegamento abilita la sincronizzazione automatica degli infortuni.
      </div>

      {u17.length === 0 && (
        <EmptyState msg="Nessun atleta U17 presente nella tua app." />
      )}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {u17.map((a, i) => {
          const linked = mapping[a.id];
          const perfAthlete = perf.find((p) => p.id === linked);
          return (
            <div key={a.id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-gray-50" : ""}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{a.nome}</p>
                <p className="text-xs text-gray-400">{a.posizione || "—"}</p>
              </div>
              <Link2 className={`w-4 h-4 shrink-0 ${linked ? "text-green-500" : "text-gray-300"}`} />
              <select
                value={linked ?? ""}
                onChange={(e) => update(a.id, e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E] min-w-[200px]"
              >
                <option value="">— non collegato —</option>
                {perf.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (#{p.jersey_number})
                  </option>
                ))}
              </select>
              {perfAthlete && (
                <span className="text-xs text-green-600 font-medium shrink-0">✓ collegato</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Panoramica ────────────────────────────────────────────────────────

function TabPanoramica({
  perf,
  rehab,
  loading,
}: {
  perf: PerfAthlete[];
  rehab: Atleta[];
  loading: boolean;
}) {
  const mapping = getMapping();
  const reverseMap = Object.fromEntries(Object.entries(mapping).map(([rid, pid]) => [pid, rid]));

  if (loading) return <div className="py-16 text-center text-gray-400 text-sm">Caricamento...</div>;
  if (perf.length === 0) return <EmptyState msg="Nessun dato ricevuto dall'app Performance." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Atleti Performance" value={String(perf.length)} />
        <StatCard label="Collegati" value={String(Object.keys(mapping).length)} sub="di questo gestionale" />
        <StatCard label="Vmax media" value={`${fmtN(perf.reduce((s, a) => s + (a.vmax_kmh ?? 0), 0) / perf.length, 1)} km/h`} />
        <StatCard label="Squadra" value="U17" sub="Cremonese" />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <Th>#</Th>
            <Th>Atleta</Th>
            <Th>Posizione</Th>
            <Th>Nato</Th>
            <Th>Vmax</Th>
            <Th>Stato Rehab</Th>
          </tr>
        </thead>
        <tbody>
          {perf.map((p) => {
            const rehabId = reverseMap[p.id];
            const rehabAtleta = rehab.find((a) => a.id === rehabId);
            return (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <Td>{p.jersey_number ?? "—"}</Td>
                <Td bold>{p.name}</Td>
                <Td>{p.position || "—"}</Td>
                <Td>{fmtD(p.birth_date)}</Td>
                <Td>{p.vmax_kmh ? `${p.vmax_kmh} km/h` : "—"}</Td>
                <Td>
                  {rehabAtleta ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      rehabAtleta.stato === "Disponibile"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {rehabAtleta.stato === "Infortunato"
                        ? `Infort. – ${rehabAtleta.infortunio || "—"}`
                        : "Disponibile"}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">non collegato</span>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </div>
  );
}

// ─── Tab: GPS ───────────────────────────────────────────────────────────────

function TabGPS({ perf }: { perf: PerfAthlete[] }) {
  const [rows, setRows] = useState<GPSRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filtroAtl, setFiltroAtl] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const p: Record<string, string> = {};
      if (filtroAtl) p.athlete_id = filtroAtl;
      if (from) p.from = from;
      if (to) p.to = to;
      const data = await fetchPerf("gps", p);
      setRows(Array.isArray(data) ? data : data.sessions ?? data.data ?? []);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [filtroAtl, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Atleta</label>
          <select value={filtroAtl} onChange={(e) => setFiltroAtl(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
            <option value="">Tutti</option>
            {perf.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Dal</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Al</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
        </div>
        <button onClick={load} className="flex items-center gap-1.5 bg-[#C8102E] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-800">
          <RefreshCw className="w-3.5 h-3.5" /> Aggiorna
        </button>
      </div>

      {err && <ErrBanner msg={err} />}
      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Caricamento GPS...</div> : rows.length === 0 ? <EmptyState msg="Nessuna sessione GPS trovata." /> : (
        <TableWrap>
          <thead><tr>
            <Th>Data</Th><Th>Sessione</Th><Th>Atleta</Th>
            <Th>Dist. tot (m)</Th><Th>HSR (m)</Th><Th>VHSR (m)</Th>
            <Th>Sprint (m)</Th><Th>Acc.</Th><Th>Dec.</Th><Th>MET energy</Th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <Td>{fmtD(r.date)}</Td>
                <Td>{r.session_type || "—"}</Td>
                <Td bold>{r.athlete_name}</Td>
                <Td>{fmtN(r.total_distance_m)}</Td>
                <Td>{fmtN(r.distance_hsr_m)}</Td>
                <Td>{fmtN(r.distance_vhsr_m)}</Td>
                <Td>{fmtN(r.distance_sprint_m)}</Td>
                <Td>{fmtN(r.accelerations)}</Td>
                <Td>{fmtN(r.decelerations)}</Td>
                <Td>{fmtN(r.metabolic_energy, 0)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

// ─── Tab: RPE ───────────────────────────────────────────────────────────────

function TabRPE({ perf }: { perf: PerfAthlete[] }) {
  const [rows, setRows] = useState<RPERow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filtroAtl, setFiltroAtl] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const p: Record<string, string> = {};
      if (filtroAtl) p.athlete_id = filtroAtl;
      const data = await fetchPerf("rpe", p);
      setRows(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [filtroAtl]);

  useEffect(() => { load(); }, [load]);

  const rpeColor = (v: number) => v >= 8 ? "text-red-600 font-bold" : v >= 6 ? "text-orange-500 font-semibold" : "text-green-600";

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Atleta</label>
          <select value={filtroAtl} onChange={(e) => setFiltroAtl(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
            <option value="">Tutti</option>
            {perf.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 bg-[#C8102E] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-800">
          <RefreshCw className="w-3.5 h-3.5" /> Aggiorna
        </button>
      </div>

      {err && <ErrBanner msg={err} />}
      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Caricamento RPE...</div> : rows.length === 0 ? <EmptyState msg="Nessun dato RPE trovato." /> : (
        <TableWrap>
          <thead><tr>
            <Th>Data</Th><Th>Atleta</Th><Th>Sessione</Th>
            <Th>RPE</Th><Th>Durata (min)</Th><Th>sRPE</Th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <Td>{fmtD(r.date)}</Td>
                <Td bold>{r.athlete_name}</Td>
                <Td>{r.session || "—"}</Td>
                <Td><span className={rpeColor(r.rpe)}>{r.rpe ?? "—"}</span></Td>
                <Td>{fmtN(r.duration_min)}</Td>
                <Td>{fmtN(r.srpe)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

// ─── Tab: Wellness ──────────────────────────────────────────────────────────

function TabWellness({ perf }: { perf: PerfAthlete[] }) {
  const [rows, setRows] = useState<WellnessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filtroAtl, setFiltroAtl] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const p: Record<string, string> = {};
      if (filtroAtl) p.athlete_id = filtroAtl;
      const data = await fetchPerf("wellness", p);
      setRows(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [filtroAtl]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Atleta</label>
          <select value={filtroAtl} onChange={(e) => setFiltroAtl(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
            <option value="">Tutti</option>
            {perf.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 bg-[#C8102E] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-800">
          <RefreshCw className="w-3.5 h-3.5" /> Aggiorna
        </button>
      </div>

      {err && <ErrBanner msg={err} />}
      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Caricamento Wellness...</div> : rows.length === 0 ? <EmptyState msg="Nessun dato Wellness trovato." /> : (
        <TableWrap>
          <thead><tr>
            <Th>Data</Th><Th>Atleta</Th><Th>CMJ (cm)</Th><Th>Peso (kg)</Th>
            <Th>Energia</Th><Th>Fatica</Th><Th>Sonno (h)</Th><Th>Qualità sonno</Th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <Td>{fmtD(r.date)}</Td>
                <Td bold>{(perf.find((p) => p.id === r.athlete_id)?.name) ?? r.athlete_id}</Td>
                <Td>{fmtN(r.cmj_height_cm, 1)}</Td>
                <Td>{fmtN(r.body_weight_kg, 1)}</Td>
                <Td>{fmtN(r.energy, 0)}</Td>
                <Td>{fmtN(r.fatigue, 0)}</Td>
                <Td>{fmtN(r.sleep_hours, 1)}</Td>
                <Td>{fmtN(r.sleep_quality, 0)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

// ─── Tab: Test ──────────────────────────────────────────────────────────────

function TabTest({ perf }: { perf: PerfAthlete[] }) {
  const [data, setData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filtroAtl, setFiltroAtl] = useState("");
  const [subtab, setSubtab] = useState<"jump" | "sprint" | "drop_jump" | "ift">("jump");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const p: Record<string, string> = {};
      if (filtroAtl) p.athlete_id = filtroAtl;
      const res = await fetchPerf("tests", p);
      setData({
        jump: Array.isArray(res.jump) ? res.jump : [],
        sprint: Array.isArray(res.sprint) ? res.sprint : [],
        drop_jump: Array.isArray(res.drop_jump) ? res.drop_jump : [],
        ift: Array.isArray(res.ift) ? res.ift : [],
      });
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [filtroAtl]);

  useEffect(() => { load(); }, [load]);

  const subtabs: { key: "jump" | "sprint" | "drop_jump" | "ift"; label: string }[] = [
    { key: "jump", label: "Jump" },
    { key: "sprint", label: "Sprint" },
    { key: "drop_jump", label: "Drop Jump" },
    { key: "ift", label: "IFT" },
  ];

  const rows = data[subtab] ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Atleta</label>
          <select value={filtroAtl} onChange={(e) => setFiltroAtl(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]">
            <option value="">Tutti</option>
            {perf.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 bg-[#C8102E] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-800">
          <RefreshCw className="w-3.5 h-3.5" /> Aggiorna
        </button>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1 w-fit gap-1">
        {subtabs.map((s) => (
          <button key={s.key} onClick={() => setSubtab(s.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${subtab === s.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {err && <ErrBanner msg={err} />}
      {loading ? <div className="py-12 text-center text-gray-400 text-sm">Caricamento Test...</div> : rows.length === 0 ? <EmptyState msg={`Nessun dato ${subtab.toUpperCase()} trovato.`} /> : (
        <TableWrap>
          <thead>
            <tr>
              {Object.keys(rows[0]).map((k) => <Th key={k}>{k}</Th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                {Object.entries(r).map(([k, v]) => (
                  <Td key={k} bold={k === "athlete_name"}>
                    {k.includes("date") ? fmtD(String(v)) : String(v ?? "—")}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "panoramica",   label: "Panoramica",   icon: <Gauge className="w-4 h-4" /> },
  { key: "gps",          label: "GPS",           icon: <Activity className="w-4 h-4" /> },
  { key: "rpe",          label: "RPE",           icon: <Zap className="w-4 h-4" /> },
  { key: "wellness",     label: "Wellness",      icon: <Heart className="w-4 h-4" /> },
  { key: "test",         label: "Test",          icon: <FlaskConical className="w-4 h-4" /> },
  { key: "collegamento", label: "Collegamento",  icon: <Link2 className="w-4 h-4" /> },
];

export default function PerformancePage() {
  const [tab, setTab] = useState<Tab>("panoramica");
  const [perfAthletes, setPerfAthletes] = useState<PerfAthlete[]>([]);
  const [rehabAtleti, setRehabAtleti] = useState<Atleta[]>([]);
  const [loadingPerf, setLoadingPerf] = useState(true);
  const [errPerf, setErrPerf] = useState("");

  useEffect(() => {
    loadAtleti().then(setRehabAtleti);
    fetchPerf("athletes")
      .then((d) => setPerfAthletes(d.athletes ?? d ?? []))
      .catch((e) => setErrPerf(e.message))
      .finally(() => setLoadingPerf(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Area Performance</h1>
          <p className="text-gray-500 mt-1">Dati atletici U17 · integrazione con Cremonese Performance App</p>
        </div>
        {!loadingPerf && !errPerf && (
          <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 px-3 py-1.5 rounded-xl text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            Connesso · {perfAthletes.length} atleti
          </span>
        )}
        {errPerf && (
          <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-700 px-3 py-1.5 rounded-xl text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" /> Errore connessione
          </span>
        )}
      </div>

      {errPerf && <ErrBanner msg={`Impossibile connettersi all'app Performance: ${errPerf}`} />}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key
                ? "bg-[#C8102E] text-white shadow"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "panoramica"   && <TabPanoramica perf={perfAthletes} rehab={rehabAtleti} loading={loadingPerf} />}
      {tab === "gps"          && <TabGPS perf={perfAthletes} />}
      {tab === "rpe"          && <TabRPE perf={perfAthletes} />}
      {tab === "wellness"     && <TabWellness perf={perfAthletes} />}
      {tab === "test"         && <TabTest perf={perfAthletes} />}
      {tab === "collegamento" && <TabCollegamento rehab={rehabAtleti} perf={perfAthletes} />}
    </div>
  );
}
